import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeDynamicAnswers,prepareReportPayload,questionsForCategories} from '../src/lib/form-values';
import {reportSchema,validateDynamicAnswers} from '../shared/validation';
import {categories,reportCategories,categoryLabel,CONSENT_VERSION} from '../shared/catalog';
import type {ReportInput} from '../shared/types';

function report():ReportInput{
  return {primaryCategory:'cancellation',secondaryCategories:[],companies:[{name:'חברה פיקטיבית לבדיקה',companyType:'airline'}],bookingChannel:'direct',incidentDate:'2026-10-10',passengerCount:2,flight:{},description:'תיאור פיקטיבי ארוך מספיק של אירוע ביטול טיסה לצורך בדיקה בלבד.',companyContacted:false,resolved:false,currency:'ILS',dynamicAnswers:{},reporter:{fullName:'משתמש בדיקה',email:'test@example.invalid',phone:'050-0000000',isPassenger:true},consents:{privacy:true,caseContact:false,updates:false},startedAt:Date.now()-5000,idempotencyKey:'3cc665d4-6fea-4c15-b2e7-955e4f059841'};
}

test('secondary categories add questions and overlapping question keys render once',()=>{
  const questions=questionsForCategories('cancellation',['baggage','extra_charge','misleading']);
  assert.ok(questions.some(q=>q.key==='cancellation_notice'));
  assert.ok(questions.some(q=>q.key==='baggage_issue'));
  assert.equal(questions.filter(q=>q.key==='displayed_price').length,1);
  assert.equal(questionsForCategories(undefined).length,0);
});

test('blank optional controls are omitted while false and zero survive validation',()=>{
  const raw={cancellation_notice:'',scheduled_flight:undefined,alternative_offered:false,additional_expenses:false};
  const cleaned=normalizeDynamicAnswers(raw);
  assert.deepEqual(cleaned,{alternative_offered:false,additional_expenses:false});
  assert.deepEqual(normalizeDynamicAnswers({displayed_price:0,charged_price:10}),{displayed_price:0,charged_price:10});
  assert.equal(raw.cancellation_notice,'');
  const fixture=report();fixture.dynamicAnswers=cleaned;
  assert.equal(reportSchema.safeParse(fixture).success,true);
});

test('dynamic controls reject string booleans, numeric strings, unknown and inactive keys',()=>{
  assert.ok(validateDynamicAnswers('cancellation',[],{alternative_offered:'false'})['dynamicAnswers.alternative_offered']);
  assert.ok(validateDynamicAnswers('extra_charge',[],{displayed_price:'100'})['dynamicAnswers.displayed_price']);
  assert.ok(validateDynamicAnswers('cancellation',[],{baggage_issue:'אובדן'})['dynamicAnswers.baggage_issue']);
  assert.ok(validateDynamicAnswers('cancellation',[],{unregistered_question:true})['dynamicAnswers.unregistered_question']);
  assert.deepEqual(validateDynamicAnswers('cancellation',['baggage'],{baggage_issue:'אובדן',alternative_offered:false}),{});
});

test('dynamic dates, selection options and money must be valid for their question type',()=>{
  for(const answers of [{baggage_received:'2026-02-30'},{baggage_issue:'אפשרות שלא קיימת'},{baggage_claimed_loss:-1},{baggage_claimed_loss:Infinity}])assert.notEqual(Object.keys(validateDynamicAnswers('baggage',[],answers)).length,0);
  assert.deepEqual(validateDynamicAnswers('delay',[],{scheduled_departure:'2026-10-10T14:30',assistance_provided:false}),{});
  assert.notEqual(Object.keys(validateDynamicAnswers('delay',[],{scheduled_departure:'2026-10-10T99:99'})).length,0);
});

test('final payload omits hidden conditional answers without changing the in-memory draft',()=>{
  const fixture=report();fixture.intermediaryName='מתווך קודם';fixture.companyContactDate='2026-10-11';fixture.companyResponse='תשובה שנמחקה על ידי שינוי הבחירה';fixture.resolution='פתרון קודם';fixture.reporter.relationship='קרוב משפחה';
  const payload=prepareReportPayload(fixture);
  assert.equal(payload.intermediaryName,undefined);assert.equal(payload.companyContactDate,undefined);assert.equal(payload.companyResponse,undefined);assert.equal(payload.resolution,undefined);assert.equal(payload.reporter.relationship,undefined);
  assert.equal(fixture.reporter.relationship,'קרוב משפחה');
  fixture.bookingChannel='intermediary';fixture.companyContacted=true;fixture.resolved=true;fixture.reporter.isPassenger=false;
  const activePayload=prepareReportPayload(fixture);
  assert.equal(activePayload.intermediaryName,'מתווך קודם');assert.equal(activePayload.companyContactDate,'2026-10-11');assert.equal(activePayload.reporter.relationship,'קרוב משפחה');
});

test('dynamic flight answers also populate structured flight data and preserve retry identity',()=>{
  const fixture=report();fixture.primaryCategory='delay';fixture.dynamicAnswers={scheduled_departure:'2026-10-10T10:00',actual_departure:'2026-10-10T16:00',scheduled_arrival:'2026-10-10T14:00',actual_arrival:'2026-10-10T20:00'};
  const payload=prepareReportPayload(fixture);
  assert.equal(payload.flight.scheduledDeparture,'2026-10-10T10:00');assert.equal(payload.flight.actualDeparture,'2026-10-10T16:00');assert.equal(payload.flight.scheduledArrival,'2026-10-10T14:00');assert.equal(payload.flight.actualArrival,'2026-10-10T20:00');
  assert.equal(payload.idempotencyKey,fixture.idempotencyKey);assert.equal(payload.startedAt,fixture.startedAt);assert.deepEqual(fixture.flight,{});assert.equal(reportSchema.safeParse(payload).success,true);
});

test('privacy is required; optional contact and updates remain separate and unchecked',()=>{
  const fixture=report();assert.equal(reportSchema.safeParse(fixture).success,true);assert.equal(fixture.consents.caseContact,false);assert.equal(fixture.consents.updates,false);
  fixture.consents.privacy=false;const result=reportSchema.safeParse(fixture);assert.equal(result.success,false);if(!result.success)assert.ok(result.error.issues.some(issue=>issue.path.join('.')==='consents.privacy'));
});

test('conditional intermediary and reporter relationship remain required',()=>{
  const fixture=report();fixture.bookingChannel='intermediary';fixture.reporter.isPassenger=false;
  const result=reportSchema.safeParse(fixture);assert.equal(result.success,false);
  if(!result.success){const paths=result.error.issues.map(issue=>issue.path.join('.'));assert.ok(paths.includes('intermediaryName'));assert.ok(paths.includes('reporter.relationship'));}
});

test('duplicate normalized company names remain invalid after removing the role field',()=>{
  const fixture=report();fixture.companies=[{name:'  DEMO   AIR  ',companyType:'airline'},{name:'demo air',companyType:'airline'}];
  const result=reportSchema.safeParse(fixture);assert.equal(result.success,false);
  if(!result.success)assert.ok(result.error.issues.some(issue=>issue.path.join('.')==='companies.1.name'));
  fixture.companies[1].companyType='agency';assert.equal(reportSchema.safeParse(fixture).success,true);
});

test('retired report categories are rejected for both primary and secondary submissions while historical labels remain available',()=>{
  for(const retired of ['baggage','package','service'] as const){
    assert.equal(reportCategories.some(category=>category.id===retired),false);
    assert.ok(categories.some(category=>category.id===retired));
    assert.notEqual(categoryLabel(retired),retired);
    assert.equal(reportSchema.safeParse({...report(),primaryCategory:retired}).success,false);
    assert.equal(reportSchema.safeParse({...report(),secondaryCategories:[retired]}).success,false);
  }
});

test('new reports require no supplier role or duplicate story fields and reject removed fields',()=>{
  const fixture=report();
  assert.equal(reportSchema.safeParse(fixture).success,true);
  assert.equal(reportSchema.safeParse({...fixture,companies:[{...fixture.companies[0],role:'old field'}]}).success,false);
  for(const field of ['expectedService','actualOutcome'])assert.equal(reportSchema.safeParse({...fixture,[field]:'old field'}).success,false);
});

test('case contact is a separate optional consent and old legal consent is never reinterpreted',()=>{
  const fixture=report();
  assert.equal(reportSchema.safeParse(fixture).success,true);
  assert.equal(reportSchema.safeParse({...fixture,consents:{...fixture.consents,caseContact:true}}).success,true);
  assert.equal(reportSchema.safeParse({...fixture,consents:{privacy:true,legalContact:true,updates:false}}).success,false);
  assert.equal(CONSENT_VERSION,'2026-10-case-contact-draft-2');
});

