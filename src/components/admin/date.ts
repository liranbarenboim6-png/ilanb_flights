/** Offset-free intake values are Israel wall-clock times, not browser-local instants. */
export function formatAdminDateTime(value?:string):string {
  if(!value)return 'לא נמסר';
  const wallClock=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value);
  // UTC here preserves the explicitly entered wall clock; no browser timezone is consulted.
  const date=new Date(wallClock?value+'Z':value);
  if(Number.isNaN(date.valueOf()))return value;
  return new Intl.DateTimeFormat('he-IL',{dateStyle:'medium',timeStyle:'short',timeZone:wallClock?'UTC':'Asia/Jerusalem'}).format(date);
}
