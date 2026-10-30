// The daily ritual's rules, kept free of UI so they are easy to test.
// Morning (until 17:00): pick the frog, settle today's three, go. Evening (from 17:00): tick what you did, how today
// felt, rewrite or drop what's left and choose tomorrow's frog. Sunday (and Saturday evening): plan the week.
import type {State,Todo,DayRitual} from '../model';
import {uid} from '../model';
import {addDays} from '../dates';
import {priorityRank,leftovers} from '../frog-rules';
import {weekOf,nextWeek,monthOf,nextMonth} from '../plan';

export type RitualKind='morning'|'evening';
export const EVENING_HOUR=17;

export const ritualOf=(s:State,date:string):DayRitual|undefined=>(s.rituals??[]).find(r=>r.date===date);
function ritualFor(s:State,date:string){const list=s.rituals??=[];let r=list.find(x=>x.date===date);if(!r){r={date};list.push(r);}return r;}
export function markRitual(s:State,date:string,key:'morning'|'evening'|'week',at=new Date().toISOString()){const r=ritualFor(s,date);if(!r[key])r[key]=at;}
export function setRitualFrog(s:State,date:string,id:string){ritualFor(s,date).frog=id;}

const dayOfWeek=(date:string)=>new Date(`${date}T12:00:00`).getDay();
// Sunday all day; Saturday once the evening opens.
export const isPlanDay=(date:string,hour:number)=>{const d=dayOfWeek(date);return d===0||(d===6&&hour>=EVENING_HOUR);};
// The last three days of a month also ask for next month's list.
export const isMonthEnd=(date:string)=>{const [y,m]=date.split('-').map(Number),last=new Date(y,m,0).getDate();return last-Number(date.slice(8))<3;};
// The week being planned: on a Sunday or Saturday that is next week (weeks start on Monday), otherwise this one.
export const planWeek=(date:string)=>{const d=dayOfWeek(date);return d===0||d===6?nextWeek(date):weekOf(date);};
export const planMonth=(date:string)=>isMonthEnd(date)?nextMonth(date):monthOf(date);

// Which ritual leads Today right now, or null when both are done (or the morning is done and it's not evening yet).
export function activeRitual(s:State,date:string,hour:number):RitualKind|null{
 const r=ritualOf(s,date);
 if(hour>=EVENING_HOUR)return r?.evening?null:'evening';
 return r?.morning?null:'morning';
}
// Whether this ritual carries the extra "Plan the week" step.
export const hasWeekStep=(s:State,date:string,hour:number)=>isPlanDay(date,hour)&&!ritualOf(s,date)?.week;

// Today's own tasks: what you wrote, not the app's routine reminders.
export const todaysTasks=(s:State,date:string)=>(s.todos??[]).filter(t=>t.date===date&&!t.dismissed&&!t.routine);
// Today's list in the doing view: what's still yours today, and what the evening settled (written again for tomorrow
// or let go), which leaves the list. On a closed day an unticked gym session leaves it too (the training card names it).
export function todaysList(s:State,date:string,closed=false){
 const mine=(s.todos??[]).filter(t=>t.date===date&&!t.dismissed&&!t.routine),settled=mine.filter(t=>t.carried&&!t.done);
 return {open:mine.filter(t=>!(t.carried&&!t.done)&&!(closed&&t.auto&&!t.done)),settled,again:settled.filter(t=>t.carried==='rewritten').length,dropped:settled.filter(t=>t.carried!=='rewritten').length};
}
// Candidates for the frog: undone tasks you could do today, best first. The gym session and hand-offs never qualify.
export const frogCandidates=(s:State,date:string)=>todaysTasks(s,date).filter(t=>!t.done&&!t.auto&&t.priority!=='D'&&t.priority!=='E').sort((a,b)=>priorityRank(a)-priorityRank(b));
// The suggested frog: the one already chosen (last night, say), otherwise the top task.
export const suggestFrog=(s:State,date:string):Todo|undefined=>todaysTasks(s,date).find(t=>t.frog&&!t.done)??frogCandidates(s,date)[0];
// The next tasks after the frog, best first. The first three are "today's three".
export const afterFrog=(s:State,date:string)=>todaysTasks(s,date).filter(t=>!t.done&&!t.frog).sort((a,b)=>priorityRank(a)-priorityRank(b));

// Makes one of today's tasks the frog (an A task), and remembers it as the morning's choice.
export function chooseFrog(s:State,date:string,id:string){for(const t of s.todos??[])if(t.date===date)t.frog=t.id===id;const t=(s.todos??[]).find(x=>x.id===id);if(t)t.priority='A';setRitualFrog(s,date,id);}
// A frog typed fresh in the morning: a new A task for today.
export function newFrog(s:State,date:string,text:string){const t:Todo={id:uid(),date,text,done:false,createdAt:new Date().toISOString(),priority:'A'};s.todos=[...(s.todos??[]),t];chooseFrog(s,date,t.id);return t;}
export function addTask(s:State,date:string,text:string){const t:Todo={id:uid(),date,text,done:false,createdAt:new Date().toISOString()};s.todos=[...(s.todos??[]),t];return t;}
// "Not today": the task moves to tomorrow as it is, and the next one steps up.
export function toTomorrow(s:State,id:string,date:string){const t=(s.todos??[]).find(x=>x.id===id);if(!t)return;t.date=addDays(date,1);t.frog=false;}

// What's left at the end of the day: today's unfinished tasks plus older leftovers, each rewritten by hand or let go.
export const leftToSettle=(s:State,date:string)=>[...leftovers(s.todos??[],date),...todaysTasks(s,date).filter(t=>!t.done&&!t.auto&&!t.carried)];
export function rewriteTomorrow(s:State,id:string,text:string,date:string){const o=(s.todos??[]).find(x=>x.id===id);if(!o||!text.trim())return;o.carried='rewritten';o.carriedOn=date;
 s.todos=[...(s.todos??[]),{id:uid(),date:addDays(date,1),text:text.trim(),done:false,createdAt:new Date().toISOString(),...(o.priority?{priority:o.priority}:{})}];}
export function letGo(s:State,id:string,date:string){const o=(s.todos??[]).find(x=>x.id===id);if(!o)return;o.carried='dropped';o.carriedOn=date;}
export const tomorrowsFrog=(s:State,date:string)=>(s.todos??[]).find(t=>t.date===addDays(date,1)&&t.frog&&!t.dismissed);
// Tomorrow's frog: an existing task for tomorrow by id, or new words.
export function setTomorrowFrog(s:State,date:string,pick:{id?:string;text?:string}){const tomorrow=addDays(date,1);
 if(pick.id){for(const t of s.todos??[])if(t.date===tomorrow)t.frog=t.id===pick.id;const t=(s.todos??[]).find(x=>x.id===pick.id);if(t)t.priority='A';return;}
 const v=pick.text?.trim();if(!v)return;for(const t of s.todos??[])if(t.date===tomorrow)t.frog=false;
 s.todos=[...(s.todos??[]),{id:uid(),date:tomorrow,text:v,done:false,frog:true,priority:'A',createdAt:new Date().toISOString()}];}
export const tomorrowsTasks=(s:State,date:string)=>(s.todos??[]).filter(t=>t.date===addDays(date,1)&&!t.routine&&!t.auto&&!t.dismissed);
// What tonight's settling did: how many leftovers were written again for tomorrow and how many were let go.
export function settledOn(s:State,date:string){const done=(s.todos??[]).filter(t=>t.carriedOn===date&&(t.carried==='rewritten'||t.carried==='dropped'));
 const again=done.filter(t=>t.carried==='rewritten').length;return {again,dropped:done.length-again,total:done.length};}
