import {useEffect,useRef,useState} from 'react';
import {gsap,useGSAP,whenMotionOK} from './motion';
import {ArrowRight,Pin,PenLine} from './icons';
import type {State,Goal} from './model';
import {label,daysBetween,weekStart} from './dates';
import {stats,criteriaAt,dayState} from './engine';
import {goalName} from './Board';
import {GoalControls,type Mutate} from './GoalControls';
import {TodayList} from './Todo';
import {DailyTicks} from './Guide';
import {TrainingCard} from './TrainingCard';
import {needsWorkoutTask,ensureWorkoutTask,dayPlan,isTrainingDay} from './training';
import {BondJourney} from './bond';
import {RitualCard,RitualNote} from './ritual/Ritual';
import {activeRitual} from './ritual/rules';

// Today is a two-minute ritual, then the day itself. Before 5 pm the morning card asks three short questions (your
// frog, today's three, go); from 5 pm the evening card closes the day. Once a ritual is done, Today is the doing view:
// the frog, the rest of the list, the gym session and your daily promises. Nothing else asks for attention.
export function Today({state,mutate,now,go}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void}){
 const active=state.goals.filter(g=>g.status==='active').sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.priority-b.priority);
 // On gym days the session joins the to-do list as a task, kept ticked as you go.
 useEffect(()=>{if(needsWorkoutTask(state,now))mutate(s=>{ensureWorkoutTask(s,now);},'workout task');},[now]);
 const hour=new Date().getHours(),ritual=activeRitual(state,now,hour);
 // Skipping a check-in hides it for this visit only; it never counts as showing up, and it never nags.
 // Morning and evening are skipped separately, so skipping the morning doesn't hide the evening.
 const skipKey=`reboot-ritual-skip-${now}-${ritual??'none'}`,[skips,setSkips]=useState<Record<string,boolean>>({});
 const skipped=ritual?skips[skipKey]??(()=>{try{return sessionStorage.getItem(skipKey)==='1';}catch{return false;}})():false;
 const skip=(v:boolean)=>{setSkips(m=>({...m,[skipKey]:v}));try{if(v)sessionStorage.setItem(skipKey,'1');else sessionStorage.removeItem(skipKey);}catch{/* private mode */}};
 // While a check-in card shows, it is the whole page: a quiet header, Bond on one line, the card, a way out.
 const showCard=!!ritual&&!skipped,closed=!!(state.rituals??[]).find(r=>r.date===now)?.evening;
 // The doing view rises in once, right after a ritual finishes, from the top, so the frog is on the first screen.
 const [arrived,setArrived]=useState(0),doing=useRef<HTMLDivElement>(null);
 const done=()=>{setArrived(n=>n+1);window.scrollTo({top:0,behavior:'auto'});};
 useGSAP(()=>{if(!arrived)return;const mm=whenMotionOK(()=>{gsap.from('.today-do > *, .today-side > *',{opacity:0,y:12,duration:.28,ease:'enter',stagger:.05,clearProps:'opacity,transform'});});return()=>mm.revert();},{dependencies:[arrived],scope:doing,revertOnUpdate:true});
 const gym=isTrainingDay(dayPlan(state,now));
 return <div className={`today-page ${showCard?'has-ritual ritual-only':''} ${closed?'day-closed':''}`}>
  <header className="today-top today-head">
   <div className="tt-line"><p className="dateline">{label(now,{weekday:'long',month:'long',day:'numeric'}).toUpperCase()}</p><h1 className="tt-greet">{greeting(state.settings.name)}.</h1></div>
   <Identity state={state} mutate={mutate}/>
  </header>
  <BondJourney state={state} mutate={mutate} now={now} size={showCard?'line':'strip'}/>
  {showCard&&ritual&&<RitualCard key={`${ritual}-${now}`} kind={ritual} state={state} mutate={mutate} now={now} go={go} hour={hour} onDone={done}/>}
  {showCard?<p className="ritual-escape"><button type="button" className="text-button" onClick={()=>skip(true)}>{ritual==='morning'?'Skip the plan and show my list':'Skip the check-in and show my list'}</button></p>
  :<div ref={doing} className="today-doing">
   <div className="today-do">
    <TodayList state={state} mutate={mutate} now={now} closed={closed}/>
   </div>
   <aside className="today-side">
    {ritual==='evening'&&skipped?<p className="ritual-note"><span>Closing the day takes two minutes.</span><button type="button" className="button secondary" onClick={()=>skip(false)}>Close my day</button></p>
    :<RitualNote state={state} now={now} hour={hour} skipped={skipped&&ritual==='morning'} onOpen={()=>skip(false)}/>}
    {gym&&<TrainingCard state={state} mutate={mutate} now={now}/>}
    <DailyTicks state={state} mutate={mutate} now={now} closed={closed}/>
    <Promises state={state} mutate={mutate} now={now} go={go} active={active}/>
   </aside>
  </div>}
 </div>;
}

// The week's promises with their count. With nothing on the board yet, one gentle way in.
function Promises({state,mutate,now,go,active}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void;active:Goal[]}){
 const daily=active.filter(g=>g.type==='daily'),weekly=active.filter(g=>g.type.startsWith('weekly'));
 const daysLeft=7-daysBetween(weekStart(now),now);
 if(!daily.length&&!weekly.length)return <section className="promises empty-commitments"><h2>Choose what you’ll show up for.</h2><p>Your 36 commitments are waiting on the board. Turn on a handful, not all of them.</p><button className="button" onClick={()=>go('Reboot Board')}>Set up your board <ArrowRight size={16}/></button></section>;
 if(!weekly.length)return null;
 const row=(g:Goal,meta:string)=><li key={g.id} className={`promise ${dayState(g,state.logs,now)}`}><div className="promise-text"><strong>{g.pinned&&<Pin size={14} className="promise-pin"/>}{goalName(g,state)}</strong><small>{meta}</small></div><GoalControls g={g} state={state} date={now} mutate={mutate} quick/></li>;
 return <section className="promises" aria-labelledby="promises-title">
  <div className="section-title"><h2 id="promises-title">This week</h2><span className="count-note">{daysLeft} {daysLeft===1?'day':'days'} left</span></div>
  <ul className="promise-list">{weekly.map(g=>{const st=stats(g,state.logs,now),c=criteriaAt(g,now);
   return row(g,g.type==='weekly-max'?`${fmt(st.period)} of under ${c.target} ${c.unit}${st.canQualify?'':' · limit reached'}`:`${fmt(st.period)} of ${c.target} ${c.unit}${st.period>=c.target?' · covered':''}`);})}</ul>
  <button className="text-button section-link" onClick={()=>go('Reboot Board')}>All {state.goals.length} commitments <ArrowRight size={16}/></button>
 </section>;
}

// Who you're becoming, in your own words.
function Identity({state,mutate}:{state:State;mutate:Mutate}){
 const [editing,setEditing]=useState(false),[value,setValue]=useState(state.settings.identity??'');
 const cancel=()=>{setValue(state.settings.identity??'');setEditing(false);};
 const save=()=>{mutate(s=>{s.settings.identity=value.trim();},'identity statement');setEditing(false);};
 if(editing)return <form className="identity-edit rh-edit-form" onSubmit={e=>{e.preventDefault();save();}}><label><span className="field-label">Who you’re becoming, in one sentence</span><textarea autoFocus rows={2} value={value} maxLength={160} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();save();}if(e.key==='Escape')cancel();}} placeholder="I am someone who keeps the promises I make to myself."/></label><div className="toolbar"><button className="button">Save</button><button type="button" className="text-button" onClick={cancel}>Cancel</button></div></form>;
 const text=state.settings.identity?.trim();
 return text?<div className="rh-statement"><p className="rh-becoming">{text}</p><button className="text-button rh-edit" onClick={()=>setEditing(true)}><PenLine size={16}/>Rewrite</button></div>
  :<div className="rh-statement"><p className="rh-becoming empty">Who are you becoming?</p><button className="button secondary rh-edit" onClick={()=>setEditing(true)}><PenLine size={16}/>Write it</button></div>;
}

const fmt=(n:number)=>String(Number(n.toFixed(1)));

function greeting(name?:string){const h=new Date().getHours(),part=h<5?'Still up':h<12?'Good morning':h<18?'Good afternoon':'Good evening';return name?.trim()?`${part}, ${name.trim()}`:part;}
