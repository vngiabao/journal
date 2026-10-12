import {useState} from 'react';
import {Check,Plus,X,ArrowRight} from './icons';
import type {State} from './model';
import {uid} from './model';
import {putActivity,type Mutate} from './GoalControls';
import {addDays,label} from './dates';
import {dayState} from './engine';
import {Chibi} from './Art';

// Goal 6.5 on the board: write tomorrow's to-do list every night.
export const TODO_GOAL='35';

export function TodoLetter({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const tomorrow=addDays(now,1),todos=state.todos??[];
 const todays=todos.filter(t=>t.date===now),planned=todos.filter(t=>t.date===tomorrow),unfinished=todays.filter(t=>!t.done);
 const goal=state.goals.find(g=>g.id===TODO_GOAL)!,counted=dayState(goal,state.logs,now)==='success';
 const evening=new Date().getHours()>=17;
 function add(date:string,text:string){mutate(s=>{s.todos=[...(s.todos??[]),{id:uid(),date,text,done:false,createdAt:new Date().toISOString()}];
  // Writing tomorrow's list tonight is the habit itself, so it counts for tonight.
  if(date===tomorrow){const g=s.goals.find(x=>x.id===TODO_GOAL)!;if(dayState(g,s.logs,now)!=='success')putActivity(s,g,now,{state:'success',note:'Wrote tomorrow’s to-do list'});}
 },`todo ${date}`);}
 const toggle=(id:string)=>mutate(s=>{const t=(s.todos??[]).find(x=>x.id===id);if(t)t.done=!t.done;},'todo check');
 const remove=(id:string)=>mutate(s=>{s.todos=(s.todos??[]).filter(x=>x.id!==id);},'todo remove');
 const carry=()=>mutate(s=>{for(const t of s.todos??[])if(t.date===now&&!t.done)t.date=tomorrow;const g=s.goals.find(x=>x.id===TODO_GOAL)!;if(dayState(g,s.logs,now)!=='success')putActivity(s,g,now,{state:'success',note:'Wrote tomorrow’s to-do list'});},'todo carry over');
 return <section className={`todo-letter ${evening?'is-evening':''}`}>
  <div className="todo-page">
   <p className="dateline">{label(now,{weekday:'short',month:'short',day:'numeric'}).toUpperCase()} <span>Today’s list</span></p>
   <h2>For today</h2>
   {todays.length?<ul className="todo-list">{todays.map(t=><TodoItem key={t.id} t={t} onToggle={toggle} onRemove={remove}/>)}</ul>:<div className="chibi-empty"><Chibi pose="sleep"/><p className="muted">Nothing was written for today. Tonight, write a few lines for tomorrow.</p></div>}
   <AddTodo placeholder="Add something for today" onAdd={text=>add(now,text)}/>
   {unfinished.length>0&&<button className="text-button" onClick={carry}>Move {unfinished.length} unfinished to tomorrow <ArrowRight size={15}/></button>}
  </div>
  <div className="todo-page tomorrow">
   <p className="dateline">{label(tomorrow,{weekday:'short',month:'short',day:'numeric'}).toUpperCase()} <span>Written tonight</span></p>
   <h2>Tomorrow’s list</h2>
   <p className="todo-hint">{counted?<><Check size={14}/>Counted toward “Daily to-do list for 90 days” tonight.</>:'Write it before bed. The first line you add counts toward “Daily to-do list for 90 days”.'}</p>
   {planned.length>0?<ul className="todo-list">{planned.map(t=><TodoItem key={t.id} t={t} onToggle={toggle} onRemove={remove}/>)}</ul>:<div className="chibi-empty"><Chibi pose="think"/><p className="muted">Nothing planned yet. What is the one thing tomorrow needs?</p></div>}
   <AddTodo placeholder="What will tomorrow hold?" onAdd={text=>add(tomorrow,text)}/>
  </div>
 </section>;
}

function TodoItem({t,onToggle,onRemove}:{t:NonNullable<State['todos']>[number];onToggle:(id:string)=>void;onRemove:(id:string)=>void}){
 return <li className={t.done?'done':''}><button className={`check-action ${t.done?'checked':''}`} aria-pressed={t.done} onClick={()=>onToggle(t.id)}><span className="check-box">{t.done&&<Check size={14}/>}</span><span className="todo-text">{t.text}</span></button><button className="icon-button" aria-label={`Remove “${t.text}”`} onClick={()=>onRemove(t.id)}><X size={14}/></button></li>;
}

function AddTodo({placeholder,onAdd}:{placeholder:string;onAdd:(t:string)=>void}){
 const [text,setText]=useState('');
 return <form className="todo-add" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onAdd(v);setText('');}}><input aria-label={placeholder} value={text} maxLength={140} placeholder={placeholder} onChange={e=>setText(e.target.value)}/><button className="button secondary" disabled={!text.trim()}><Plus size={15}/>Add</button></form>;
}
