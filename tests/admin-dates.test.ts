import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatAdminDateTime} from '../src/components/admin/date';

test('admin keeps offset-free intake wall clock stable across host timezones',()=>{
  const expected=new Intl.DateTimeFormat('he-IL',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date('2026-10-18T14:30:00Z'));
  assert.equal(formatAdminDateTime('2026-10-18T14:30'),expected);
});
test('admin renders absolute timestamps in Israel including daylight saving',()=>{
  const expected=new Intl.DateTimeFormat('he-IL',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jerusalem'}).format(new Date('2026-10-18T11:30:00Z'));
  assert.equal(formatAdminDateTime('2026-10-18T11:30:00Z'),expected);
  assert.equal(formatAdminDateTime('2026-10-18T14:30:00+03:00'),expected);
});
test('admin handles omitted or invalid datetime without throwing',()=>{
  assert.equal(formatAdminDateTime(undefined),'לא נמסר');
  assert.equal(formatAdminDateTime('invalid'),'invalid');
});
