import {createHash} from 'node:crypto';
import type {Request} from 'express';
import busboy from 'busboy';
import {getAuth,type DecodedIdToken} from 'firebase-admin/auth';
import {getAppCheck} from 'firebase-admin/app-check';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {defineSecret} from 'firebase-functions/params';
import type {AdminSession,Role} from '../../shared/types';

export const MAX_FILES=0;
export const MAX_FILE_SIZE=0;
export const rateLimitSalt=defineSecret('RATE_LIMIT_SALT');
export class ApiError extends Error {constructor(public status:number,message:string){super(message);this.name='ApiError';}}
export const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export const clean=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
export function projectId(){return process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||JSON.parse(process.env.FIREBASE_CONFIG||'{}').projectId||'';}
export function loopbackEndpoint(value:string|undefined){if(!value)return false;try{return ['127.0.0.1','localhost','[::1]'].includes(new URL(value.includes('://')?value:`http://${value}`).hostname);}catch{return false;}}
/** No environment toggle alone can disable production security. All emulators must be local. */
export function isEmulator(){return process.env.FUNCTIONS_EMULATOR==='true'&&projectId().startsWith('demo-')&&['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST'].every(key=>loopbackEndpoint(process.env[key]));}
export function mode():'emulator'|'firebase'{return isEmulator()?'emulator':'firebase';}
export function checkRuntime(){
 if(process.env.FUNCTIONS_EMULATOR==='true'&&!isEmulator())throw new ApiError(503,'הפעלת הדגמה מחייבת פרויקט demo וכל האמולטורים המקומיים.');
 if(!isEmulator()&&(!projectId()||!process.env.APP_ORIGIN))throw new ApiError(503,'טרם הושלמה תצורת הפרויקט.');
}
export function requireOrigin(req:Request){
 const origin=req.get('origin');let parsed:URL;try{parsed=new URL(origin||'');}catch{throw new ApiError(403,'מקור הבקשה אינו מורשה.');}
 if(isEmulator()&&['127.0.0.1','localhost','[::1]'].includes(parsed.hostname))return;
 const allowed=(process.env.APP_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(parsed.protocol!=='https:'||!allowed.includes(parsed.origin))throw new ApiError(403,'מקור הבקשה אינו מורשה.');
}
export async function requireAppCheck(req:Request){
 if(isEmulator())return;
 const token=req.get('X-Firebase-AppCheck');if(!token)throw new ApiError(403,'לא ניתן לאמת את הבקשה. יש לרענן ולנסות שוב.');
 try{await getAppCheck().verifyToken(token);}catch{throw new ApiError(403,'לא ניתן לאמת את הבקשה. יש לרענן ולנסות שוב.');}
}
/** Staff access requires verified email and a Firebase email/password sign-in. */
export function requireAdminIdentity(decoded:Pick<DecodedIdToken,'email_verified'|'firebase'>):'password'{
 if(decoded.email_verified!==true||decoded.firebase?.sign_in_provider!=='password')throw new ApiError(403,'נדרשת התחברות עם סיסמה וכתובת דוא״ל מאומתת.');
 return 'password';
}
export async function requireAdmin(req:Request,role?:Role):Promise<AdminSession>{
 const authorization=req.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))throw new ApiError(401,'נדרשת התחברות למערכת הניהול.');
 let decoded;try{decoded=await getAuth().verifyIdToken(authorization.slice(7),true);}catch{throw new ApiError(401,'פג תוקף ההתחברות. יש להתחבר שוב.');}
 const identity=isEmulator()?'emulator-only':requireAdminIdentity(decoded);
 const membership=await getFirestore().collection('admins').doc(decoded.uid).get();const data=membership.data();
 if(!data||data.active!==true||!['administrator','reviewer'].includes(data.role)||(role&&role!==data.role))throw new ApiError(403,'אין הרשאה לפעולה זו.');
 return {id:decoded.uid,email:decoded.email||'',role:data.role,mode:mode(),aal:identity};
}
export function rateScope(req:Request,reporterEmail?:string){
 if(reporterEmail!==undefined)return `reporter:${reporterEmail.trim().normalize('NFKC').toLowerCase()}`;
 // This is a transport/proxy budget, not an end-user IP limit. The last trusted
 // address may be Firebase Hosting itself; the caller-controlled prefix is ignored.
 const forwarded=req.get('x-forwarded-for')?.split(',').at(-1)?.trim();
 return `transport:${isEmulator()?req.socket.remoteAddress:(forwarded||req.socket.remoteAddress||'unknown')}`;
}
export function rateDocumentId(salt:string,bucket:string,scope:string,window:number){return hash(`${salt}:${bucket}:${scope}:${window}`);}
export async function consumeLimit(req:Request,bucket:string,limit:number,seconds=3600,reporterEmail?:string){
 const salt=isEmulator()?'local-fictional-emulator':rateLimitSalt.value();
 if(!salt||salt.length<24)throw new ApiError(503,'לא הוגדר סוד להגבלת בקשות.');
 const window=Math.floor(Date.now()/1000/seconds);const ref=getFirestore().collection('rateLimits').doc(rateDocumentId(salt,bucket,rateScope(req,reporterEmail),window));
 await getFirestore().runTransaction(async tx=>{const snap=await tx.get(ref);const count=(snap.data()?.count||0)+1;if(count>limit)throw new ApiError(429,'נשלחו בקשות רבות מדי. נסו שוב מאוחר יותר.');tx.set(ref,{count,expiresAt:Timestamp.fromMillis((window+1)*seconds*1000)});});
}
export function jsonBody(req:Request,max=65536):unknown{
 const raw=(req as Request&{rawBody?:Buffer}).rawBody;
 if(raw&&raw.length>max)throw new ApiError(413,'הבקשה גדולה מהמותר.');
 if(!req.is('application/json'))throw new ApiError(415,'נדרשים נתוני JSON.');
 if(!req.body||typeof req.body!=='object')throw new ApiError(400,'תוכן הבקשה אינו תקין.');
 return req.body;
}
export interface ValidFile{filename:string;type:string;bytes:Buffer;size:number}
export async function multipart(req:Request):Promise<{payload:unknown;files:ValidFile[]}>{
 const raw=(req as Request&{rawBody?:Buffer}).rawBody;
 if(!req.is('multipart/form-data'))throw new ApiError(415,'נדרש טופס דיווח תקין.');
 if(!raw||raw.length>MAX_FILES*MAX_FILE_SIZE+131072)throw new ApiError(413,'הבקשה גדולה מהמותר.');
 return new Promise((resolve,reject)=>{
  let payload:string|undefined,problem:Error|undefined;
  const invalid=(message:string,status=400)=>{problem??=new ApiError(status,message);};
  let parser:ReturnType<typeof busboy>;try{parser=busboy({headers:req.headers,defParamCharset:'utf8',limits:{files:MAX_FILES,fields:1,parts:MAX_FILES+2,fileSize:MAX_FILE_SIZE+1,fieldSize:65537,fieldNameSize:100}});}catch{return reject(new ApiError(400,'מבנה הטופס אינו תקין.'));}
  parser.on('field',(name,value,info)=>{if(name!=='payload'||payload!==undefined||info.valueTruncated||Buffer.byteLength(value)>65536)invalid('נתוני הדיווח אינם תקינים.');else payload=value;});
  // Reject file parts even when sent by an old browser tab or a custom client.
  parser.on('file',(_name,stream)=>{invalid('צירוף קבצים אינו זמין במערכת.');stream.resume();});
  parser.on('filesLimit',()=>invalid('צירוף קבצים אינו זמין במערכת.'));
  for(const event of ['fieldsLimit','partsLimit'])parser.on(event,()=>invalid('מספר שדות חורג מהמותר.'));
  parser.on('error',()=>reject(new ApiError(400,'מבנה הטופס אינו תקין.')));
  parser.on('close',()=>{if(problem)return reject(problem);if(!payload)return reject(new ApiError(400,'נתוני הדיווח חסרים.'));try{resolve({payload:JSON.parse(payload),files:[]});}catch{reject(new ApiError(400,'נתוני הדיווח אינם תקינים.'));}});
  // Cloud Functions has already consumed the request stream; its rawBody is authoritative.
  parser.end(raw);
 });
}
export function csvCell(value:unknown){let text=String(value??'');if(/^[\s\u0000-\u001f]*[=+\-@]/.test(text))text=`'${text}`;return `"${text.replace(/"/g,'""')}"`;}
