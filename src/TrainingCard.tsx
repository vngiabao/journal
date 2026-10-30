// Today's workout from the weekly plan: tick each exercise, or the whole session at once. "See the week" shows
// all seven days; "Edit plan" changes them, one exercise per line.
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {State,TrainingDay} from './model';
import type {Mutate} from './GoalControls';
import {Check,X,PenLine,ChevronDown} from './icons';
import {addDays,weekStart} from './dates';
import {DEFAULT_PLAN,WEEKDAYS,dayPlan,doneNames,finished,isTrainingDay,planOf,setAll,toggleExercise,weekdayIndex,parseLines,formatLines} from './training';
import {inkStamp} from './delight';

export function TrainingCard({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const day=dayPlan(state,now),done=doneNames(state,now),complete=finished(state,now),[week,setWeek]=useState(false),[editing,setEditing]=useState(false);
 const ws=weekStart(now),count=day.exercises.filter(e=>done.has(e.name)).length;
 const tick=(name:string,e:React.MouseEvent<HTMLElement>)=>{if(!done.has(name)&&day.exercises.filter(x=>!done.has(x.name)).length===1){const r=e.currentTarget.getBoundingClientRect();inkStamp(Math.min(r.right-60,innerWidth-70),r.top+r.height/2,'Done');}mutate(s=>toggleExercise(s,now,name),'workout');};
 return <section className={`training ${day.kind} ${complete?'complete':''}`} aria-labelledby="training-title">
  <div className="training-head">
   <div><h2 id="training-title">{day.kind==='rest'?'Rest day':day.title}</h2><p className="training-day">{WEEKDAYS[weekdayIndex(now)]}{day.kind==='gym'?' · Gym':day.kind==='sport'?' · Sport':''}</p></div>
   {isTrainingDay(day)&&<span className="training-count">{complete?'Done':`${count} of ${day.exercises.length}`}</span>}
  </div>
  {day.kind==='rest'?<><p className="training-rest">Recovery counts. Sleep well, and come back stronger tomorrow.</p>{day.exercises.some(e=>e.dose)&&<ul className="rest-list">{day.exercises.map(e=><li key={e.name}><span>{e.name}</span>{e.dose&&<span className="exercise-dose">{e.dose}</span>}</li>)}</ul>}</>
  :<><ul className="exercise-list">{day.exercises.map(x=>{const on=done.has(x.name);return <li key={x.name} className={on?'done':''}><button type="button" className={`check-action ${on?'checked':''}`} aria-pressed={on} onClick={e=>tick(x.name,e)}><span className="check-box">{on&&<Check size={14}/>}</span><span className="exercise-name">{x.name}</span>{x.dose&&<span className="exercise-dose">{x.dose}</span>}</button></li>;})}</ul>
   {day.exercises.length>1&&<button type="button" className={complete?'text-button':'button secondary training-all'} onClick={()=>mutate(s=>setAll(s,now,!complete),'workout')}>{complete?'Undo workout':day.kind==='gym'?'Mark the whole workout done':'Mark done'}</button>}
   {day.kind==='gym'&&<p className="training-note">Finishing it counts toward “Gym 4+ times a week”.</p>}</>}
  <div className="training-foot">
   <button type="button" className="text-button" aria-expanded={week} onClick={()=>setWeek(!week)}>{week?'Hide the week':'See the week'} <ChevronDown size={14}/></button>
   <button type="button" className="text-button" onClick={()=>setEditing(true)}><PenLine size={14}/>Edit plan</button>
  </div>
  {week&&<ol className="training-week">{planOf(state).map((d,i)=>{const date=addDays(ws,i),isToday=date===now,ok=finished(state,date);return <li key={i} className={`${isToday?'today':''} ${ok?'done':''}`}><span className="tw-day">{WEEKDAYS[i].slice(0,3)}</span><span className="tw-title">{d.kind==='rest'?'Rest':d.title}</span><span className="tw-mark" aria-label={ok?'done':date<now&&isTrainingDay(d)?'not done':''}>{ok?<Check size={13}/>:null}</span></li>;})}</ol>}
  {editing&&<PlanEditor plan={planOf(state)} onSave={days=>{mutate(s=>{s.training={days};},'training plan');setEditing(false);}} onClose={()=>setEditing(false)}/>}
 </section>;
}

function PlanEditor({plan,onSave,onClose}:{plan:TrainingDay[];onSave:(d:TrainingDay[])=>void;onClose:()=>void}){
 const [days,setDays]=useState(()=>plan.map(d=>({kind:d.kind,title:d.title,text:formatLines(d)}))),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const back=document.activeElement as HTMLElement|null;document.querySelector<HTMLElement>('.plan-editor input')?.focus();const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')close.current();};window.addEventListener('keydown',esc);document.body.classList.add('drawer-open');return()=>{window.removeEventListener('keydown',esc);document.body.classList.remove('drawer-open');back?.focus?.();};},[]);
 const set=(i:number,p:Partial<typeof days[number]>)=>setDays(ds=>ds.map((d,n)=>n===i?{...d,...p}:d));
 return createPortal(<div className="drawer-root">
  <button type="button" className="drawer-scrim" aria-hidden="true" tabIndex={-1} onClick={onClose}/>
  <aside className="goal-drawer plan-editor" role="dialog" aria-modal="true" aria-labelledby="plan-title">
   <header className="drawer-head"><span className="drawer-eyebrow">Training</span><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></header>
   <h2 id="plan-title">Your training week</h2>
   <p className="muted">One exercise per line, like “Goblet squat: 3 × 8–10” or “Soccer: 90 minutes”.</p>
   {days.map((d,i)=><fieldset key={i} className="plan-day"><legend>{WEEKDAYS[i]}</legend>
    <div className="plan-row"><label>Name<input value={d.title} maxLength={40} onChange={e=>set(i,{title:e.target.value})}/></label>
     <label>Type<select value={d.kind} onChange={e=>set(i,{kind:e.target.value as TrainingDay['kind']})}><option value="gym">Gym</option><option value="sport">Sport</option><option value="rest">Rest</option></select></label></div>
    <label className="plan-lines">Exercises<textarea rows={Math.max(2,d.text.split('\n').length)} value={d.text} onChange={e=>set(i,{text:e.target.value})}/></label>
   </fieldset>)}
   <div className="plan-actions"><button type="button" className="button" onClick={()=>onSave(days.map(d=>({kind:d.kind,title:d.title.trim()||'Training',exercises:d.kind==='rest'?[{name:'Recovery',dose:''}]:parseLines(d.text)})))}>Save plan</button>
    <button type="button" className="text-button" onClick={()=>setDays(DEFAULT_PLAN.map(d=>({kind:d.kind,title:d.title,text:formatLines(d)})))}>Reset to my original plan</button></div>
  </aside>
 </div>,document.body);
}
