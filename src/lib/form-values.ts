import {dynamicQuestions,type DynamicQuestion} from '../../shared/catalog';
import type {Category,ReportInput} from '../../shared/types';

export function questionsForCategories(primary:Category|undefined,secondary:Category[]=[]):DynamicQuestion[]{
  const questions=new Map<string,DynamicQuestion>();
  for(const category of [primary,...secondary]){
    if(!category)continue;
    for(const question of dynamicQuestions[category]??[])if(!questions.has(question.key))questions.set(question.key,question);
  }
  return [...questions.values()];
}
export function normalizeDynamicAnswers(answers:Record<string,string|number|boolean|undefined>):ReportInput['dynamicAnswers']{
  return Object.fromEntries(Object.entries(answers??{}).filter((entry):entry is [string,string|number|boolean]=>entry[1]!==undefined&&entry[1]!==''));
}
export function prepareReportPayload(values:ReportInput):ReportInput{
  const answers=normalizeDynamicAnswers(values.dynamicAnswers);
  const answerText=(key:string)=>typeof answers[key]==='string'?answers[key] as string:undefined;
  return {...values,dynamicAnswers:answers,
    intermediaryName:values.bookingChannel==='intermediary'?values.intermediaryName:undefined,
    companyContactDate:values.companyContacted?values.companyContactDate:undefined,
    companyResponse:values.companyContacted?values.companyResponse:undefined,
    resolution:values.resolved?values.resolution:undefined,
    reporter:{...values.reporter,relationship:values.reporter.isPassenger?undefined:values.reporter.relationship},
    flight:{...values.flight,scheduledDeparture:answerText('scheduled_departure')||answerText('scheduled_flight')||values.flight.scheduledDeparture,actualDeparture:answerText('actual_departure')||values.flight.actualDeparture,scheduledArrival:answerText('scheduled_arrival')||values.flight.scheduledArrival,actualArrival:answerText('actual_arrival')||values.flight.actualArrival},
  };
}
