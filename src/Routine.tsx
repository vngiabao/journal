// The daily routine lives in the to-do list as tasks added for you, each with a priority. They tick themselves
// off when you do the real thing (pick the frog, check in, write the review), and tapping one takes you there.
// Deleting one hides it for the day. The gym session is added the same way, by training.ts; reviews live in Where to next.
import type {State,Todo,Priority} from './model';
import {addDays,weekStart} from './dates';
import {leftovers} from './frog-rules';

export type RoutineId='rewrite'|'plan'|'checkin'|'tomorrow'|'weekly'|'monthly';
type Wanted={id:RoutineId;text:string;priority:Priority;done:boolean;page:string;target:string};

export function routineTasks(s:State,now:string):Wanted[]{
 const todays=(s.todos??[]).filter(t=>t.date===now),frog=todays.find(t=>t.frog),tasks=todays.filter(t=>!t.frog&&!t.done&&!t.auto);
 const entry=s.journals.find(j=>j.date===now&&j.kind==='daily'),left=leftovers(s.todos??[],now).length;
 const dow=new Date(`${now}T12:00:00`).getDay(),[y,m]=now.split('-').map(Number),lastDay=new Date(y,m,0).getDate(),day=Number(now.slice(8)),ws=weekStart(now);
 const had=(id:RoutineId)=>todays.some(t=>t.routine===id);
 const out:Wanted[]=[];
 if(left>0||had('rewrite'))out.push({id:'rewrite',text:'Rewrite yesterday’s unfinished tasks',priority:'A',done:left===0,page:'Today',target:'.rewrite, .rewrite-done'});
 out.push({id:'plan',text:'Plan today: pick your frog, label tasks A to E',priority:'A',done:!!frog&&tasks.every(t=>!!t.priority),page:'Today',target:'.frog-pick, .frog-card, .todo-list .prio-chip'});
 out.push({id:'checkin',text:'Write today’s page: how it felt, and a few lines',priority:'B',done:!!entry?.mood&&!!entry.text.trim(),page:'Journal',target:'.verso .mood-picker'});
 out.push({id:'tomorrow',text:'Choose tomorrow’s frog',priority:'C',done:(s.todos??[]).some(t=>t.date===addDays(now,1)&&t.frog),page:'Today',target:'.tomorrow-frog'});
 return out;
}

// Adds today's routine tasks that are missing and keeps their ticks true. Returns whether anything changed.
export function syncRoutine(s:State,now:string){
 let changed=false;const list=s.todos??=[];
 for(const w of routineTasks(s,now)){
  const t=list.find(x=>x.date===now&&x.routine===w.id);
  if(!t){list.push({id:crypto.randomUUID(),date:now,text:w.text,done:w.done,createdAt:new Date().toISOString(),priority:w.priority,routine:w.id,...(w.done?{doneAt:new Date().toISOString()}:{})});changed=true;continue;}
  if(t.dismissed)continue;
  if(t.done!==w.done){t.done=w.done;t.doneAt=w.done?new Date().toISOString():undefined;changed=true;}
 }
 return changed;
}
export const routineNeedsSync=(s:State,now:string)=>{const copy={todos:structuredClone(s.todos??[]),journals:s.journals,goals:s.goals} as State;return syncRoutine(copy,now);};
export const routineTarget=(t:Todo,s:State,now:string)=>routineTasks(s,now).find(w=>w.id===t.routine);
