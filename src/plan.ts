// Eat That Frog, chapter one ("Set the table"): decide what you want, write it down, set a deadline, list
// everything you'll need to do, organise it, and do something toward it every day. Ten goals, one chosen.
import type {State,PlanGoal,PlanStep,PlanItem} from './model';
import {uid} from './model';
import {weekStart,addDays,label} from './dates';

export const planGoals=(s:State)=>s.plan?.goals??[];
export const oneGoal=(s:State)=>planGoals(s).find(g=>g.one);
const goal=(s:State,id:string)=>(s.plan??={goals:[]}).goals.find(g=>g.id===id);

export function addGoal(s:State,text:string){const p=s.plan??={goals:[]};const g:PlanGoal={id:uid(),text,steps:[],createdAt:new Date().toISOString()};p.goals.push(g);return g;}
export function chooseOne(s:State,id:string){for(const g of s.plan?.goals??[])g.one=g.id===id?!g.one:false;}
export function addStep(s:State,goalId:string,text:string){const g=goal(s,goalId);if(!g)return undefined;const st:PlanStep={id:uid(),text,done:false};g.steps.push(st);return st;}
export function moveStep(s:State,goalId:string,stepId:string,by:number){const g=goal(s,goalId);if(!g)return;const i=g.steps.findIndex(x=>x.id===stepId),j=i+by;if(i<0||j<0||j>=g.steps.length)return;[g.steps[i],g.steps[j]]=[g.steps[j],g.steps[i]];}

// One place that keeps a step, the month and week items made from it, and its to-dos in agreement.
function setStepDone(s:State,stepId:string,done:boolean){
 const at=done?new Date().toISOString():undefined;
 for(const g of s.plan?.goals??[])for(const st of g.steps)if(st.id===stepId){st.done=done;st.doneAt=at;}
 const items=(s.plan?.items??[]).filter(x=>x.stepId===stepId);for(const it of items)it.done=done;
 const ids=new Set([stepId,...items.map(x=>x.id)]);
 for(const t of s.todos??[])if(t.fromPlan&&ids.has(t.fromPlan)&&t.done!==done){t.done=done;t.doneAt=at;}
}
export function toggleStep(s:State,goalId:string,stepId:string){const st=goal(s,goalId)?.steps.find(x=>x.id===stepId);if(!st)return;setStepDone(s,stepId,!st.done);}
// "Do something every day": a step goes onto today's list as an A task, in your own words, and stays in step with the plan.
export function stepToToday(s:State,goalId:string,stepId:string,now:string){
 const st=goal(s,goalId)?.steps.find(x=>x.id===stepId);if(!st||st.done)return false;
 if((s.todos??[]).some(t=>t.fromPlan===stepId&&t.date===now))return false;
 s.todos=[...(s.todos??[]),{id:uid(),date:now,text:st.text,done:false,createdAt:new Date().toISOString(),priority:'A',fromPlan:stepId}];return true;
}
export function syncStepFromTodo(s:State,todoId:string){const t=(s.todos??[]).find(x=>x.id===todoId);if(!t?.fromPlan)return;
 for(const g of s.plan?.goals??[]){const st=g.steps.find(x=>x.id===t.fromPlan);if(st){st.done=t.done;st.doneAt=t.done?(t.doneAt??new Date().toISOString()):undefined;}}
 for(const it of s.plan?.items??[])if(it.id===t.fromPlan){it.done=t.done;const up=(s.plan?.items??[]).find(x=>x.sentTo===it.id);if(up)up.done=t.done;if(it.stepId)setStepDone(s,it.stepId,t.done);}}
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
 const down=(s.plan?.items??[]).find(x=>x.id===it.sentTo);if(down)down.done=it.done;const up=(s.plan?.items??[]).find(x=>x.sentTo===id);if(up)up.done=it.done;
 if(it.stepId)setStepDone(s,it.stepId,it.done);}
// A month item moves into a week's list; a week item onto a day's to-do list, as an A task.
export function itemToWeek(s:State,id:string,week:string){const it=(s.plan?.items??[]).find(x=>x.id===id);if(!it||it.sentTo)return false;const w:PlanItem={id:uid(),scope:'week',period:week,text:it.text,done:false,...(it.stepId?{stepId:it.stepId,goalId:it.goalId}:{})};(s.plan!.items!).push(w);it.sentTo=w.id;return true;}
export function itemToDay(s:State,id:string,day:string){const it=(s.plan?.items??[]).find(x=>x.id===id);if(!it||it.done||(s.todos??[]).some(t=>t.fromPlan===id&&t.date===day))return false;
 s.todos=[...(s.todos??[]),{id:uid(),date:day,text:it.text,done:false,createdAt:new Date().toISOString(),priority:'A',fromPlan:id}];return true;}

// Horizon: a step can go straight into a month or a week list. It stays linked, so ticking either side ticks both.
export function stepToPeriod(s:State,goalId:string,stepId:string,scope:'week'|'month',period:string){
 const st=goal(s,goalId)?.steps.find(x=>x.id===stepId);if(!st||st.done)return false;
 if((s.plan?.items??[]).some(x=>x.stepId===stepId&&x.scope===scope&&x.period===period))return false;
 const it:PlanItem={id:uid(),scope,period,text:st.text,done:false,stepId,goalId};(s.plan!.items??=[]).push(it);return it;
}
export function reorderStep(s:State,goalId:string,from:number,to:number){const g=goal(s,goalId);if(!g||from<0||from>=g.steps.length)return;const j=Math.max(0,Math.min(g.steps.length-1,to));if(j===from)return;const [x]=g.steps.splice(from,1);g.steps.splice(j,0,x);}
export function renameStep(s:State,goalId:string,stepId:string,text:string){const st=goal(s,goalId)?.steps.find(x=>x.id===stepId);if(st&&text.trim())st.text=text.trim();}
export function setStepDue(s:State,goalId:string,stepId:string,due?:string){const st=goal(s,goalId)?.steps.find(x=>x.id===stepId);if(st){if(due)st.due=due;else delete st.due;}}
export function removeStep(s:State,goalId:string,stepId:string){const g=goal(s,goalId);if(!g)return undefined;const index=g.steps.findIndex(x=>x.id===stepId);if(index<0)return undefined;const [step]=g.steps.splice(index,1);return {step,index};}
export function restoreStep(s:State,goalId:string,step:PlanStep,index:number){const g=goal(s,goalId);if(!g||g.steps.some(x=>x.id===step.id))return;g.steps.splice(Math.min(index,g.steps.length),0,step);}
export function reachGoal(s:State,id:string,date:string){const g=goal(s,id);if(g)g.reachedAt=date;}
export function unreachGoal(s:State,id:string){const g=goal(s,id);if(g)delete g.reachedAt;}
export function linkBoard(s:State,id:string,boardId?:string){const g=goal(s,id);if(!g)return;if(boardId)g.boardGoal=boardId;else delete g.boardGoal;}
// Removing a goal hands it back, with its place, so "Undo" can put it back exactly where it was.
export function removeGoal(s:State,id:string){const p=s.plan;if(!p)return undefined;const index=p.goals.findIndex(g=>g.id===id);if(index<0)return undefined;const [g]=p.goals.splice(index,1);return {goal:g,index};}
export function restoreGoal(s:State,g:PlanGoal,index:number){const p=s.plan??={goals:[]};if(p.goals.some(x=>x.id===g.id))return;if(g.one)for(const x of p.goals)x.one=false;p.goals.splice(Math.min(index,p.goals.length),0,g);}

// Where a step sits in the chain right now: done, on today's list, in this week, in a month, past its date, or still open.
export type StepPlace='done'|'today'|'week'|'month'|'late'|'open';
function linkedTodos(s:State,stepId:string){const ids=new Set([stepId,...(s.plan?.items??[]).filter(x=>x.stepId===stepId).map(x=>x.id)]);return (s.todos??[]).filter(t=>t.fromPlan&&ids.has(t.fromPlan)&&!t.dismissed);}
export function stepPlace(s:State,step:PlanStep,now:string):StepPlace{
 if(step.done)return 'done';
 if(linkedTodos(s,step.id).some(t=>t.date===now))return 'today';
 const items=(s.plan?.items??[]).filter(x=>x.stepId===step.id&&!x.done);
 if(items.some(x=>x.scope==='week'&&x.period>=weekOf(now)))return 'week';
 if(items.some(x=>x.scope==='month'&&x.period>=monthOf(now)))return 'month';
 if(step.due&&step.due<now)return 'late';
 return 'open';
}
// The 13px tag a stone carries: "On today", "This week", "In November", "Done Oct 21".
export function stepTag(s:State,step:PlanStep,now:string){
 const place=stepPlace(s,step,now);
 if(place==='done')return step.doneAt?`Done ${label(step.doneAt.slice(0,10))}`:'Done';
 if(place==='today')return 'On today';
 if(linkedTodos(s,step.id).some(t=>!t.done&&t.date>now))return 'Tomorrow';
 const items=(s.plan?.items??[]).filter(x=>x.stepId===step.id&&!x.done);
 const week=items.filter(x=>x.scope==='week'&&x.period>=weekOf(now)).sort((a,b)=>a.period.localeCompare(b.period))[0];
 if(week)return week.period===weekOf(now)?'This week':`Week of ${label(week.period)}`;
 const month=items.filter(x=>x.scope==='month'&&x.period>=monthOf(now)).sort((a,b)=>a.period.localeCompare(b.period))[0];
 if(month)return `In ${label(`${month.period}-01`,{month:'long'})}`;
 return '';
}
export const isLate=(step:PlanStep,now:string)=>!step.done&&!!step.due&&step.due<now;
