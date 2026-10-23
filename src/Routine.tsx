// Today's routine: the few things worth doing every day, in order, ticked off automatically when you do them.
// A weekly review joins on Friday to Sunday, a monthly one in the last days of the month. Folded, it shows
// what's next; open, the whole list with "Show me" on each.
import {useState} from 'react';
import type {State} from './model';
import {addDays,weekStart,daysBetween} from './dates';
import {dayState} from './engine';
import {showMe} from './Quests';
import {Check,ArrowRight,ChevronDown} from './icons';

type Step={id:string;title:string;page:string;target:string;done:boolean};
export function routine(s:State,now:string):Step[]{
 const todos=(s.todos??[]).filter(t=>t.date===now),frog=todos.find(t=>t.frog),tasks=todos.filter(t=>!t.frog&&!t.done);
 const entry=s.journals.find(j=>j.date===now&&j.kind==='daily'),daily=s.goals.filter(g=>g.status==='active'&&g.type==='daily');
 const dow=new Date(`${now}T12:00:00`).getDay(),[y,m]=now.split('-').map(Number),lastDay=new Date(y,m,0).getDate(),day=Number(now.slice(8)),ws=weekStart(now);
 const steps:Step[]=[
  {id:'frog',title:'Pick today’s frog',page:'Today',target:'.frog-pick, .frog-card, .today-list .todo-add',done:!!frog},
  {id:'label',title:'Label today’s tasks A to E',page:'Today',target:'.todo-list .prio-chip, .today-list .todo-add',done:todos.length>0&&tasks.every(t=>!!t.priority)},
  {id:'eat',title:'Eat your frog',page:'Today',target:'.frog-card, .frog-pick',done:!!frog?.done},
  ...(daily.length?[{id:'promises',title:'Keep today’s promises',page:'Today',target:'.promises',done:daily.every(g=>dayState(g,s.logs,now)==='success')}]:[]),
  {id:'checkin',title:'Check in: how was today?',page:'Today',target:'.checkin .mood-row',done:!!entry?.mood},
  {id:'journal',title:'Write a line in your journal',page:'Today',target:'.checkin-line, .checkin-wrote',done:!!entry?.text.trim()},
  {id:'tomorrow',title:'Choose tomorrow’s frog',page:'Today',target:'.close-day, .checkin',done:(s.todos??[]).some(t=>t.date===addDays(now,1)&&t.frog)},
 ];
 if(dow===5||dow===6||dow===0)steps.push({id:'weekly',title:'Write your weekly review',page:'Journal',target:'.room-tabs',done:s.journals.some(j=>j.kind==='weekly'&&!!j.text.trim()&&daysBetween(ws,j.date)>=0&&j.date<=addDays(ws,6))});
 if(lastDay-day<3||day===1)steps.push({id:'monthly',title:'Write your monthly review',page:'Journal',target:'.room-tabs',done:s.journals.some(j=>j.kind==='monthly'&&!!j.text.trim()&&j.date.slice(0,7)===(day===1?addDays(now,-1):now).slice(0,7))});
 return steps;
}

export function Routine({state,now,go}:{state:State;now:string;go:(p:string)=>void}){
 const steps=routine(state,now),done=steps.filter(x=>x.done).length,next=steps.find(x=>!x.done),[open,setOpen]=useState(false);
 const show=(x:Step)=>{if(x.id==='weekly'||x.id==='monthly')try{sessionStorage.setItem('reboot-journal-kind',x.id);}catch{/* fine */}showMe({id:x.id,title:x.title,how:'',page:x.page,target:x.target,done:x.done},go);};
 return <section className={`routine ${done===steps.length?'complete':''}`} aria-labelledby="routine-title">
  <div className="routine-head">
   <button type="button" className="routine-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}><h2 id="routine-title">Today’s routine</h2><span className="routine-count">{done} of {steps.length}</span><ChevronDown size={16}/></button>
   {!open&&(next?<p className="routine-next"><span>Next: <b>{next.title}</b></span><button type="button" className="text-button" onClick={()=>show(next)}>Show me <ArrowRight size={14}/></button></p>:<p className="routine-next"><b>All done for today.</b> That counts.</p>)}
  </div>
  <div className="routine-meter" aria-hidden="true"><em style={{transform:`scaleX(${done/steps.length})`}}/></div>
  {open&&<ol className="routine-list">{steps.map(x=><li key={x.id} className={x.done?'done':''}><span className="quest-check" aria-hidden="true">{x.done&&<Check size={13}/>}</span><span className="routine-title">{x.title}</span>{!x.done&&<button type="button" className="text-button" onClick={()=>show(x)} aria-label={`Show me: ${x.title}`}>Show me <ArrowRight size={14}/></button>}</li>)}</ol>}
 </section>;
}
