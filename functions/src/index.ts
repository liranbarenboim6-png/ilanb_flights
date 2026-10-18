import {initializeApp,getApps} from 'firebase-admin/app';
import {onRequest} from 'firebase-functions/v2/https';
import express,{type Request,type Response,type NextFunction} from 'express';
import {z} from 'zod';
import {reportSchema,privacyRequestSchema} from '../../shared/validation';
import {ApiError,checkRuntime,isEmulator,mode,projectId,MAX_FILES,MAX_FILE_SIZE,requireAdmin,requireOrigin,requireAppCheck,consumeLimit,multipart,jsonBody,rateLimitSalt} from './security';
import * as repo from './repository';

if(!getApps().length)initializeApp({projectId:projectId()||undefined,storageBucket:process.env.EVIDENCE_BUCKET||`${projectId()}.firebasestorage.app`});
const app=express();app.disable('x-powered-by');app.set('trust proxy',false);
app.use((_req,res,next)=>{res.set({'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});next();});
app.use(express.json({limit:'64kb',strict:true}));
const wrap=(action:(req:Request,res:Response)=>Promise<unknown>|unknown)=>(req:Request,res:Response,next:NextFunction)=>{Promise.resolve().then(()=>action(req,res)).then(value=>{if(!res.headersSent)res.json(value??{ok:true});}).catch(next);};
app.use((req,_res,next)=>{Promise.resolve().then(async()=>{checkRuntime();if(['POST','PATCH','PUT','DELETE'].includes(req.method)){requireOrigin(req);await requireAppCheck(req);}}).then(()=>next()).catch(next);});

app.get('/api/config',wrap(()=>({mode:mode(),projectId:projectId(),maxFiles:MAX_FILES,maxFileSize:MAX_FILE_SIZE,emailConfigured:false,demoLoginAllowed:isEmulator()})));
app.get('/api/admin/session',wrap(async(req)=>{if(!req.get('authorization'))return {session:null,mode:mode()};return {session:await requireAdmin(req),mode:mode()};}));
app.post('/api/reports',wrap(async(req,res)=>{
 await consumeLimit(req,'report:transport',600);const {payload,files}=await multipart(req);const input=reportSchema.parse(payload);
 const age=Date.now()-input.startedAt;if(input.honeypot||age<1800||age>7*24*60*60*1000)throw new ApiError(400,'לא ניתן לשלוח כעת. יש לרענן את הטופס ולנסות שוב.');
 await consumeLimit(req,'report:identity',15,3600,input.reporter.email);
 const saved=await repo.saveSubmission(input,files);res.status(saved.existing?200:201);return {reference:saved.reference,mode:mode(),emailSent:false};
}));
app.post('/api/privacy-requests',wrap(async(req,res)=>{await consumeLimit(req,'privacy:transport',300);const input=privacyRequestSchema.parse(jsonBody(req,16384));if(input.honeypot)throw new ApiError(400,'לא ניתן לקבל את הבקשה.');await consumeLimit(req,'privacy:identity',5,3600,input.email);const reference=await repo.createPrivacyRequest(input);res.status(201);return {reference,mode:mode()};}));
app.get('/api/admin/stats',wrap(async req=>{await requireAdmin(req);return repo.stats();}));
app.get('/api/admin/reports',wrap(async req=>{const admin=await requireAdmin(req);const filters=repo.filtersFromQuery(req.query);const records=await repo.allReports();const reports=repo.filterReports(records,filters,await repo.companies(records));const start=(filters.page-1)*filters.pageSize;await repo.audit(admin,'reports.list',{total:reports.length,page:filters.page,filterKeys:Object.keys(req.query)});return {reports:reports.slice(start,start+filters.pageSize).map(repo.publicAdminRecord),total:reports.length,page:filters.page,pageSize:filters.pageSize};}));
app.get('/api/admin/reports/:id',wrap(async req=>{const admin=await requireAdmin(req);const id=z.string().uuid().parse(req.params.id);const report=await repo.getReport(id);if(!report)throw new ApiError(404,'הדיווח לא נמצא.');await repo.audit(admin,'report.view',{reportId:id});return {report:repo.publicAdminRecord(report)};}));
app.patch('/api/admin/reports/:id',wrap(async req=>{const admin=await requireAdmin(req);const id=z.string().uuid().parse(req.params.id);const patch=repo.patchSchema.parse(jsonBody(req));return {report:repo.publicAdminRecord(await repo.patchReport(id,patch,admin))};}));
app.get('/api/admin/evidence/:id',wrap(async(req,res)=>{const admin=await requireAdmin(req);const id=z.string().uuid().parse(req.params.id);const {evidence,bytes}=await repo.readEvidence(id,admin);res.set({'Content-Type':evidence.fileType,'Content-Length':String(bytes.length),'Content-Disposition':`attachment; filename="evidence.${evidence.fileType.split('/')[1]}"; filename*=UTF-8''${encodeURIComponent(evidence.originalFilename)}`,'Content-Security-Policy':"default-src 'none'; sandbox"});res.send(bytes);}));
app.get('/api/admin/companies',wrap(async req=>{await requireAdmin(req);return {companies:await repo.companies()};}));
app.patch('/api/admin/companies',wrap(async req=>{const admin=await requireAdmin(req,'administrator');await repo.updateCompany(repo.companySchema.parse(jsonBody(req)),admin);return {companies:await repo.companies()};}));
app.get('/api/admin/patterns',wrap(async req=>{await requireAdmin(req);return {groups:repo.findPatterns(await repo.allReports())};}));
app.get('/api/admin/export',wrap(async(req,res)=>{const type=z.enum(['statistical','personal']).parse(req.query.type||'statistical');const admin=await requireAdmin(req,type==='personal'?'administrator':undefined);const filters=repo.filtersFromQuery(req.query);const records=await repo.allReports();const reports=repo.filterReports(records,filters,await repo.companies(records));await repo.audit(admin,`export.${type}`,{count:reports.length,filterKeys:Object.keys(req.query)});res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="aviation-${type}-${new Date().toISOString().slice(0,10)}.csv"`});res.send(repo.exportCsv(reports,type));}));
app.get('/api/admin/users',wrap(async req=>{await requireAdmin(req,'administrator');return {users:await repo.users()};}));
app.post('/api/admin/users',wrap(async req=>{const admin=await requireAdmin(req,'administrator');const input=z.object({authUserId:z.string().min(1).max(128).refine(value=>!/[\/\x00-\x1f]/.test(value),'מזהה המשתמש אינו תקין'),role:z.enum(['administrator','reviewer']),active:z.boolean().default(true)}).strict().parse(jsonBody(req));await repo.provisionUser(input.authUserId,input.role,input.active,admin);return {ok:true};}));
app.get('/api/admin/privacy-requests',wrap(async req=>{await requireAdmin(req,'administrator');return {requests:await repo.privacyRequests()};}));
app.patch('/api/admin/privacy-requests',wrap(async req=>{const admin=await requireAdmin(req,'administrator');const input=z.object({id:z.string().uuid(),status:z.enum(['received','verifying','in_progress','completed','rejected']),note:z.string().trim().max(4000)}).strict().parse(jsonBody(req));await repo.updatePrivacyRequest(input.id,input.status,input.note,admin);return {ok:true};}));
app.use((_req,res)=>res.status(404).json({error:'הפעולה המבוקשת לא נמצאה.'}));
app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
 if(error instanceof z.ZodError){const fieldErrors:Record<string,string[]>={};for(const issue of error.issues)(fieldErrors[issue.path.join('.')]??=[]).push(issue.message);res.status(400).json({error:'יש לתקן את השדות המסומנים ולנסות שוב.',fieldErrors});return;}
 if(error instanceof ApiError){res.status(error.status).json({error:error.message});return;}
 if(error&&typeof error==='object'&&'type' in error&&error.type==='entity.too.large'){res.status(413).json({error:'הבקשה גדולה מהמותר.'});return;}
 if(error&&typeof error==='object'&&'type' in error&&error.type==='entity.parse.failed'){res.status(400).json({error:'תוכן הבקשה אינו תקין.'});return;}
 // Never log request bodies, identity tokens, contact information or file names.
 console.error('API operation failed',error instanceof Error?error.name:'UnknownError');res.status(500).json({error:'אירעה שגיאה. נסו שוב מאוחר יותר.'});
});
export const api=onRequest({region:'europe-west1',memory:'1GiB',timeoutSeconds:120,maxInstances:10,concurrency:4,invoker:'public',cors:false,secrets:[rateLimitSalt]},app);
