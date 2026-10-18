import test from 'node:test';
import assert from 'node:assert/strict';
import type {Request as ExpressRequest} from 'express';
import {isEmulator,loopbackEndpoint,multipart,sniffFile,csvCell,MAX_FILE_SIZE,rateScope,rateDocumentId} from '../functions/src/security';

test('CSV cells prevent spreadsheet formulas and escape quotes',()=>{
 assert.equal(csvCell(' =SUM(1,2)'),`"' =SUM(1,2)"`);
 assert.equal(csvCell('א"ב'),'"א""ב"');
});
test('emulator bypass needs a demo project and every local emulator',()=>{
 const keys=['FUNCTIONS_EMULATOR','GCLOUD_PROJECT','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST'];const prior=keys.map(key=>process.env[key]);
 try{
  Object.assign(process.env,{FUNCTIONS_EMULATOR:'true',GCLOUD_PROJECT:'demo-test',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'localhost:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'});assert.equal(isEmulator(),true);
  process.env.GCLOUD_PROJECT='real-project';assert.equal(isEmulator(),false);process.env.GCLOUD_PROJECT='demo-test';process.env.FIRESTORE_EMULATOR_HOST='https://external.example';assert.equal(isEmulator(),false);
 }finally{keys.forEach((key,index)=>{if(prior[index]===undefined)delete process.env[key];else process.env[key]=prior[index];});}
 assert.equal(loopbackEndpoint('127.0.0.1.evil.example:8080'),false);
});
test('shared proxy users have distinct private identity budgets; spoofed prefixes cannot split the transport budget',()=>{
 const req=(forwarded:string)=>({get:(key:string)=>key==='x-forwarded-for'?forwarded:undefined,socket:{remoteAddress:'10.0.0.1'}} as unknown as ExpressRequest);
 const first=req('198.51.100.10, 203.0.113.1');const second=req('198.51.100.20, 203.0.113.1');
 assert.equal(rateScope(first),rateScope(second));
 assert.notEqual(rateDocumentId('salt','report:identity',rateScope(first,'alice@example.invalid'),1),rateDocumentId('salt','report:identity',rateScope(second,'bob@example.invalid'),1));
 const key=rateDocumentId('salt','report:identity',rateScope(first,' Alice@Example.Invalid '),1);
 assert.equal(key,rateDocumentId('salt','report:identity',rateScope(second,'alice@example.invalid'),1));
 assert.match(key,/^[a-f0-9]{64}$/);assert.ok(!key.includes('alice'));assert.notEqual(key,rateDocumentId('other-salt','report:identity',rateScope(first,'alice@example.invalid'),1));
});
const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
async function parseForm(form:FormData){const request=new Request('http://localhost/api/reports',{method:'POST',body:form});const rawBody=Buffer.from(await request.arrayBuffer());const contentType=request.headers.get('content-type')!;return multipart({headers:{'content-type':contentType},rawBody,is:(type:string)=>type==='multipart/form-data'} as unknown as ExpressRequest);}
test('multipart accepts five files and preserves Hebrew filenames',async()=>{
 const form=new FormData();form.set('payload',JSON.stringify({description:'בדיקה'}));for(let i=0;i<5;i++)form.append('files',new Blob([pdf],{type:'application/pdf'}),`אישור-${i}.pdf`);
 const result=await parseForm(form);assert.equal(result.files.length,5);assert.equal(result.files[0].filename,'אישור-0.pdf');assert.equal(result.files[0].type,'application/pdf');
});
test('multipart rejects sixth file, wrong signatures, MIME mismatch, extra fields and oversized file',async()=>{
 const cases:[string,(form:FormData)=>void][]=[
  ['six files',form=>{for(let i=0;i<6;i++)form.append('files',new Blob([pdf],{type:'application/pdf'}),`${i}.pdf`);}],
  ['fake pdf',form=>form.append('files',new Blob(['not a pdf'],{type:'application/pdf'}),'fake.pdf')],
  ['wrong MIME',form=>form.append('files',new Blob([pdf],{type:'image/png'}),'test.pdf')],
  ['extra field',form=>form.append('unexpected','value')],
  ['oversized',form=>form.append('files',new Blob([Buffer.alloc(MAX_FILE_SIZE+1)],{type:'application/pdf'}),'large.pdf')]
 ];for(const [name,configure] of cases){const form=new FormData();form.set('payload','{}');configure(form);await assert.rejects(parseForm(form),undefined,name);}
 assert.equal(sniffFile(Buffer.from('hello')),null);
});
