// Eat That Frog, chapter one ("Set the table"): decide what you want, write it down, set a deadline, list
// everything you'll need to do, organise it, and do something toward it every day. Ten goals, one chosen.
import type {State,PlanGoal} from './model';
import {uid} from './model';
import {weekStart,addDays} from './dates';

export const planGoals=(s:State)=>s.plan?.goals??[];
export const oneGoal=(s:State)=>planGoals(s).find(g=>g.one);
const goal=(s:State,id:string)=>(s.plan??={goals:[]}).goals.find(g=>g.id===id);

export function addGoal(s:State,text:string){const p=s.plan??={goals:[]};const g:PlanGoal={id:uid(),text,steps:[],createdAt:new Date().toISOString()};p.goals.push(g);return g;}
export function chooseOne(s:State,id:string){for(const g of s.plan?.goals??[])g.one=g.id===id?!g.one:false;}
export function addStep(s:State,goalId:string,text:string){const g=goal(s,goalId);if(g)g.steps.push({id:uid(),text,done:false});}
export function moveStep(s:State,goalId:string,stepId:string,by:number){const g=goal(s,goalId);if(!g)return;const i=g.steps.findIndex(x=>x.id===stepId),j=i+by;if(i<0||j<0||j>=g.steps.length)return;[g.steps[i],g.steps[j]]=[g.steps[j],g.steps[i]];}
export function toggleStep(s:State,goalId:string,stepId:string){const st=goal(s,goalId)?.steps.find(x=>x.id===stepId);if(!st)return;st.done=!st.done;for(const t of s.todos??[])if(t.fromPlan===stepId){t.done=st.done;t.doneAt=st.done?new Date().toISOString():undefined;}}
// "Do something every day": a step goes onto today's list as an A task, in your own words, and stays in step with the plan.
export function stepToToday(s:State,goalId:string,stepId:string,now:string){
 const st=goal(s,goalId)?.steps.find(x=>x.id===stepId);if(!st||st.done)return false;
 if((s.todos??[]).some(t=>t.fromPlan===stepId&&t.date===now))return false;
 s.todos=[...(s.todos??[]),{id:uid(),date:now,text:st.text,done:false,createdAt:new Date().toISOString(),priority:'A',fromPlan:stepId}];return true;
}
export function syncStepFromTodo(s:State,todoId:string){const t=(s.todos??[]).find(x=>x.id===todoId);if(!t?.fromPlan)return;for(const g of s.plan?.goals??[]){const st=g.steps.find(x=>x.id===t.fromPlan);if(st)st.done=t.done;}for(const it of s.plan?.items??[])if(it.id===t.fromPlan){it.done=t.done;const up=(s.plan?.items??[]).find(x=>x.sentTo===it.id);if(up)up.done=t.done;}}
export const nextStep=(g:PlanGoal)=>g.steps.find(x=>!x.done);

// Month and week lists. Periods are "2026-10" for a month and the Monday "2026-10-19" for a week.
export const monthOf=(d:string)=>d.slice(0,7);
export const weekOf=(d:string)=>weekStart(d);
export const nextMonth=(d:string)=>{const [y,m]=d.split('-').map(Number),n=new Date(y,m,1);return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;};
export const nextWeek=(d:string)=>addDays(weekStart(d),7);
export const periodItems=(s:State,scope:'week'|'month',period:string)=>(s.plan?.items??[]).filter(x=>x.scope===scope&&x.period===period);
export function addItem(s:State,scope:'week'|'month',period:string,text:string){const p=s.plan??={goals:[]};(p.items??=[]).push({id:uid(),scope,period,text,done:false});}
export function toggleItem(s:State,id:string){const it=(s.plan?.items??[]).find(x=>x.id===id);if(!it)return;it.done=!it.done;
 for(const t of s.todos??[])if(t.fromPlan===id){t.done=it.done;t.doneAt=it.done?new Date().toISOString():undefined;}
 const down=(s.plan?.items??[]).find(x=>x.id===it.sentTo);if(down)down.done=it.done;const up=(s.plan?.items??[]).find(x=>x.sentTo===id);if(up)up.done=it.done;}
// A month item moves into a week's list; a week item onto a day's to-do list, as an A task.
export function itemToWeek(s:State,id:string,week:string){const it=(s.plan?.items??[]).find(x=>x.id===id);if(!it||it.sentTo)return false;const w={id:uid(),scope:'week' as const,period:week,text:it.text,done:false};(s.plan!.items!).push(w);it.sentTo=w.id;return true;}
export function itemToDay(s:State,id:string,day:string){const it=(s.plan?.items??[]).find(x=>x.id===id);if(!it||it.done||(s.todos??[]).some(t=>t.fromPlan===id&&t.date===day))return false;
 s.todos=[...(s.todos??[]),{id:uid(),date:day,text:it.text,done:false,createdAt:new Date().toISOString(),priority:'A',fromPlan:id}];return true;}
