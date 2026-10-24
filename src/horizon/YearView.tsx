// The next twelve months: each month's list and the goal deadlines that land in it. Not a Gantt chart: no bars, no lines.
import {useState} from 'react';
import type {State,PlanGoal} from '../model';
import type {Mutate} from '../GoalControls';
import {monthOf,nextMonth,periodItems,addItem,toggleItem} from '../plan';
import {label} from '../dates';
import {Check,Plus} from '../icons';
import {dayMonthYear} from './shared';

export function YearView({state,mutate,goals,now,onOpenMonth,onSetDeadline}:{state:State;mutate:Mutate;goals:PlanGoal[];now:string;onOpenMonth:(next:boolean)=>void;onSetDeadline:(goalId:string)=>void}){
 const months:string[]=[];let m=monthOf(now);for(let i=0;i<12;i++){months.push(m);m=nextMonth(m);}
 const someday=goals.map((g,i)=>({g,i})).filter(x=>!x.g.deadline&&!x.g.reachedAt);
 return <section className="hz-year" aria-labelledby="hz-year-title">
  <h2 id="hz-year-title">The next twelve months</h2>
  {someday.length>0&&<p className="hz-someday"><span>No deadline yet:</span> {someday.map(({g,i})=><span key={g.id} className="hz-someday-item"><span className={`hz-mini-pennant ${g.one?'one':''}`} title={g.text}>{i+1}</span><button type="button" className="text-button" aria-label={`Set a deadline for goal ${i+1}: ${g.text}`} onClick={()=>onSetDeadline(g.id)}>Set one</button></span>)}</p>}
  <ol className="hz-months">{months.map((p,k)=><MonthCard key={p} period={p} current={k===0} near={k<=1} state={state} mutate={mutate} goals={goals} onOpen={()=>onOpenMonth(k===1)}/>)}</ol>
 </section>;
}

function MonthCard({period,current,near,state,mutate,goals,onOpen}:{period:string;current:boolean;near:boolean;state:State;mutate:Mutate;goals:PlanGoal[];onOpen:()=>void}){
 const items=periodItems(state,'month',period),due=goals.map((g,i)=>({g,i})).filter(x=>x.g.deadline?.slice(0,7)===period);
 const [open,setOpen]=useState(false),[text,setText]=useState(''),shown=open?items:items.slice(0,4),name=label(`${period}-01`,{month:'long'}),year=period.slice(0,4);
 return <li className={`hz-month ${current?'current':''} ${open?'open':''}`}>
  <button type="button" className="hz-month-head" aria-expanded={near?undefined:open} onClick={()=>near?onOpen():setOpen(!open)} aria-label={near?`${name}: open it in Horizon`:`${name} ${year}: ${open?'fold':'show and add to'} the list`}>
   <span className="hz-month-name">{name}</span>{period.endsWith('-01')||current?<span className="hz-month-year">{year}</span>:null}</button>
  {due.length>0&&<ul className="hz-month-due">{due.map(({g,i})=><li key={g.id} title={`${g.text} - due ${dayMonthYear(g.deadline!)}`}><span className={`hz-mini-pennant ${g.one?'one':''}`}>{i+1}</span><span>{g.text}</span></li>)}</ul>}
  {items.length>0?<ul className="hz-month-items">{shown.map(it=><li key={it.id} className={it.done?'done':''}><button type="button" className={`check-action ${it.done?'checked':''}`} aria-pressed={it.done} onClick={()=>mutate(s=>toggleItem(s,it.id),'plan list')}><span className="check-box">{it.done&&<Check size={12}/>}</span><span>{it.text}</span></button></li>)}</ul>
   :!due.length&&<p className="hz-month-empty">Nothing planned yet</p>}
  {items.length>4&&!open&&<button type="button" className="text-button hz-more" onClick={()=>setOpen(true)}>+{items.length-4} more</button>}
  {open&&<form className="hz-add-form small" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;mutate(s=>addItem(s,'month',period,v),'plan list add');setText('');}}><Plus size={14}/><input autoFocus aria-label={`Add to ${name}`} value={text} maxLength={140} placeholder="Add to the month…" onChange={e=>setText(e.target.value)}/><button className="button secondary" disabled={!text.trim()}>Add</button></form>}
 </li>;
}
