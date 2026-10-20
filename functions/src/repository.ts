import {randomUUID} from 'node:crypto';
import {getFirestore,FieldPath,type Transaction} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {getAuth} from 'firebase-admin/auth';
import {z} from 'zod';
import {ApiError,clean,hash,csvCell,projectId,type ValidFile} from './security';
import {categories,statuses,categoryLabel,statusLabel,CONSENT_VERSION,QUESTION_SCHEMA_VERSION} from '../../shared/catalog';
import type {ReportInput,ReportRecord,EvidenceRecord,AdminSession,CompanySummary,DashboardStats,CompanyType} from '../../shared/types';
import type {PrivacyRequestInput} from '../../shared/validation';

export const normalizeCompany=(name:string)=>name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('he-IL');
const db=()=>getFirestore();
const bucket=()=>getStorage().bucket(process.env.EVIDENCE_BUCKET||`${projectId()}.firebasestorage.app`);
const companyKey=(name:string,type:string)=>hash(`${normalizeCompany(name)}:${type}`);
const now=()=>new Date().toISOString();
const auditData=(admin:AdminSession,action:string,details:unknown)=>({id:randomUUID(),adminUserId:admin.id,action,details:clean(details),createdAt:now()});
export async function audit(admin:AdminSession,action:string,details:unknown){const data=auditData(admin,action,details);await db().collection('auditLogs').doc(data.id).create(data);}
function transactionAudit(tx:Transaction,admin:AdminSession,action:string,details:unknown){const data=auditData(admin,action,details);tx.create(db().collection('auditLogs').doc(data.id),data);}
async function all(collection:string,transaction?:Transaction):Promise<Record<string,any>[]>{
 const result:Record<string,any>[]=[];let after:string|undefined;
 for(;;){let query=db().collection(collection).orderBy(FieldPath.documentId()).limit(500);if(after)query=query.startAfter(after);const page=transaction?await transaction.get(query):await query.get();result.push(...page.docs.map(doc=>({...doc.data(),id:doc.id})));if(page.size<500)return result;after=page.docs.at(-1)!.id;}
}
type CompanyDoc={id:string;name:string;normalizedName:string;companyType:CompanyType;mergedInto?:string;country?:string};
function canonicalCompany(id:string,companies:Map<string,CompanyDoc>):CompanyDoc|undefined{const visited=new Set<string>();let company=companies.get(id);while(company?.mergedInto){if(visited.has(company.id))throw new ApiError(500,'רשומת חברה אינה תקינה.');visited.add(company.id);company=companies.get(company.mergedInto);}return company;}
async function canonicalInTransaction(tx:Transaction,id:string):Promise<CompanyDoc|undefined>{
 const seen=new Set<string>();for(let i=0;i<30;i++){if(seen.has(id))throw new ApiError(409,'לא ניתן ליצור מעגל באיחוד חברות.');seen.add(id);const doc=await tx.get(db().collection('companies').doc(id));if(!doc.exists)return undefined;const company={...doc.data(),id:doc.id} as CompanyDoc;if(!company.mergedInto)return company;id=company.mergedInto;}throw new ApiError(409,'שרשרת איחוד החברות ארוכה מדי.');
}
export async function allReports():Promise<ReportRecord[]>{
 const [reports,reporters,companies,links,flights,answers,evidence,activities,consents]=await db().runTransaction(async transaction=>Promise.all(['reports','reporters','companies','reportCompanies','flights','reportAnswers','evidence','reportActivities','consents'].map(collection=>all(collection,transaction))),{readOnly:true});
 const map=(rows:Record<string,any>[])=>new Map(rows.map(row=>[row.id,row]));const reporterMap=map(reporters),flightMap=map(flights),answerMap=map(answers),consentMap=map(consents);const companyMap=new Map(companies.map(c=>[c.id,c as CompanyDoc]));
 return reports.map(r=>{
  const reportLinks=links.filter(link=>link.reportId===r.id).sort((a,b)=>a.position-b.position);
  const reportCompanies=reportLinks.map(link=>{const company=canonicalCompany(link.companyId,companyMap);return {name:company?.name||link.originalName,companyType:company?.companyType||link.originalCompanyType,role:link.role};});
  const reporter=reporterMap.get(r.reporterId);if(!reporter)throw new ApiError(500,'רשומת מדווח חסרה.');
  const record:Record<string,any>={...r,companies:reportCompanies,reporter:reporter.values,flight:flightMap.get(r.id)?.values||{},dynamicAnswers:answerMap.get(r.id)?.values||{},consents:consentMap.get(r.id)?.values||{privacy:true,legalContact:false,updates:false},evidence:evidence.filter(e=>e.reportId===r.id).map(({reportId,...e})=>e),activities:activities.filter(a=>a.reportId===r.id).map(({reportId,...a})=>a).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))};
  delete record.reporterId;return record as ReportRecord;
 });
}
export async function getReport(id:string){return (await allReports()).find(report=>report.id===id);}
export function publicAdminRecord(report:ReportRecord):ReportRecord{return {...report,honeypot:undefined,idempotencyKey:'',evidence:report.evidence.map(e=>({...e,storagePath:''}))};}

export async function saveSubmission(input:ReportInput,files:ValidFile[]){
 const inputHash=hash(JSON.stringify({...input,startedAt:0,honeypot:undefined})+files.map(file=>`${file.filename}:${file.type}:${hash(file.bytes)}`).join('|'));
 const submissionRef=db().collection('submissions').doc(input.idempotencyKey);const lock=randomUUID();const reportId=randomUUID();const reference=`AV-${new Date().getUTCFullYear()}-${randomUUID().replace(/-/g,'').slice(0,12).toUpperCase()}`;
 const reservation=await db().runTransaction(async tx=>{
  const existing=(await tx.get(submissionRef)).data();
  if(existing&&existing.inputHash!==inputHash)throw new ApiError(409,'מזהה השליחה כבר שימש לדיווח שונה. יש לרענן את הטופס.');
  if(existing?.state==='complete')return {existing:true,reference:existing.reference as string};
  if(existing?.state==='processing'&&existing.leaseUntil>Date.now())throw new ApiError(409,'הדיווח נמצא בתהליך שמירה. יש להמתין ולנסות שוב באותו טופס.');
  tx.set(submissionRef,{inputHash,state:'processing',lock,reportId,reference,leaseUntil:Date.now()+5*60*1000,createdAt:existing?.createdAt||now(),updatedAt:now()});return {existing:false,reference};
 });
 if(reservation.existing)return reservation;
 const uploaded:EvidenceRecord[]=[];let commitStarted=false;
 try{
  for(const file of files){const id=randomUUID();const extension=({'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/webp':'webp'} as Record<string,string>)[file.type];const storagePath=`evidence/${reportId}/${id}.${extension}`;await bucket().file(storagePath).save(file.bytes,{resumable:false,validation:'crc32c',metadata:{contentType:file.type,cacheControl:'private, no-store',metadata:{reportId,submissionKey:input.idempotencyKey}}});uploaded.push({id,originalFilename:file.filename,fileType:file.type,fileSize:file.size,storagePath,createdAt:now()});}
  commitStarted=true;
  await db().runTransaction(async tx=>{
   const reservationDoc=(await tx.get(submissionRef)).data();if(reservationDoc?.lock!==lock||reservationDoc.state!=='processing')throw new ApiError(409,'השליחה השתנתה. יש לנסות שוב באותו טופס.');
   const companyRows:{id:string;company:ReportInput['companies'][number];create:boolean;key:string}[]=[];
   for(const company of input.companies){const key=companyKey(company.name,company.companyType);const alias=(await tx.get(db().collection('companyAliases').doc(key))).data();const canonical=await canonicalInTransaction(tx,alias?.companyId||key);companyRows.push({id:canonical?.id||key,company,create:!canonical,key});}
   // All reads precede all writes. One transaction makes the report, contacts,
   // consent versions, links and evidence discoverable together.
   const reporterId=randomUUID();const createdAt=now();const {reporter,companies,flight,dynamicAnswers,consents,honeypot,...report}=input;
   tx.create(db().collection('reporters').doc(reporterId),{values:reporter,createdAt});
   tx.create(db().collection('reports').doc(reportId),clean({...report,id:reportId,reporterId,publicReference:reference,status:'new',createdAt,updatedAt:createdAt,relatedReportIds:[]}));
   tx.create(db().collection('flights').doc(reportId),{reportId,values:clean(flight)});
   tx.create(db().collection('reportAnswers').doc(reportId),{reportId,values:clean(dynamicAnswers),questionSchemaVersion:QUESTION_SCHEMA_VERSION});
   tx.create(db().collection('consents').doc(reportId),{reportId,reporterId,values:consents,version:CONSENT_VERSION,recordedAt:createdAt});
   const newCompanies=new Set<string>();for(const [position,row] of companyRows.entries()){
    if(row.create&&!newCompanies.has(row.id)){tx.set(db().collection('companies').doc(row.id),{name:row.company.name,normalizedName:normalizeCompany(row.company.name),companyType:row.company.companyType,createdAt});newCompanies.add(row.id);}
    tx.set(db().collection('companyAliases').doc(row.key),{companyId:row.id,normalizedName:normalizeCompany(row.company.name),companyType:row.company.companyType});
    tx.create(db().collection('reportCompanies').doc(`${reportId}-${position}`),{reportId,companyId:row.id,position,originalName:row.company.name,originalCompanyType:row.company.companyType});
   }
   for(const evidence of uploaded)tx.create(db().collection('evidence').doc(evidence.id),{...evidence,reportId});
   tx.update(submissionRef,{state:'complete',reference,reportId,updatedAt:createdAt,leaseUntil:0});
  });
  return {existing:false,reference};
 }catch(error){
  // A network failure can hide an already-committed transaction. Preserve files
  // in that case; a retry with the same key recovers the committed reference.
  if(!commitStarted||error instanceof ApiError){
   await Promise.all(uploaded.map(e=>bucket().file(e.storagePath).delete({ignoreNotFound:true}).catch(()=>{})));
   await db().runTransaction(async tx=>{const current=(await tx.get(submissionRef)).data();if(current?.lock===lock&&current.state!=='complete')tx.update(submissionRef,{state:'failed',leaseUntil:0,updatedAt:now()});}).catch(()=>{});
  }else console.error('Submission acknowledgement uncertain. Reconcile private staged objects by submissionKey before cleanup.');
  throw error;
 }
}

const israelDayFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'});
export const israelDate=(iso:string)=>israelDayFormat.format(new Date(iso));
export const filterSchema=z.object({q:z.string().trim().max(200).optional(),company:z.string().max(200).optional(),category:z.enum(categories.map(c=>c.id) as [ReportInput['primaryCategory'],...ReportInput['primaryCategory'][]]).optional(),status:z.enum(statuses.map(s=>s.id) as [ReportRecord['status'],...ReportRecord['status'][]]).optional(),from:z.iso.date().optional(),to:z.iso.date().optional(),flight:z.string().max(30).optional(),minLoss:z.coerce.number().finite().min(0).max(100000000).optional(),sort:z.enum(['newest','oldest','loss_desc']).default('newest'),page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20)}).strict();
export type ReportFilters=z.infer<typeof filterSchema>;
export function filtersFromQuery(query:Record<string,unknown>){return filterSchema.parse(Object.fromEntries(Object.entries(query).filter(([key,value])=>key!=='type'&&value!=='')));}
export function filterReports(reports:ReportRecord[],filters:ReportFilters,companies:CompanySummary[]=[]){
 const companyName=companies.find(c=>c.id===filters.company)?.name||filters.company;const q=filters.q?.normalize('NFKC').toLocaleLowerCase('he-IL');
 return reports.filter(r=>{
  if(companyName&&!r.companies.some(c=>normalizeCompany(c.name).includes(normalizeCompany(companyName))))return false;
  if(filters.category&&r.primaryCategory!==filters.category&&!r.secondaryCategories.includes(filters.category))return false;
  if(filters.status&&r.status!==filters.status)return false;
  if(filters.from&&israelDate(r.createdAt)<filters.from)return false;if(filters.to&&israelDate(r.createdAt)>filters.to)return false;
  if(filters.flight&&!r.flight.flightNumber?.toLowerCase().includes(filters.flight.toLowerCase()))return false;
  if(filters.minLoss!==undefined&&(r.additionalClaimedLoss||0)<filters.minLoss)return false;
  if(q&&!([r.publicReference,r.description,r.expectedService,r.actualOutcome,r.companyResponse,r.reporter.fullName,r.reporter.email,r.reporter.phone,r.bookingReference,r.flight.flightNumber,...r.companies.map(c=>c.name)].join(' ').normalize('NFKC').toLocaleLowerCase('he-IL').includes(q)))return false;
  return true;
 }).sort((a,b)=>filters.sort==='loss_desc'?(b.additionalClaimedLoss||0)-(a.additionalClaimedLoss||0):filters.sort==='oldest'?a.createdAt.localeCompare(b.createdAt):b.createdAt.localeCompare(a.createdAt));
}
export async function companies(reports?:ReportRecord[]):Promise<CompanySummary[]>{
 const [companyRows,reportLinks,allRecords]=await Promise.all([all('companies'),all('reportCompanies'),reports?Promise.resolve(reports):allReports()]);const companyMap=new Map(companyRows.map(c=>[c.id,c as CompanyDoc]));
 return companyRows.filter(c=>!c.mergedInto).map(c=>{const ids=new Set(reportLinks.filter(link=>canonicalCompany(link.companyId,companyMap)?.id===c.id).map(link=>link.reportId));const linked=allRecords.filter(r=>ids.has(r.id));return {id:c.id,name:c.name,normalizedName:c.normalizedName,companyType:c.companyType,country:c.country,reportCount:linked.length,byCategory:categories.map(cat=>({category:cat.id,count:linked.filter(r=>r.primaryCategory===cat.id).length})).filter(item=>item.count>0)};}).sort((a,b)=>a.name.localeCompare(b.name,'he'));
}
export async function stats():Promise<DashboardStats>{const reports=await allReports();const cs=await companies(reports);return {total:reports.length,newReports:reports.filter(r=>r.status==='new').length,inReview:reports.filter(r=>['reviewing','missing_info','legal_review','in_progress'].includes(r.status)).length,companyCount:cs.length,byCategory:categories.map(c=>({category:c.id,count:reports.filter(r=>r.primaryCategory===c.id).length})),byCompany:cs.map(c=>({name:c.name,count:c.reportCount})).sort((a,b)=>b.count-a.count),monthly:[...new Set(reports.map(r=>israelDate(r.createdAt).slice(0,7)))].sort().map(month=>({month,count:reports.filter(r=>israelDate(r.createdAt).startsWith(month)).length}))};}

export const patchSchema=z.object({status:z.enum(statuses.map(s=>s.id) as [ReportRecord['status'],...ReportRecord['status'][]]).optional(),note:z.string().trim().min(1).max(4000).optional(),duplicateOf:z.union([z.string().uuid(),z.null(),z.literal('')]).optional(),relatedReportIds:z.array(z.string().uuid()).max(50).optional()}).strict().refine(value=>Object.keys(value).length>0,'יש לבחור פעולה לעדכון');
export async function patchReport(id:string,patch:z.infer<typeof patchSchema>,admin:AdminSession){
 await db().runTransaction(async tx=>{
  const ref=db().collection('reports').doc(id);const existing=await tx.get(ref);if(!existing.exists)throw new ApiError(404,'הדיווח לא נמצא.');
  for(const related of [...patch.relatedReportIds??[],...patch.duplicateOf?[patch.duplicateOf]:[]]){if(related===id||!(await tx.get(db().collection('reports').doc(related))).exists)throw new ApiError(400,'שיוך הדיווחים אינו תקין.');}
  if(patch.duplicateOf){let next:string|undefined=patch.duplicateOf;const seen=new Set([id]);while(next){if(seen.has(next))throw new ApiError(400,'לא ניתן ליצור מעגל בשיוך כפילויות.');seen.add(next);if(seen.size>100)throw new ApiError(400,'שרשרת הכפילויות ארוכה מדי.');next=(await tx.get(db().collection('reports').doc(next))).data()?.duplicateOf;}}
  const updatedAt=now();const updates:Record<string,unknown>={updatedAt};if(patch.status)updates.status=patch.status;if(patch.duplicateOf!==undefined)updates.duplicateOf=patch.duplicateOf||null;if(patch.relatedReportIds)updates.relatedReportIds=[...new Set(patch.relatedReportIds)];tx.update(ref,updates);
  const activity={id:randomUUID(),reportId:id,adminUserId:admin.id,activityType:patch.note?'note':'update',note:patch.note||`עדכון דיווח${patch.status?`: ${patch.status}`:''}`,createdAt:updatedAt};tx.create(db().collection('reportActivities').doc(activity.id),activity);transactionAudit(tx,admin,'report.update',{id,status:patch.status,duplicateOf:patch.duplicateOf,relatedReportIds:patch.relatedReportIds,hasNote:!!patch.note});
 });return (await getReport(id))!;
}
export async function readEvidence(id:string,admin:AdminSession){const doc=await db().collection('evidence').doc(id).get();if(!doc.exists)throw new ApiError(404,'המסמך לא נמצא.');const evidence={...doc.data(),id} as EvidenceRecord;if(!/^evidence\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(pdf|png|jpg|webp)$/.test(evidence.storagePath))throw new ApiError(403,'נתיב המסמך אינו מורשה.');const [bytes]=await bucket().file(evidence.storagePath).download();await audit(admin,'evidence.download',{evidenceId:id});return {evidence,bytes};}

const companyIdSchema=z.string().regex(/^[a-zA-Z0-9-]{1,128}$/);
export const companySchema=z.discriminatedUnion('action',[z.object({action:z.literal('update'),id:companyIdSchema,name:z.string().trim().min(2).max(200),companyType:z.enum(['airline','agency','hotel','booking_site','package_operator','other'])}).strict(),z.object({action:z.literal('merge'),sourceId:companyIdSchema,targetId:companyIdSchema}).strict()]);
export async function updateCompany(input:z.infer<typeof companySchema>,admin:AdminSession){await db().runTransaction(async tx=>{
 if(input.action==='update'){
  const company=await canonicalInTransaction(tx,input.id);if(!company||company.id!==input.id)throw new ApiError(404,'החברה אינה קיימת או כבר אוחדה.');const key=companyKey(input.name,input.companyType);const alias=(await tx.get(db().collection('companyAliases').doc(key))).data();const duplicate=await canonicalInTransaction(tx,alias?.companyId||key);if(duplicate&&duplicate.id!==company.id)throw new ApiError(409,'קיימת חברה באותו שם וסוג. ניתן לאחד רשומות.');tx.update(db().collection('companies').doc(company.id),{name:input.name,normalizedName:normalizeCompany(input.name),companyType:input.companyType,updatedAt:now()});tx.set(db().collection('companyAliases').doc(key),{companyId:company.id,normalizedName:normalizeCompany(input.name),companyType:input.companyType});
 }else{
  const source=await canonicalInTransaction(tx,input.sourceId);const target=await canonicalInTransaction(tx,input.targetId);if(!source||!target||source.id===target.id||source.id!==input.sourceId||target.id!==input.targetId)throw new ApiError(400,'יש לבחור שתי חברות שונות ופעילות.');
  // Preserve source records, original report names and roles. Canonical resolution
  // takes effect atomically without a partial fan-out across historical reports.
  tx.update(db().collection('companies').doc(source.id),{mergedInto:target.id,mergedAt:now(),mergedBy:admin.id});
 }transactionAudit(tx,admin,`company.${input.action}`,input);
});}

export function findPatterns(reports:ReportRecord[]){const groups=new Map<string,{key:string;label:string;description:string;count:number;reportIds:string[]}>();const add=(key:string,label:string,description:string,report:ReportRecord)=>{const group=groups.get(key)||{key,label,description,count:0,reportIds:[]};if(!group.reportIds.includes(report.id)){group.reportIds.push(report.id);group.count++;}groups.set(key,group);};for(const report of reports){for(const company of report.companies){const name=normalizeCompany(company.name);add(`company-category:${name}:${report.primaryCategory}`,`${company.name} · ${categoryLabel(report.primaryCategory)}`,'דיווחים על אותו ספק ובאותו סוג אירוע. ההתאמה אינה קביעה שהתרחשה הפרה.',report);if(report.extraChargeAmount)add(`charge:${name}:${report.currency}:${report.extraChargeAmount}`,`${company.name} · חיוב ${report.extraChargeAmount} ${report.currency}`,'סכומי חיוב זהים שנטענו ביחס לאותו ספק.',report);if(report.primaryCategory==='refund')add(`refund:${name}:${report.incidentDate.slice(0,7)}`,`${company.name} · החזרים · ${report.incidentDate.slice(0,7)}`,'דיווחי החזר אצל אותו ספק באותו חודש.',report);}if(report.flight.flightNumber)add(`flight:${report.flight.flightNumber.toUpperCase()}:${report.incidentDate}`,`${report.flight.flightNumber} · ${report.incidentDate}`,'אותו מספר טיסה ואותו תאריך. נדרש אימות אנושי לפני הסקת מסקנות.',report);}return [...groups.values()].filter(g=>g.count>=2).sort((a,b)=>b.count-a.count);}
export function exportCsv(reports:ReportRecord[],type:'personal'|'statistical'){
 let rows:unknown[][];if(type==='personal')rows=[['מספר דיווח','תאריך דיווח','שם מדווח','דוא״ל','טלפון','חברות','סוג אירוע','סטטוס','תאריך אירוע','תיאור','סכום עסקה ששולם','חיוב נוסף ששולם','החזר מבוקש','החזר שהתקבל','נזק נוסף נטען','מטבע'],...reports.map(r=>[r.publicReference,r.createdAt,r.reporter.fullName,r.reporter.email,r.reporter.phone,r.companies.map(c=>c.name).join(' | '),categoryLabel(r.primaryCategory),statusLabel(r.status),r.incidentDate,r.description,r.purchaseAmount,r.extraChargeAmount,r.requestedRefundAmount,r.receivedRefundAmount,r.additionalClaimedLoss,r.currency])];else{const groups=new Map<string,{month:string;category:string;status:string;currency:string;count:number;loss:number;paid:number}>();for(const r of reports){const month=israelDate(r.createdAt).slice(0,7);const key=[month,r.primaryCategory,r.status,r.currency].join('|');const g=groups.get(key)||{month,category:r.primaryCategory,status:r.status,currency:r.currency,count:0,loss:0,paid:0};g.count++;g.loss+=r.additionalClaimedLoss||0;g.paid+=r.purchaseAmount||0;groups.set(key,g);}rows=[['חודש דיווח','סוג אירוע','סטטוס','מטבע','מספר דיווחים','סכום עסקאות ששולמו','סכום נזק נוסף נטען'],...[...groups.values()].map(g=>[g.month,categoryLabel(g.category),statusLabel(g.status),g.currency,g.count,g.paid,g.loss])];}return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

export async function createPrivacyRequest(input:PrivacyRequestInput){const id=randomUUID();const {honeypot,...data}=input;await db().collection('privacyRequests').doc(id).create({...data,consentVersion:CONSENT_VERSION,status:'received',note:'',createdAt:now(),updatedAt:now()});return id;}
export async function privacyRequests(){return (await all('privacyRequests')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function updatePrivacyRequest(id:string,status:string,note:string,admin:AdminSession){await db().runTransaction(async tx=>{const ref=db().collection('privacyRequests').doc(id);if(!(await tx.get(ref)).exists)throw new ApiError(404,'הבקשה לא נמצאה.');tx.update(ref,{status,note,updatedAt:now()});transactionAudit(tx,admin,'privacy_request.update',{id,status});});}
export async function users(){return (await all('admins')).map(user=>({id:user.id,authUserId:user.id,email:user.email||'',role:user.role,active:user.active,createdAt:user.createdAt}));}
export async function provisionUser(authUserId:string,role:'administrator'|'reviewer',active:boolean,admin:AdminSession){
 let user;try{user=await getAuth().getUser(authUserId);}catch{throw new ApiError(404,'לא קיים משתמש Firebase Authentication עם מזהה זה.');}
 await db().runTransaction(async tx=>{
  // All role mutations serialize through a shared guard, including simultaneous
  // demotions of two administrators; the last active administrator is protected.
  const guard=db().collection('system').doc('adminMembership');await tx.get(guard);const administrators=await tx.get(db().collection('admins').where('role','==','administrator'));const current=await tx.get(db().collection('admins').doc(authUserId));const currentData=current.data();
  if(currentData?.role==='administrator'&&currentData.active===true&&(role!=='administrator'||!active)&&administrators.docs.filter(d=>d.data().active===true).length<=1)throw new ApiError(409,'לא ניתן להסיר או להוריד הרשאה ממנהל המערכת הפעיל האחרון.');
  tx.set(db().collection('admins').doc(authUserId),{role,active,email:user.email||'',createdAt:currentData?.createdAt||now(),updatedAt:now()});tx.set(guard,{updatedAt:now(),version:randomUUID()});transactionAudit(tx,admin,'admin.provision',{authUserId,role,active});
 });
}
