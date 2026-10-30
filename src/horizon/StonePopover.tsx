// What you can do with one step (from the map or an area sheet): send it down the chain (today, this week, this month), finish it, move it, or edit it.
import {useState} from 'react';
import type {State,PlanGoal,PlanStep} from '../model';
import {Popover} from './shared';
import {stepPlace,stepTag} from '../plan';
import {Check,ArrowRight,ChevronUp,ChevronDown,PenLine,CalendarDays,Trash2,X} from '../icons';

export type StoneAction='today'|'week'|'month'|'done'|'earlier'|'later'|'remove';
export function StonePopover({state,goal,step,now,anchor,evening,onAction,onRename,onDue,onClose}:{state:State;goal:PlanGoal;step:PlanStep;now:string;anchor:Element|null;evening:boolean;
 onAction:(a:StoneAction,anchor:Element|null)=>void;onRename:(t:string)=>void;onDue:(d?:string)=>void;onClose:()=>void}){
 const [mode,setMode]=useState<'menu'|'edit'|'date'>('menu'),[text,setText]=useState(step.text),[due,setDue]=useState(step.due??'');
 const i=goal.steps.findIndex(x=>x.id===step.id),place=stepPlace(state,step,now),tag=stepTag(state,step,now);
 const act=(a:StoneAction)=>(e:React.MouseEvent<HTMLButtonElement>)=>onAction(a,e.currentTarget);
 return <Popover anchor={anchor} onClose={onClose} label={`Step ${i+1}: ${step.text}`} className="hz-stone-pop" width={300}>
  <header className="hz-pop-head"><h3>{step.text}</h3><p className="hz-pop-tag">Step {i+1} of {goal.steps.length}{tag?` · ${tag}`:place==='late'?' · past its date':''}</p>
   <button type="button" className="icon-button hz-pop-close" aria-label="Close" onClick={onClose}><X size={18}/></button></header>
  {mode==='menu'&&<div className="hz-pop-menu" role="group" aria-label="Step actions">
   {!step.done&&<><button type="button" disabled={place==='today'} onClick={act('today')}><ArrowRight size={16}/>{evening?'Do tomorrow':'Do today'}</button>
    <button type="button" disabled={place==='week'||place==='today'} onClick={act('week')}><ArrowRight size={16}/>This week</button>
    <button type="button" disabled={place==='month'||place==='week'||place==='today'} onClick={act('month')}><ArrowRight size={16}/>This month</button></>}
   <button type="button" onClick={act('done')}><Check size={16}/>{step.done?'Mark not done':'Mark done'}</button>
   <hr/>
   <button type="button" disabled={i<=0} onClick={act('earlier')}><ChevronUp size={16}/>Move earlier</button>
   <button type="button" disabled={i>=goal.steps.length-1} onClick={act('later')}><ChevronDown size={16}/>Move later</button>
   <button type="button" onClick={()=>setMode('edit')}><PenLine size={16}/>Edit</button>
   <button type="button" onClick={()=>setMode('date')}><CalendarDays size={16}/>{step.due?'Change the date':'Set a date'}</button>
   <button type="button" className="danger" onClick={act('remove')}><Trash2 size={16}/>Remove</button>
  </div>}
  {mode==='edit'&&<form className="hz-pop-form" onSubmit={e=>{e.preventDefault();if(text.trim()){onRename(text.trim());onClose();}}}>
   <label>Step<input autoFocus value={text} maxLength={140} onChange={e=>setText(e.target.value)}/></label>
   {text.length>=140&&<small>Keep it under 140 characters.</small>}
   <div className="hz-pop-buttons"><button type="button" className="text-button" onClick={()=>setMode('menu')}>Back</button><button className="button" disabled={!text.trim()}>Save</button></div>
  </form>}
  {mode==='date'&&<form className="hz-pop-form" onSubmit={e=>{e.preventDefault();onDue(due||undefined);onClose();}}>
   <label>Do it by<input autoFocus type="date" value={due} onChange={e=>setDue(e.target.value)}/></label>
   <div className="hz-pop-buttons">{step.due&&<button type="button" className="text-button" onClick={()=>{onDue(undefined);onClose();}}>Clear the date</button>}<button type="button" className="text-button" onClick={()=>setMode('menu')}>Back</button><button className="button">Save</button></div>
  </form>}
 </Popover>;
}
