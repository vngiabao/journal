import {useLayoutEffect,useRef,useState} from 'react';
import {gsap,useGSAP,Flip,motionOK} from './motion';
import {inkStamp} from './delight';
import {Check,Plus,X,ArrowRight,PenLine,Mountains} from './icons';
import type {State} from './model';
import {uid} from './model';
import {putActivity,type Mutate} from './GoalControls';
import {addDays,label} from './dates';
import {dayState} from './engine';
import {FrogCard,FrogFocus,FrogGlyph,PriorityChip,frogStats,priorityRank} from './Frog';
import {leftovers} from './frog-rules';
import {todaysList} from './ritual/rules';
import {setAll} from './training';
import {syncStepFromTodo} from './plan';
import type {Priority} from './model';

// Goal 6.5 on the board: write a to-do list every day.
export const TODO_GOAL='35';

// Today's list: the frog first, on its own, then the list you work through. Once the day is closed the counts go
// quiet: what's done stays ticked, and nothing tallies what wasn't. A task written again for tomorrow or let go in the
// evening is settled: it leaves today's list and is named once, in one quiet line.
export function TodayList({state,mutate,now,closed=false}:{state:State;mutate:Mutate;now:string;closed?:boolean}){
 const {open:todays,settled,again,dropped}=todaysList(state,now,closed),done=todays.filter(t=>t.done).length,unfinished=todays.length-done;
 const frog=todays.find(t=>t.frog),rest=todays.filter(t=>!t.frog),ordered=[...rest].sort((a,b)=>priorityRank(a)-priorityRank(b));
 const undone=ordered.filter(t=>!t.done),finished=ordered.filter(t=>t.done),[showAll,setShowAll]=useState(false);
 // The next three tasks are what you see, then everything you've finished; the rest of today folds away until asked for.
 const visible=[...(showAll||undone.length<=8?undone:undone.slice(0,7)),...finished],hidden=undone.length-(showAll||undone.length<=8?undone.length:7);
 const fs=frogStats(state.todos??[],now),[focus,setFocus]=useState(false),[nudge,setNudge]=useState(''),nudgeTimer=useRef(0);
  // One list, with a switch for adding to tomorrow. Tomorrow's tasks fold under the list and become today's at midnight.
 const tomorrow=addDays(now,1),later=(state.todos??[]).filter(t=>t.date===tomorrow&&!t.routine&&!t.auto),[addFor,setAddFor]=useState<'today'|'tomorrow'>('today'),[showLater,setShowLater]=useState(false);
 function add(text:string){const date=addFor==='tomorrow'?tomorrow:now;mutate(s=>{s.todos=[...(s.todos??[]),{id:uid(),date,text,done:false,createdAt:new Date().toISOString()}];
  // Writing the day's list is the habit itself, so the first line for today counts.
  const g=s.goals.find(x=>x.id===TODO_GOAL)!;if(date===now&&dayState(g,s.logs,now)!=='success')putActivity(s,g,now,{state:'success',note:'Wrote today’s to-do list'});
 },`todo ${date}`);if(date===tomorrow)setShowLater(true);}
 const moveToToday=(id:string)=>mutate(s=>{const t=(s.todos??[]).find(x=>x.id===id);if(t){t.date=now;t.frog=false;}},'todo move to today');
 const card=useRef<HTMLElement>(null),flip=useRef<{state:Flip.FlipState;id:string;kind?:'priority'}|null>(null),prevAll=useRef(todays.length>0&&!unfinished);
 // Capture the list before a check, so the item can glide to its new place after React re-renders.
 const toggle=(id:string,e?:React.MouseEvent<HTMLElement>)=>{const item=todays.find(x=>x.id===id);
  if(item&&!item.done&&(item.priority==='B'||item.priority==='C')){const waiting=frog&&!frog.done?'Your frog':todays.some(x=>!x.done&&x.priority==='A'&&x.id!==id)?'An A task':'';if(waiting){setNudge(`${waiting} is still waiting. Done is done, but next time, A before ${item.priority}.`);clearTimeout(nudgeTimer.current);nudgeTimer.current=window.setTimeout(()=>setNudge(''),6000);}}if(item&&!item.done&&e&&todays.filter(x=>!x.done&&!x.routine).length===1){const r=(e.currentTarget.closest('li')??e.currentTarget).getBoundingClientRect();inkStamp(r.right-78,r.top+r.height/2,'Clear');}if(motionOK()&&card.current)flip.current={state:Flip.getState(card.current.querySelectorAll('.todo-list li')),id};mutate(s=>{const t=(s.todos??[]).find(x=>x.id===id);if(!t)return;if(t.auto==='workout'){setAll(s,t.date,!t.done);return;}t.done=!t.done;t.doneAt=t.done?new Date().toISOString():undefined;syncStepFromTodo(s,t.id);},'todo check');};
 // Labelling a task re-sorts the list A to E; the task glides to its new place so you can see it move.
 const setPriority=(id:string,p?:Priority)=>{if(motionOK()&&card.current)flip.current={state:Flip.getState(card.current.querySelectorAll('.todo-list li')),id,kind:'priority'};mutate(s=>{const t=(s.todos??[]).find(x=>x.id===id);if(t)t.priority=p;},'todo priority');};
 const makeFrog=(id:string)=>mutate(s=>{for(const t of s.todos??[])if(t.date===now)t.frog=t.id===id?true:false;const t=(s.todos??[]).find(x=>x.id===id);if(t)t.priority='A';},'frog chosen');
 const {contextSafe}=useGSAP({scope:card});
 // A clean sweep: gold paper bursts out of the score.
 const burst=contextSafe(()=>{const head=card.current?.querySelector('.tl-score');if(!head)return;const r=head.getBoundingClientRect();
  for(let i=0;i<34;i++){const bit=document.createElement('i');bit.className=`confetti c${i%4}`;bit.style.left=`${r.left+r.width/2}px`;bit.style.top=`${r.top+r.height/2}px`;document.body.appendChild(bit);
   gsap.timeline({onComplete:()=>bit.remove()}).to(bit,{x:gsap.utils.random(-320,140),y:gsap.utils.random(-240,-40),rotation:gsap.utils.random(-540,540),duration:gsap.utils.random(.5,.8),ease:'power3.out'}).to(bit,{y:'+=260',opacity:0,rotationX:gsap.utils.random(180,720),duration:gsap.utils.random(.9,1.4),ease:'power1.in'});}
 });
 useLayoutEffect(()=>{const all=todays.length>0&&!unfinished;if(all&&!prevAll.current&&motionOK())burst();prevAll.current=all;},[todays.length,unfinished]);
 useLayoutEffect(()=>{const f=flip.current;if(!f||!card.current)return;flip.current=null;
  Flip.from(f.state,{duration:.3,ease:'move',nested:true,targets:card.current.querySelectorAll('.todo-list li')});
  const box=card.current.querySelector(`[data-flip-id="${f.id}"] ${f.kind==='priority'?'.prio-chip':'.check-box'}`);if(box)gsap.fromTo(box,{scale:.85},{scale:1,duration:.18,ease:'enter'});
  if(f.kind==='priority')return;
 });
 // Routine tasks are hidden for the day rather than deleted, so they don't come straight back.
 const remove=(id:string)=>mutate(s=>{const t=(s.todos??[]).find(x=>x.id===id);if(t?.routine){t.dismissed=true;return;}s.todos=(s.todos??[]).filter(x=>x.id!==id);},'todo remove');
 // The frog leads the page on its own card; the list follows. After the day is closed, only an eaten frog stays up.
 const frogBlock=frog&&(!closed||frog.done)?<FrogCard frog={frog} mutate={mutate} now={now} onFocus={()=>setFocus(true)}/>
  :!closed&&new Date().getHours()<17&&rest.some(x=>!x.done&&!x.routine&&!x.auto)?<div className="frog-pick"><FrogGlyph/><div><p><b>Pick today’s frog.</b> The task you’d most like to put off. You’ll do it first.</p><div className="frog-choices">{rest.filter(x=>!x.done&&!x.routine&&!x.auto&&x.priority!=='D'&&x.priority!=='E').map(x=><button key={x.id} type="button" className="frog-choice" aria-label={`Make “${x.text}” my frog`} onClick={()=>makeFrog(x.id)}>{x.text}</button>)}</div></div></div>:null;
 return <>{frogBlock}<section ref={card} className={`today-list ${closed?'is-closed':''}`} aria-labelledby="today-list-title">
  {/* One slim band: the title and a quiet count. The day's line lives beside the list, so the list starts high. */}
  <header className="tl-head tl-slim">
   <h2 id="today-list-title">For today</h2>
   <div className="tl-score">
    {!closed&&todays.length>0&&<><p><strong>{done}</strong><span>/{todays.length}</span><small>{!unfinished?'all done':'done'}</small></p>
    <i aria-hidden="true"><b style={{transform:`scaleX(${done/todays.length})`}}/></i></>}
    {fs.eaten>0&&<p className="frog-streak"><FrogGlyph/>{fs.streak>1?`${fs.streak}-day frog streak`:`${fs.eaten} ${fs.eaten===1?'frog':'frogs'} eaten`}</p>}
   </div>
  </header>
  <div className="tl-body">
   <AddTodo label={addFor==='today'?'Add something for today':'Add something for tomorrow'} placeholder={addFor==='tomorrow'?'Add something for tomorrow':todays.length?'Add something for today':'Start with your frog: the task you’d most like to put off'} onAdd={add} when={addFor} onWhen={setAddFor}/>
   <div role="status" className="abc-live">{nudge&&<p className="abc-nudge">{nudge}</p>}</div>
   {ordered.length?<><ul className="todo-list big">{visible.map(t=><TodoItem key={t.id} t={t} onToggle={toggle} onRemove={remove} onPriority={p=>setPriority(t.id,p)}/>)}</ul>
   {(hidden>0||(showAll&&undone.length>8))&&<div className="list-folds">{hidden>0&&<button type="button" className="text-button" onClick={()=>setShowAll(true)}>Also today ({hidden})</button>}{showAll&&undone.length>8&&<button type="button" className="text-button" onClick={()=>setShowAll(false)}>Show fewer</button>}</div>}</>:!frog&&<p className="tl-empty">Nothing on the list yet. What would make today a good day?</p>}
   {focus&&frog&&<FrogFocus frog={frog} mutate={mutate} onClose={()=>setFocus(false)}/>}
   {settled.length>0&&<p className="tl-settled"><Check size={16}/>Settled tonight: {[again&&`${again} written for tomorrow`,dropped&&`${dropped} let go`].filter(Boolean).join(', ')}.</p>}
   {later.length>0&&<button type="button" className="text-button later-toggle" aria-expanded={showLater} onClick={()=>setShowLater(!showLater)}>{showLater?'Hide tomorrow':`Tomorrow (${later.length})`}</button>}
   {showLater&&later.length>0&&<ul className="later-list" aria-label="Tomorrow">{later.map(t=><li key={t.id}>{t.frog&&<FrogGlyph/>}<span>{t.text}</span><button type="button" className="text-button" onClick={()=>moveToToday(t.id)}>Do today</button><button type="button" className="icon-button" aria-label={`Remove “${t.text}”`} onClick={()=>remove(t.id)}><X size={14}/></button></li>)}</ul>}
   <Rewrite state={state} mutate={mutate} now={now}/>
  </div>
 </section></>;
}

function TodoItem({t,onToggle,onRemove,onPriority}:{t:NonNullable<State['todos']>[number];onToggle:(id:string,e?:React.MouseEvent<HTMLElement>)=>void;onRemove:(id:string)=>void;onPriority:(p?:Priority)=>void}){
 return <li className={`${t.done?'done':''} ${t.priority?`is-${t.priority}`:''}`} data-flip-id={t.id}>{!t.done&&<PriorityChip t={t} onSet={onPriority}/>}<button className={`check-action ${t.done?'checked':''}`} aria-pressed={t.done} onClick={e=>onToggle(t.id,e)}><span className="check-box">{t.done&&<Check size={16}/>}</span><span className="todo-text">{t.text}{(t.routine||t.auto||t.fromPlan)&&<small className="todo-tag auto">{t.fromPlan?<><Mountains size={13}/> from your horizon</>:t.auto?'from your training':'ticks itself'}</small>}{t.priority==='D'&&<small className="todo-tag">hand it off</small>}{t.priority==='E'&&<small className="todo-tag">let it go</small>}</span></button><button className="icon-button" aria-label={`Remove “${t.text}”`} onClick={()=>onRemove(t.id)}><X size={14}/></button></li>;
}

function AddTodo({label,placeholder,onAdd,when,onWhen}:{label:string;placeholder:string;onAdd:(t:string)=>void;when:'today'|'tomorrow';onWhen:(w:'today'|'tomorrow')=>void}){
 const [text,setText]=useState('');
 return <form className="todo-add" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onAdd(v);setText('');}}><Plus size={20}/><input aria-label={label} value={text} maxLength={140} placeholder={placeholder} onChange={e=>setText(e.target.value)}/><span className="add-when" role="radiogroup" aria-label="Add to">{(['today','tomorrow'] as const).map(w=><button key={w} type="button" role="radio" aria-checked={when===w} className={when===w?'selected':''} onClick={()=>onWhen(w)}>{w==='today'?'Today':'Tomorrow'}</button>)}</span><button className="button" disabled={!text.trim()}>Add</button></form>;
}

// A line to start the day, beside the list. Until you write a new one, the last one stays up.
export function MorningQuote({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const quotes=state.quotes??[],todays=quotes.find(q=>q.date===now),shown=todays??[...quotes].filter(q=>q.date<now).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const [editing,setEditing]=useState(false),[text,setText]=useState('');
 function save(){const v=text.trim().replace(/^["“”]+|["“”]+$/g,'').trim();mutate(s=>{const rest=(s.quotes??[]).filter(q=>q.date!==now);s.quotes=v?[...rest,{id:todays?.id??uid(),date:now,text:v}]:rest;},'morning quote');setEditing(false);}
 if(editing)return <form className="day-quote-edit" onSubmit={e=>{e.preventDefault();save();}}><textarea aria-label="Today’s line" autoFocus value={text} maxLength={220} rows={3} placeholder="Winners don’t make excuses when the other side is playing the game." onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();save();}if(e.key==='Escape')setEditing(false);}}/><div><button className="button secondary">Write it up</button><button type="button" className="text-button" onClick={()=>setEditing(false)}>Cancel</button></div></form>;
 return <figure className={`day-quote ${shown?'':'empty'}`}>
  {shown?<blockquote>{shown.text}</blockquote>:<p>A line to start the day?</p>}
  <figcaption>{shown&&!todays&&<span>From {label(shown.date,{month:'short',day:'numeric'})}</span>}<button className="text-button" onClick={()=>{setText(todays?.text??'');setEditing(true);}}><PenLine size={14}/>{todays?'Rewrite':shown?'Write today’s line':'Write a line'}</button></figcaption>
 </figure>;
}

// Rewrite, don't carry: unfinished tasks from a day whose evening was skipped wait here, folded under the list, until
// you type each one again into today or let it go. The evening check-in normally settles them, so this is rare.
function Rewrite({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const left=leftovers(state.todos??[],now),[open,setOpen]=useState(false);
 if(!left.length)return null;
 const yesterday=addDays(now,-1),from=left.every(t=>t.date===yesterday)?'yesterday':'earlier days';
 return <section className={`rewrite quiet ${open?'open':''}`} aria-label={`Left from ${from}`}>
  <button type="button" className="text-button rewrite-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?`Hide what’s left from ${from}`:`Left from ${from} (${left.length})`}</button>
  {open&&<><p>Unfinished tasks don’t move by themselves. Type the ones that still matter into today, in your own words, or let them go.</p>
  <ul>{left.map(t=><RewriteRow key={t.id} t={t} now={now} showDate={from!=='yesterday'} mutate={mutate}/>)}</ul></>}
 </section>;
}
function RewriteRow({t,now,showDate,mutate}:{t:NonNullable<State['todos']>[number];now:string;showDate:boolean;mutate:Mutate}){
 const [text,setText]=useState('');
 const settle=(how:'rewritten'|'dropped')=>mutate(s=>{const o=(s.todos??[]).find(x=>x.id===t.id);if(!o)return;o.carried=how;o.carriedOn=now;
  if(how==='rewritten'){s.todos=[...(s.todos??[]),{id:uid(),date:now,text:text.trim(),done:false,createdAt:new Date().toISOString()}];const g=s.goals.find(x=>x.id===TODO_GOAL)!;if(dayState(g,s.logs,now)!=='success')putActivity(s,g,now,{state:'success',note:'Wrote today’s to-do list'});}},how==='rewritten'?'todo rewrite':'todo let go');
 return <li className="rewrite-row"><p className="rewrite-was">{t.frog&&<FrogGlyph/>}<span>{t.text}</span>{showDate&&<small>{label(t.date,{weekday:'short',month:'short',day:'numeric'})}</small>}</p>
  <form onSubmit={e=>{e.preventDefault();if(text.trim())settle('rewritten');}}><input aria-label={`Rewrite “${t.text}”`} value={text} maxLength={140} placeholder="Write it again for today" onChange={e=>setText(e.target.value)}/><button className="button" disabled={!text.trim()}>Add to today</button><button type="button" className="text-button" onClick={()=>settle('dropped')}>Let it go</button></form>
 </li>;
}
