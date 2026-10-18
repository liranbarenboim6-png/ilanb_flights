import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc} from 'firebase/firestore';
import {ref,uploadBytes,getBytes} from 'firebase/storage';

const projectId='demo-aviation-rights';
const base=process.env.API_BASE||`http://127.0.0.1:5001/${projectId}/europe-west1/api`;
const origin='http://127.0.0.1:5173';
let checks=0;
async function request(path,{token,body,method='GET',expect=200}={}){const headers={Origin:origin};if(token)headers.Authorization=`Bearer ${token}`;if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';const response=await fetch(`${base}${path}`,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});assert.equal(response.status,expect,`${method} ${path}: ${await response.clone().text()}`);checks++;return response;}
async function signIn(email){const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'DemoOnly!2026',returnSecureToken:true})});assert.equal(response.status,200,await response.clone().text());return (await response.json()).idToken;}
function sample(){return {primaryCategory:'refund',secondaryCategories:[],companies:[{name:'ספק בדיקת Firebase — פיקטיבי',companyType:'airline',role:'מוכר הכרטיס'}],bookingChannel:'direct',incidentDate:'2026-10-01',passengerCount:1,flight:{flightNumber:'QA777',originAirport:'TLV',destinationAirport:'DEMO'},description:'דיווח בדיקה פיקטיבי לצורך אימות שמירה במסד Firestore עם מסמך פרטי.',companyContacted:true,companyResponse:'אין מענה בהדגמה',resolved:false,purchaseAmount:1000,extraChargeAmount:0,requestedRefundAmount:1000,receivedRefundAmount:0,additionalClaimedLoss:100,currency:'ILS',dynamicAnswers:{},reporter:{fullName:'מדווח בדיקה פיקטיבי',email:`firebase-qa-${randomUUID()}@example.invalid`,phone:'0500000000',isPassenger:true},consents:{privacy:true,legalContact:false,updates:false},startedAt:Date.now()-10000,idempotencyKey:randomUUID()};}
const pdf=new Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'],{type:'application/pdf'});
function form(input){const data=new FormData();data.set('payload',JSON.stringify(input));data.append('files',pdf,'private-test.pdf');return data;}
await request('/api/config');await request('/api/admin/stats',{expect:401});
const administrator=await signIn('admin@example.invalid');const reviewer=await signIn('reviewer@example.invalid');
assert.equal((await (await request('/api/admin/session',{token:administrator})).json()).session.role,'administrator');
await request('/api/admin/stats',{token:reviewer});await request('/api/admin/users',{token:reviewer,expect:403});await request('/api/admin/export?type=personal',{token:reviewer,expect:403});
const input=sample();const created=await (await request('/api/reports',{method:'POST',body:form(input),expect:201})).json();const retried=await (await request('/api/reports',{method:'POST',body:form(input)})).json();assert.equal(retried.reference,created.reference);assert.equal(created.emailSent,false);
await request('/api/reports',{method:'POST',body:form({...input,description:input.description+' שונה'}),expect:409});
const listed=await (await request(`/api/admin/reports?q=${encodeURIComponent(created.reference)}`,{token:reviewer})).json();assert.equal(listed.total,1);const report=listed.reports[0];assert.equal(report.reporter.email,input.reporter.email);assert.equal(report.evidence.length,1);assert.equal(report.evidence[0].storagePath,'');
await request(`/api/admin/reports/${report.id}`,{token:administrator});
const download=await request(`/api/admin/evidence/${report.evidence[0].id}`,{token:reviewer});assert.equal(await download.text(),await pdf.text());assert.match(download.headers.get('content-disposition'),/^attachment/);
await request(`/api/admin/evidence/${report.evidence[0].id}`,{expect:401});
await request(`/api/admin/reports/${report.id}`,{token:reviewer,method:'PATCH',body:{status:'reviewing',note:'הערה פיקטיבית לבדיקת יומן פעילות',duplicateOf:null}});
const detail=await (await request(`/api/admin/reports/${report.id}`,{token:reviewer})).json();assert.equal(detail.report.status,'reviewing');assert.ok(detail.report.activities.length);
const statistical=await (await request('/api/admin/export?type=statistical',{token:reviewer})).text();assert.ok(!statistical.includes(input.reporter.email));const personal=await (await request('/api/admin/export?type=personal',{token:administrator})).text();assert.ok(personal.includes(input.reporter.email));
const privacy=await (await request('/api/privacy-requests',{method:'POST',body:{fullName:'מבקש פיקטיבי',email:'privacy-qa@example.invalid',type:'access',reference:created.reference,message:'בקשת בדיקה פיקטיבית לעיון במידע.',consent:true},expect:201})).json();await request('/api/admin/privacy-requests',{token:reviewer,expect:403});await request('/api/admin/privacy-requests',{token:administrator,method:'PATCH',body:{id:privacy.reference,status:'verifying',note:'נדרש אימות זהות בערוץ מאובטח'}});
await request('/api/admin/companies',{token:reviewer});await request('/api/admin/patterns',{token:reviewer});
await request('/api/admin/users',{token:administrator,method:'POST',body:{authUserId:'demo-administrator',role:'reviewer'},expect:409});
// Two concurrent demotions must never remove every active administrator.
await request('/api/admin/users',{token:administrator,method:'POST',body:{authUserId:'demo-reviewer',role:'administrator'}});
const demotions=await Promise.all([['demo-administrator',administrator],['demo-reviewer',reviewer]].map(async([uid,token])=>{const response=await fetch(`${base}/api/admin/users`,{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({authUserId:uid,role:'reviewer'})});return response.status;}));
assert.equal(demotions.filter(status=>status===200).length,1);assert.ok(demotions.some(status=>[403,409].includes(status)));checks+=2;
const survivingToken=demotions[0]===200?reviewer:administrator;
const remainingUsers=await (await request('/api/admin/users',{token:survivingToken})).json();assert.equal(remainingUsers.users.filter(user=>user.active&&user.role==='administrator').length,1);
await request('/api/admin/users',{token:survivingToken,method:'POST',body:{authUserId:'demo-administrator',role:'administrator'}});
await request('/api/admin/users',{token:administrator,method:'POST',body:{authUserId:'demo-reviewer',role:'reviewer'}});

const rules=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')},storage:{host:'127.0.0.1',port:9199,rules:await readFile(new URL('../storage.rules',import.meta.url),'utf8')}});
try{
 for(const context of [rules.unauthenticatedContext(),rules.authenticatedContext('demo-administrator',{email:'admin@example.invalid',firebase:{sign_in_second_factor:'totp'}})]){
  await assertFails(getDoc(doc(context.firestore(),'reports',report.id)));await assertFails(setDoc(doc(context.firestore(),'admins','attacker'),{role:'administrator',active:true}));
  const object=ref(context.storage(`${projectId}.firebasestorage.app`),`evidence/${report.id}/untrusted.pdf`);await assertFails(uploadBytes(object,pdf));
  const existingObject=ref(context.storage(`${projectId}.firebasestorage.app`),`evidence/${report.id}/${report.evidence[0].id}.pdf`);const denied=await assertFails(getBytes(existingObject));assert.equal(denied.code,'storage/unauthorized');checks+=4;
 }
}finally{await rules.cleanup();}
console.log(`PASS: ${checks} Firebase API and direct Firestore/Storage permission checks.`);
