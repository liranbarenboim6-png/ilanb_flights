import {z} from 'zod';
import {reportCategories, companyTypes, dynamicQuestions} from './catalog';
import type {Category, ReportInput} from './types';

const category = z.enum(reportCategories.map(c=>c.id) as [Category,...Category[]]);
const optionalText=(max=2000)=>z.string().trim().max(max).optional();
export const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
const optionalDate=z.string().refine(v=>!v||validDate(v),'יש להזין תאריך תקין').optional();
const dateTime=z.string().refine(v=>!v||(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)&&validDate(v.slice(0,10))&&!Number.isNaN(Date.parse(v))),'יש להזין מועד תקין').optional();
const amount=z.number().finite().min(0).max(100000000).refine(value=>Math.abs(value*100-Math.round(value*100))<0.00001,'יש להזין סכום עם עד שתי ספרות אחרי הנקודה').optional();

export function validateDynamicAnswers(primary:Category, secondary:Category[], answers:Record<string,unknown>):Record<string,string[]> {
  const questions=new Map([primary,...secondary].flatMap(c=>dynamicQuestions[c]??[]).map(q=>[q.key,q]));
  const errors:Record<string,string[]>={};
  for(const [key,value] of Object.entries(answers)){
    const q=questions.get(key); let valid=!!q;
    if(q){
      if(q.type==='boolean') valid=typeof value==='boolean';
      else if(q.type==='number') valid=typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100000000;
      else if(q.type==='select') valid=typeof value==='string'&&!!q.options?.includes(value);
      else if(q.type==='date') valid=typeof value==='string'&&validDate(value);
      else if(q.type==='datetime-local') valid=typeof value==='string'&&dateTime.safeParse(value).success&&!!value;
      else valid=typeof value==='string'&&value.length<=2000;
    }
    if(!valid)errors[`dynamicAnswers.${key}`]=['התשובה אינה מתאימה לשאלה או לקטגוריה שנבחרה'];
  }
  for(const q of questions.values())if(q.required&&answers[q.key]===undefined)errors[`dynamicAnswers.${q.key}`]=['יש להשיב על שאלה זו'];
  return errors;
}

export const reportSchema=z.object({
 primaryCategory:category, secondaryCategories:z.array(category).max(10),
 companies:z.array(z.object({name:z.string().trim().min(2,'יש להזין את שם החברה').max(200),companyType:z.enum(companyTypes.map(c=>c.id) as ['airline','agency','hotel','booking_site','package_operator','other'])}).strict()).min(1).max(8),
 bookingChannel:z.enum(['direct','intermediary']),intermediaryName:optionalText(200),bookingDate:optionalDate,incidentDate:z.string().refine(validDate,'יש להזין תאריך אירוע תקין'),bookingReference:optionalText(100),passengerCount:z.number().int().min(1).max(10000),
 flight:z.object({flightNumber:optionalText(30),originAirport:optionalText(100),destinationAirport:optionalText(100),scheduledDeparture:dateTime,actualDeparture:dateTime,scheduledArrival:dateTime,actualArrival:dateTime}).strict(),
 description:z.string().trim().min(20,'יש לתאר את האירוע ב-20 תווים לפחות').max(12000),companyContacted:z.boolean(),companyContactDate:optionalDate,companyResponse:optionalText(4000),resolved:z.boolean(),resolution:optionalText(4000),
 purchaseAmount:amount,extraChargeAmount:amount,requestedRefundAmount:amount,receivedRefundAmount:amount,additionalClaimedLoss:amount,currency:z.enum(['ILS','USD','EUR','GBP','other']),dynamicAnswers:z.record(z.string().max(100),z.union([z.string().max(2000),z.number().finite(),z.boolean()])),
 reporter:z.object({fullName:z.string().trim().min(2,'יש להזין שם מלא').max(150),email:z.email('כתובת הדוא״ל אינה תקינה').max(254),phone:z.string().trim().min(7,'יש להזין מספר טלפון').max(30).regex(/^[+\d\s()\-]+$/,'יש להזין מספר טלפון תקין'),isPassenger:z.boolean(),relationship:optionalText(200)}).strict(),
 consents:z.object({privacy:z.boolean().refine(v=>v,'יש לאשר את הודעת הפרטיות והצהרת נכונות המידע'),caseContact:z.boolean(),updates:z.boolean()}).strict(),honeypot:z.string().max(500).optional(),startedAt:z.number().int().positive(),idempotencyKey:z.string().uuid('מזהה השליחה אינו תקין')
}).strict().superRefine((v,ctx)=>{
 const companyKeys=new Set<string>();for(const [index,c] of v.companies.entries()){const key=`${c.name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('he-IL')}:${c.companyType}`;if(companyKeys.has(key))ctx.addIssue({code:'custom',path:['companies',index,'name'],message:'חברה זו כבר נוספה לדיווח באותו סוג ספק'});companyKeys.add(key);}
 for(const [path,messages] of Object.entries(validateDynamicAnswers(v.primaryCategory,v.secondaryCategories,v.dynamicAnswers)))ctx.addIssue({code:'custom',path:path.split('.'),message:messages[0]});
 if(v.bookingChannel==='intermediary'&&!v.intermediaryName?.trim())ctx.addIssue({code:'custom',path:['intermediaryName'],message:'יש להזין את שם המתווך'});
 if(!v.reporter.isPassenger&&!v.reporter.relationship?.trim())ctx.addIssue({code:'custom',path:['reporter','relationship'],message:'יש לציין את הקשר לאירוע'});
 if(v.secondaryCategories.includes(v.primaryCategory)||new Set(v.secondaryCategories).size!==v.secondaryCategories.length)ctx.addIssue({code:'custom',path:['secondaryCategories'],message:'אין לבחור קטגוריה יותר מפעם אחת'});
});
export const privacyRequestSchema=z.object({fullName:z.string().trim().min(2).max(150),email:z.email().max(254),type:z.enum(['access','correction','deletion']),reference:z.string().max(100).optional(),message:z.string().trim().min(10).max(4000),consent:z.literal(true),honeypot:z.string().max(500).optional()}).strict();
export type PrivacyRequestInput=z.infer<typeof privacyRequestSchema>;
export const parseReport=(value:unknown):ReportInput=>reportSchema.parse(value);
