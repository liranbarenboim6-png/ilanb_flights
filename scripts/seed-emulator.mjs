import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const project=process.env.GCLOUD_PROJECT||'demo-aviation-rights';
function local(value){try{return ['127.0.0.1','localhost','[::1]'].includes(new URL(value?.includes('://')?value:`http://${value}`).hostname);}catch{return false;}}
if(!project.startsWith('demo-')||!['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST'].every(key=>local(process.env[key])))throw new Error('Seeding is allowed only against a demo- project and three explicit loopback emulator endpoints.');
initializeApp({projectId:project,storageBucket:`${project}.firebasestorage.app`});
const db=getFirestore();const auth=getAuth();
for(const [uid,email,role] of [['demo-administrator','admin@example.invalid','administrator'],['demo-reviewer','reviewer@example.invalid','reviewer']]){
 let user;try{user=await auth.getUser(uid);await auth.updateUser(uid,{email,emailVerified:true,password:'DemoOnly!2026',disabled:false});}catch(error){if(error.code!=='auth/user-not-found')throw error;user=await auth.createUser({uid,email,emailVerified:true,password:'DemoOnly!2026'});}
 await db.collection('admins').doc(user.uid).set({email,role,active:true,createdAt:new Date().toISOString(),emulatorOnly:true},{merge:true});
}
const marker=db.collection('system').doc('fictionalSeedV1');
if((await marker.get()).exists){console.log('Firebase emulators ready. Existing fictional reports preserved.');process.exit(0);}
const categories=['cancellation','delay','refund','baggage','extra_charge','cancellation','refund','delay','service','package','booking','agency'];
const names=['אופק דמו — חברה פיקטיבית','מסעות הדגמה — ספק פיקטיבי','שמיים דמו — חברה פיקטיבית'];
const normalized=name=>name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('he-IL');
const batch=db.batch();
for(let i=0;i<12;i++){
 const id=`00000000-0000-4000-8000-${String(101+i).padStart(12,'0')}`;const reporterId=`seed-reporter-${i+1}`;const createdAt=new Date(Date.UTC(2026,5+Math.floor(i/3),3+i,9)).toISOString();const name=names[i%3];const companyType=i%3===1?'agency':'airline';const companyId=createHash('sha256').update(`${normalized(name)}:${companyType}`).digest('hex');
 batch.set(db.collection('companies').doc(companyId),{name,normalizedName:normalized(name),companyType,createdAt});
 batch.set(db.collection('companyAliases').doc(companyId),{companyId,normalizedName:normalized(name),companyType});
 batch.create(db.collection('reportCompanies').doc(`${id}-0`),{reportId:id,companyId,role:'ספק לדוגמה',position:0,originalName:name,originalCompanyType:companyType});
 batch.create(db.collection('reporters').doc(reporterId),{values:{fullName:`מדווח פיקטיבי ${i+1}`,email:`demo-${i+1}@example.invalid`,phone:'0500000000',isPassenger:true},createdAt});
 batch.create(db.collection('reports').doc(id),{id,reporterId,publicReference:`DEMO-2026-${String(i+1).padStart(4,'0')}`,primaryCategory:categories[i],secondaryCategories:[],bookingChannel:'direct',bookingDate:createdAt.slice(0,10),incidentDate:createdAt.slice(0,10),passengerCount:1+i%4,description:'זהו דיווח פיקטיבי לצורך הדגמת המערכת בלבד. אין מדובר באירוע אמיתי או בטענה נגד חברה אמיתית.',companyContacted:i%2===0,companyResponse:'תגובה פיקטיבית לצורך הדגמה',resolved:i%4===0,purchaseAmount:900+i*175,extraChargeAmount:i%2?150:0,requestedRefundAmount:600,receivedRefundAmount:0,additionalClaimedLoss:i*50,currency:'ILS',startedAt:Date.now()-60000,idempotencyKey:randomUUID(),status:['new','reviewing','reviewed','missing_info','legal_review','closed'][i%6],createdAt,updatedAt:createdAt,relatedReportIds:[]});
 batch.create(db.collection('flights').doc(id),{reportId:id,values:{flightNumber:`DM${100+i%4}`,originAirport:'TLV',destinationAirport:'DEMO'}});
 batch.create(db.collection('reportAnswers').doc(id),{reportId:id,values:{},questionSchemaVersion:1});
 batch.create(db.collection('consents').doc(id),{reportId:id,reporterId,values:{privacy:true,legalContact:false,updates:false},version:'2026-10-draft-1',recordedAt:createdAt});
}
batch.set(marker,{createdAt:new Date().toISOString(),fictional:true});await batch.commit();
console.log('Seeded 12 fictional reports into local Firestore.');
console.log('Local demo: admin@example.invalid or reviewer@example.invalid / DemoOnly!2026.');
console.log('These accounts work only in the Firebase Auth emulator; production requires verified email, password and an active staff role.');
