import type {Category, Status, CompanyType} from './types';
export const categories: {id:Category;label:string;short:string}[] = [
 {id:'cancellation',label:'ביטול טיסה',short:'ביטולי טיסות'}, {id:'delay',label:'עיכוב בטיסה',short:'עיכובים בטיסות'},
 {id:'refund',label:'סירוב להחזר כספי',short:'החזרים כספיים'}, {id:'baggage',label:'בעיה בכבודה',short:'כבודה'},
 {id:'extra_charge',label:'חיוב נוסף או בלתי צפוי',short:'חיובים נוספים'}, {id:'misleading',label:'הטעיה בפרסום או במכירה',short:'הטעיה במכירה'},
 {id:'booking',label:'בעיה בהזמנת טיסה או שירות תיירות',short:'בעיות בהזמנה'}, {id:'agency',label:'בעיה עם סוכנות נסיעות',short:'סוכנויות נסיעות'},
 {id:'package',label:'בעיה בחבילת נופש או מלון',short:'חבילות נופש'}, {id:'service',label:'יחס בלתי הולם או סירוב למתן שירות',short:'שירות'},
 {id:'other',label:'אחר',short:'אחר'}
];
// Keep the complete catalog for historical staff records and statistics.
export const reportCategories=categories.filter(category=>!['baggage','package','service'].includes(category.id));
export const statuses: {id:Status;label:string;color:string}[] = [
 {id:'new',label:'חדש',color:'blue'}, {id:'reviewing',label:'בבדיקה',color:'amber'}, {id:'reviewed',label:'נבדק',color:'green'},
 {id:'missing_info',label:'חסר מידע',color:'gray'}, {id:'recurring',label:'חשד להפרה חוזרת',color:'purple'},
 {id:'legal_review',label:'מועמד לבדיקה משפטית',color:'purple'}, {id:'in_progress',label:'בטיפול',color:'blue'}, {id:'closed',label:'נסגר',color:'gray'}
];
export const companyTypes: {id:CompanyType;label:string}[] = [
 {id:'airline',label:'חברת תעופה'}, {id:'agency',label:'סוכנות נסיעות'}, {id:'hotel',label:'מלון'},
 {id:'booking_site',label:'אתר הזמנות'}, {id:'package_operator',label:'מארגן חבילות נופש'}, {id:'other',label:'אחר'}
];
export type DynamicQuestion = {key:string;label:string;type:'text'|'number'|'datetime-local'|'date'|'boolean'|'select'; options?:string[];required?:boolean};
export const QUESTION_SCHEMA_VERSION = 1;
export const CONSENT_VERSION = '2026-10-case-contact-draft-2';
export const dynamicQuestions: Partial<Record<Category,DynamicQuestion[]>> = {
 cancellation:[{key:'scheduled_flight',label:'מועד הטיסה המתוכנן',type:'datetime-local'},{key:'cancellation_notice',label:'מתי התקבלה הודעת הביטול?',type:'datetime-local'},{key:'alternative_offered',label:'האם הוצעה טיסה חלופית?',type:'boolean'},{key:'refund_offered',label:'האם הוצע החזר כספי?',type:'boolean'},{key:'refund_received',label:'האם התקבל החזר בפועל?',type:'boolean'},{key:'additional_expenses',label:'האם נגרמו הוצאות נוספות?',type:'boolean'}],
 delay:[{key:'scheduled_departure',label:'מועד המראה מתוכנן',type:'datetime-local'},{key:'actual_departure',label:'מועד המראה בפועל',type:'datetime-local'},{key:'scheduled_arrival',label:'מועד נחיתה מתוכנן',type:'datetime-local'},{key:'actual_arrival',label:'מועד נחיתה בפועל',type:'datetime-local'},{key:'assistance_provided',label:'האם סופקו מזון, לינה או שירותי סיוע?',type:'boolean'}],
 baggage:[{key:'baggage_issue',label:'מה סוג הבעיה בכבודה?',type:'select',options:['אובדן','איחור','נזק','חיוב']},{key:'baggage_received',label:'מתי התקבלה הכבודה בפועל?',type:'date'},{key:'baggage_reported',label:'האם נמסר דיווח לחברה?',type:'boolean'},{key:'baggage_claimed_loss',label:'שווי הנזק הנטען',type:'number'}],
 extra_charge:[{key:'displayed_price',label:'מה המחיר שהוצג?',type:'number'},{key:'charged_price',label:'מה הסכום שנגבה בפועל?',type:'number'},{key:'charge_stage',label:'באיזה שלב הוצג החיוב?',type:'text'},{key:'avoidable_charge',label:'האם הייתה אפשרות להימנע מהחיוב?',type:'boolean'},{key:'price_evidence',label:'האם קיימת אסמכתה למחיר המקורי?',type:'boolean'}],
 misleading:[{key:'displayed_price',label:'מה המחיר שהוצג?',type:'number'},{key:'charged_price',label:'מה הסכום שנגבה בפועל?',type:'number'},{key:'charge_stage',label:'באיזה שלב הוצג החיוב?',type:'text'},{key:'avoidable_charge',label:'האם הייתה אפשרות להימנע מהחיוב?',type:'boolean'},{key:'price_evidence',label:'האם קיימת אסמכתה לפרסום?',type:'boolean'}]
};
export const categoryLabel=(id:string)=>categories.find(c=>c.id===id)?.label??id;
export const statusLabel=(id:string)=>statuses.find(s=>s.id===id)?.label??id;
export const formatDate=(date:string)=>new Intl.DateTimeFormat('he-IL',{dateStyle:'medium',timeZone:'Asia/Jerusalem'}).format(new Date(date));
