export function today(timezone='America/New_York'){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function parse(d:string){const [y,m,day]=d.split('-').map(Number);return new Date(y,m-1,day,12);}
export function iso(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function addDays(d:string,n:number){const dt=parse(d);dt.setDate(dt.getDate()+n);return iso(dt);}
export function addMonths(d:string,n:number){const dt=parse(d),day=dt.getDate();dt.setDate(1);dt.setMonth(dt.getMonth()+n);dt.setDate(Math.min(day,new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate()));return iso(dt);}
export function daysBetween(a:string,b:string){return Math.round((Date.UTC(...parts(b))-Date.UTC(...parts(a)))/86400000);}
function parts(d:string):[number,number,number]{const [y,m,day]=d.split('-').map(Number);return [y,m-1,day];}
export function weekStart(d:string){return addDays(d,-((parse(d).getDay()+6)%7));}
export function range(a:string,b:string){const n=Math.max(0,daysBetween(a,b));return Array.from({length:n+1},(_,i)=>addDays(a,i));}
export function label(d:string,opts:Intl.DateTimeFormatOptions={month:'short',day:'numeric'}){return parse(d).toLocaleDateString('en-US',opts);}
