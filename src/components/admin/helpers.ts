import type {InjectionKey} from 'vue';
import {formatAdminDateTime} from './date';
import type {AdminSession} from '../../../shared/types';
export const adminSessionKey:InjectionKey<AdminSession> = Symbol('adminSession');
export const displayDate=(value?:string)=>value&&Number.isFinite(new Date(value).getTime())?new Intl.DateTimeFormat('he-IL',{dateStyle:'medium',timeZone:'Asia/Jerusalem'}).format(new Date(value)):'לא צוין';
export const displayDateTime=formatAdminDateTime;
export const displayValue=(value:unknown)=>value===true?'כן':value===false?'לא':value===undefined||value===null||value===''?'לא צוין':String(value);
export const money=(value:unknown,currency='ILS')=>typeof value==='number'?`${value.toLocaleString('he-IL',{maximumFractionDigits:2})} ${currency}`:'לא צוין';
export const messageOf=(error:unknown)=>error instanceof Error?error.message:'הפעולה לא הושלמה. נסו שוב.';

