import {useLayoutEffect,useRef,useState} from 'react';
import {gsap,useGSAP,Flip,motionOK} from './motion';
import {inkStamp} from './delight';
import {Check,Plus,X,ArrowRight,PenLine} from './icons';
import type {State} from './model';
import {uid} from './model';
import {putActivity,type Mutate} from './GoalControls';
import {addDays,label} from './dates';
import {dayState} from './engine';
import {Chibi} from './Art';
import {FrogCard,FrogFocus,FrogGlyph,PriorityChip,TomorrowFrog,frogStats,priorityRank} from './Frog';
import type {Priority} from './model';

// Goal 6.5 on the board: write a to-do list every day.
export const TODO_GOAL='35';

// Today's list: the featured card under the greeting. The day's line and progress up top, then a big list you can work through.
export function TodayList({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const todays=(state.todos??[]).filter(t=>t.date===now),done=todays.filter(t=>t.done).length,unfinished=todays.length-done;
 const frog=todays.find(t=>t.frog),rest=todays.filter(t=>!t.frog),ordered=[...rest].sort((a,b)=>priorityRank(a)-priorityRank(b));
 const fs=frogStats(state.todos??[],now),[focus,setFocus]=useState(false),[nudge,setNudge]=useState(''),nudgeTimer=useRef(0);
 const goal=state.goals.find(g=>g.id===TODO_GOAL)!,counted=dayState(goal,state.logs,now)==='success';
 function add(text:string){mutate(s=>{s.todos=[...(s.todos??[]),{id:uid(),date:now,text,done:false,createdAt:new Date().toISOString()}];
  // Writing the day's list is the habit itself, so the first line counts for today.
  const g=s.goals.find(x=>x.id===TODO_GOAL)!;if(dayState(g,s.logs,now)!=='success')putActivity(s,g,now,{state:'success',note:'Wrote today’s to-do list'});
 },`todo ${now}`);}
 const card=useRef<HTMLElement>(null),flip=useRef<{state:Flip.FlipState;id:string}|null>(null),prevAll=useRef(todays.length>0&&!unfinished);
 // Capture the list before a check, so the item can glide to its new place after React re-renders.
 const toggle=(id:string,e?:React.MouseEvent<HTMLElement>)=>{const item=todays.find(x=>x.id===id);
  if(item&&!item.done&&(item.priority==='B'||item.priority==='C')){const waiting=frog&&!frog.done?'Your frog':todays.some(x=>!x.done&&x.priority==='A'&&x.id!==id)?'An A task':'';if(waiting){setNudge(`${waiting} is still waiting. Done is done, but next time, A before ${item.priority}.`);clearTimeout(nudgeTimer.current);nudgeTimer.current=window.setTimeout(()=>setNudge(''),6000);}}if(item&&!item.done&&e){const r=e.currentTarget.querySelector('.check-box')?.getBoundingClientRect();inkStamp(e.clientX||((r?.left??0)+60),e.clientY||(r?.top??0)+(r?.height??0)/2);}if(motionOK()&&card.current)flip.current={state:Flip.getState(card.current.querySelectorAll('.todo-list li')),id};mutate(s=>{const t=(s.todos??[]).find(x=>x.id===id);if(t){t.done=!t.done;t.doneAt=t.done?new Date().toISOString():undefined;}},'todo check');};
 const setPriority=(id:string,p?:Priority)=>mutate(s=>{const t=(s.todos??[]).find(x=>x.id===id);if(t)t.priority=p;},'todo priority');
 const makeFrog=(id:string)=>mutate(s=>{for(const t of s.todos??[])if(t.date===now)t.frog=t.id===id?true:false;const t=(s.todos??[]).find(x=>x.id===id);if(t)t.priority='A';},'frog chosen');
 const {contextSafe}=useGSAP({scope:card});
 // A clean sweep: gold paper bursts out of the score.
 const burst=contextSafe(()=>{const head=card.current?.querySelector('.tl-score');if(!head)return;const r=head.getBoundingClientRect();
  for(let i=0;i<34;i++){const bit=document.createElement('i');bit.className=`confetti c${i%4}`;bit.style.left=`${r.left+r.width/2}px`;bit.style.top=`${r.top+r.height/2}px`;document.body.appendChild(bit);
   gsap.timeline({onComplete:()=>bit.remove()}).to(bit,{x:gsap.utils.random(-320,140),y:gsap.utils.random(-240,-40),rotation:gsap.utils.random(-540,540),duration:gsap.utils.random(.5,.8),ease:'power3.out'}).to(bit,{y:'+=260',opacity:0,rotationX:gsap.utils.random(180,720),duration:gsap.utils.random(.9,1.4),ease:'power1.in'});}
 });
 useLayoutEffect(()=>{const all=todays.length>0&&!unfinished;if(all&&!prevAll.current&&motionOK())burst();prevAll.current=all;},[todays.length,unfinished]);
 useLayoutEffect(()=>{const f=flip.current;if(!f||!card.current)return;flip.current=null;
  Flip.from(f.state,{duration:.5,ease:'power2.inOut',nested:true,targets:card.current.querySelectorAll('.todo-list li')});
  const box=card.current.querySelector(`[data-flip-id="${f.id}"] .check-box`);if(box)gsap.fromTo(box,{scale:.5},{scale:1,duration:.45,ease:'back.out(3)'});
  const score=card.current.querySelector('.tl-score strong');if(score)gsap.fromTo(score,{yPercent:-45,opacity:0},{yPercent:0,opacity:1,duration:.4,ease:'back.out(2)'});
 });
 const remove=(id:string)=>mutate(s=>{s.todos=(s.todos??[]).filter(x=>x.id!==id);},'todo remove');
 const carry=()=>mutate(s=>{const tomorrow=addDays(now,1);for(const t of s.todos??[])if(t.date===now&&!t.done)t.date=tomorrow;},'todo carry over');
 return <section ref={card} className="today-list" aria-labelledby="today-list-title">
  <header className="tl-head">
   <div className="tl-title">
    <p className="dateline">{label(now,{weekday:'long',month:'long',day:'numeric'}).toUpperCase()}</p>
    <h2 id="today-list-title">For today</h2>
    <MorningQuote state={state} mutate={mutate} now={now}/>
   </div>
   <div className="tl-score">
    <Chibi pose={todays.length&&!unfinished?'check':'think'} className="tl-chibi"/>
    <p><strong>{done}</strong><span>/{todays.length}</span><small>{todays.length&&!unfinished?'all done':'done'}</small></p>
    <i aria-hidden="true"><b style={{transform:`scaleX(${todays.length?done/todays.length:0})`}}/></i>
    {fs.eaten>0&&<p className="frog-streak"><FrogGlyph/>{fs.streak>1?`${fs.streak}-day frog streak`:`${fs.eaten} ${fs.eaten===1?'frog':'frogs'} eaten`}{fs.early>0&&<small>{fs.early} before noon</small>}</p>}
   </div>
  </header>
  <div className="tl-body">
   {frog?<FrogCard frog={frog} mutate={mutate} now={now} onFocus={()=>setFocus(true)}/>:rest.some(x=>!x.done)?<p className="frog-pick"><FrogGlyph/><span><b>Which one is your frog?</b> The task you’d most like to put off. Tap its frog to eat it first.</span></p>:null}
   <AddTodo label="Add something for today" placeholder={todays.length?'Add something for today':'Start with your frog: the task you’d most like to put off'} onAdd={add}/>
   {nudge&&<p className="abc-nudge" role="status">{nudge}</p>}
   {ordered.length?<ul className="todo-list big">{ordered.map(t=><TodoItem key={t.id} t={t} onToggle={toggle} onRemove={remove} onPriority={p=>setPriority(t.id,p)} onFrog={frog?undefined:()=>makeFrog(t.id)}/>)}</ul>:!frog&&<p className="tl-empty">Nothing on the list yet. What would make today a good day?</p>}
   {focus&&frog&&<FrogFocus frog={frog} mutate={mutate} onClose={()=>setFocus(false)}/>}
   <div className="tl-foot"><p className="todo-hint">{counted?<><Check size={14}/>Counted toward “Daily to-do list for 90 days”.</>:'Your first item today counts toward “Daily to-do list for 90 days”.'}</p>{unfinished>0&&<button className="text-button" onClick={carry}>Move {unfinished} unfinished to tomorrow <ArrowRight size={15}/></button>}</div>
   <TomorrowFrog state={state} mutate={mutate} now={now}/>
  </div>
 </section>;
}

function TodoItem({t,onToggle,onRemove,onPriority,onFrog}:{t:NonNullable<State['todos']>[number];onToggle:(id:string,e?:React.MouseEvent<HTMLElement>)=>void;onRemove:(id:string)=>void;onPriority:(p?:Priority)=>void;onFrog?:()=>void}){
 return <li className={`${t.done?'done':''} ${t.priority?`is-${t.priority}`:''}`} data-flip-id={t.id}>{!t.done&&<PriorityChip t={t} onSet={onPriority}/>}<button className={`check-action ${t.done?'checked':''}`} aria-pressed={t.done} onClick={e=>onToggle(t.id,e)}><span className="check-box">{t.done&&<Check size={16}/>}</span><span className="todo-text">{t.text}{t.priority==='D'&&<small className="todo-tag">hand it off</small>}{t.priority==='E'&&<small className="todo-tag">let it go</small>}</span></button>{onFrog&&!t.done&&t.priority!=='D'&&t.priority!=='E'&&<button className="icon-button frog-btn" aria-label={`Make “${t.text}” my frog`} title="Make this my frog" onClick={onFrog}><FrogGlyph/></button>}<button className="icon-button" aria-label={`Remove “${t.text}”`} onClick={()=>onRemove(t.id)}><X size={14}/></button></li>;
}

function AddTodo({label,placeholder,onAdd}:{label:string;placeholder:string;onAdd:(t:string)=>void}){
 const [text,setText]=useState('');
 return <form className="todo-add" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onAdd(v);setText('');}}><Plus size={20}/><input aria-label={label} value={text} maxLength={140} placeholder={placeholder} onChange={e=>setText(e.target.value)}/><button className="button" disabled={!text.trim()}>Add</button></form>;
}

// A line to start the day, above the list. Until you write a new one, the last one stays up.
function MorningQuote({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const quotes=state.quotes??[],todays=quotes.find(q=>q.date===now),shown=todays??[...quotes].filter(q=>q.date<now).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const [editing,setEditing]=useState(false),[text,setText]=useState('');
 function save(){const v=text.trim().replace(/^["“”]+|["“”]+$/g,'').trim();mutate(s=>{const rest=(s.quotes??[]).filter(q=>q.date!==now);s.quotes=v?[...rest,{id:todays?.id??uid(),date:now,text:v}]:rest;},'morning quote');setEditing(false);}
 if(editing)return <form className="day-quote-edit" onSubmit={e=>{e.preventDefault();save();}}><textarea aria-label="Today’s line" autoFocus value={text} maxLength={220} rows={3} placeholder="Winners don’t make excuses when the other side is playing the game." onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();save();}if(e.key==='Escape')setEditing(false);}}/><div><button className="button secondary">Write it up</button><button type="button" className="text-button" onClick={()=>setEditing(false)}>Cancel</button></div></form>;
 return <figure className={`day-quote ${shown?'':'empty'}`}>
  {shown?<blockquote>{shown.text}</blockquote>:<p>A line to start the day?</p>}
  <figcaption>{shown&&!todays&&<span>Still up from {label(shown.date,{month:'short',day:'numeric'})}</span>}<button className="text-button" onClick={()=>{setText(todays?.text??'');setEditing(true);}}><PenLine size={14}/>{todays?'Rewrite':shown?'Write today’s line':'Write a line'}</button></figcaption>
 </figure>;
}
