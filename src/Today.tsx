import {useRef,useState} from 'react';
import {gsap,useGSAP,SplitText,whenMotionOK} from './motion';
import {ArrowRight,Pin,PenLine} from './icons';
import type {State,Goal} from './model';
import {label,addDays,daysBetween,weekStart} from './dates';
import {stats,criteriaAt,dayState,promisesKept,proofCounts,atRiskStreaks} from './engine';
import {goalName} from './Board';
import {GoalControls,type Mutate} from './GoalControls';
import {TodayList} from './Todo';
import {CheckIn} from './CheckIn';
import {Routine} from './Routine';
import {quests,QuestMeter,openQuests} from './Quests';
import {usePocketPets} from './Pet';

// Today is one screen of things to act on: a short header, then "Do" (your frog, your tasks, your promises)
// beside "Check in" (how the day felt, one line, one win, closing the day). Charts and the board live one tap away.
export function Today({state,mutate,now,go}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void}){
 const active=state.goals.filter(g=>g.status==='active').sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.priority-b.priority);
 const daily=active.filter(g=>g.type==='daily'),hero=useRef<HTMLElement>(null),bond=usePocketPets()!=='off';
 // On the first visit of the day the statement rises in and the evidence counts up. Nothing else moves.
 useGSAP((_,contextSafe)=>{const mm=whenMotionOK(()=>{
  const key=`reboot-greeted-${now}`;let seen=false;try{seen=!!sessionStorage.getItem(key);sessionStorage.setItem(key,'1');}catch{/* private mode: greet anyway */}
  if(seen)return;
  const line=hero.current?.querySelector('.rh-becoming');if(line)gsap.set(line,{opacity:0});
  document.fonts.ready.then(contextSafe!(()=>{
   if(line){const split=SplitText.create(line,{type:'words,lines',mask:'lines'});gsap.set(line,{opacity:1});gsap.from(split.words,{yPercent:110,duration:.7,stagger:.035,ease:'power4.out',onComplete:()=>split.revert()});}
   hero.current?.querySelectorAll<HTMLElement>('[data-count]').forEach((el,i)=>{const n={v:0},to=Number(el.dataset.count);gsap.to(n,{v:to,duration:.9,delay:.2+i*.06,ease:'power3.out',onUpdate:()=>{el.textContent=String(Math.round(n.v));}});});
  }));
 });return()=>mm.revert();},{scope:hero});
 return <>
  <header ref={hero} className="reboot-hero today-head">
   <img className="rh-figure" src="/art/bao-write.webp" alt="" width={520} height={291}/>
   <div className="rh-top"><p className="dateline">{label(now,{weekday:'short',month:'short',day:'numeric',year:'numeric'}).toUpperCase()} <span>Day {letterNumber(state,now)}</span></p><h1 className="rh-greet">{greeting(state.settings.name)}.</h1></div>
   <Identity state={state} mutate={mutate}/>
   <Evidence state={state} now={now} daily={daily}/>
  </header>
  <QuestMeter className="quest-row" list={quests(state,bond)} onOpen={openQuests}/>
  <div className="today-grid">
   <div className="today-do">
    <Routine state={state} now={now} go={go}/>
    <TodayList state={state} mutate={mutate} now={now}/>
    <Promises state={state} mutate={mutate} now={now} go={go} active={active}/>
   </div>
   <aside className="today-checkin"><CheckIn state={state} mutate={mutate} now={now} go={go}/></aside>
  </div>
 </>;
}

// Every promise in one list: daily ones with their streak (and a flag when today keeps it alive), weekly ones with their count.
function Promises({state,mutate,now,go,active}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void;active:Goal[]}){
 const daily=active.filter(g=>g.type==='daily'),weekly=active.filter(g=>g.type.startsWith('weekly'));
 const kept=daily.filter(g=>dayState(g,state.logs,now)==='success').length,risk=new Set(atRiskStreaks(state,now).map(r=>r.g.id));
 const daysLeft=7-daysBetween(weekStart(now),now);
 if(!daily.length&&!weekly.length)return <section className="promises empty-commitments"><h2>Choose what you’ll show up for.</h2><p>Your 36 commitments are waiting on the board. Turn on a handful, not all of them.</p><button className="button" onClick={()=>go('Reboot Board')}>Set up your board <ArrowRight size={16}/></button></section>;
 const row=(g:Goal,meta:string,flag?:string)=><li key={g.id} className={`promise ${dayState(g,state.logs,now)}`}><div className="promise-text"><strong>{g.pinned&&<Pin size={13} className="promise-pin"/>}{goalName(g,state)}</strong><small>{meta}{flag&&<b className="promise-flag">{flag}</b>}</small></div><GoalControls g={g} state={state} date={now} mutate={mutate} quick/></li>;
 return <section className="promises" aria-labelledby="promises-title">
  <div className="section-title"><h2 id="promises-title">Promises</h2>{daily.length>0&&<span className="count-note">{kept} of {daily.length} kept today</span>}</div>
  {daily.length>0&&<ul className="promise-list">{daily.map(g=>{const st=stats(g,state.logs,now);return row(g,st.current?`${st.current}-day streak · best ${st.best}`:'Start today',risk.has(g.id)?'Today keeps it going':undefined);})}</ul>}
  {weekly.length>0&&<><h3 className="promise-sub">This week · {daysLeft} {daysLeft===1?'day':'days'} left</h3><ul className="promise-list">{weekly.map(g=>{const st=stats(g,state.logs,now),c=criteriaAt(g,now);
   return row(g,g.type==='weekly-max'?`${fmt(st.period)} of under ${c.target} ${c.unit}${st.canQualify?'':' · limit reached'}`:`${fmt(st.period)} of ${c.target} ${c.unit}${st.period>=c.target?' · covered':''}`);})}</ul></>}
  <button className="text-button section-link" onClick={()=>go('Reboot Board')}>All {state.goals.length} commitments <ArrowRight size={16}/></button>
 </section>;
}

// Who you're becoming, in your own words: the largest line on the page.
function Identity({state,mutate}:{state:State;mutate:Mutate}){
 const [editing,setEditing]=useState(false),[value,setValue]=useState(state.settings.identity??'');
 const cancel=()=>{setValue(state.settings.identity??'');setEditing(false);};
 const save=()=>{mutate(s=>{s.settings.identity=value.trim();},'identity statement');setEditing(false);};
 if(editing)return <form className="identity-edit rh-edit-form" onSubmit={e=>{e.preventDefault();save();}}><label><span className="field-label">Who you’re becoming, in one sentence</span><textarea autoFocus rows={2} value={value} maxLength={160} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();save();}if(e.key==='Escape')cancel();}} placeholder="I am someone who keeps the promises I make to myself."/></label><div className="toolbar"><button className="button">Save</button><button type="button" className="text-button" onClick={cancel}>Cancel</button></div></form>;
 const text=state.settings.identity?.trim();
 return text?<div className="rh-statement"><p className="rh-becoming">{text}</p><button className="text-button rh-edit" onClick={()=>setEditing(true)}><PenLine size={14}/>Rewrite</button></div>
  :<div className="rh-statement"><p className="rh-becoming empty">Who are you becoming?</p><button className="button rh-edit" onClick={()=>setEditing(true)}><PenLine size={15}/>Write it</button></div>;
}

// Proof you are moving: real counts only. Nothing here is estimated.
function Evidence({state,now,daily}:{state:State;now:string;daily:Goal[]}){
 const kept=promisesKept(state,now),c=proofCounts(state.proofs.filter(p=>p.date<=now)),streak=Math.max(0,...daily.map(g=>stats(g,state.logs,now).current));
 const frogs=(state.todos??[]).filter(t=>t.frog&&t.done&&t.date<=now).length;
 const items:[number,string][]=[[kept,kept===1?'promise kept':'promises kept'],...(frogs?[[frogs,frogs===1?'frog eaten':'frogs eaten'] as [number,string]]:[]),[streak,streak===1?'day, longest streak running':'days, longest streak running'],[c.attempt,c.attempt===1?'shot taken':'shots taken'],[c.win,c.win===1?'win logged':'wins logged']];
 if(!items.some(([n])=>n))return <p className="rh-evidence-empty">Day one. Every promise you keep from today on is counted here, and nothing you didn’t do.</p>;
 return <div className="rh-evidence">{items.map(([n,l])=><div key={l}><strong data-count={n}>{n}</strong><span>{l}</span></div>)}</div>;
}




const fmt=(n:number)=>String(Number(n.toFixed(1)));

function greeting(name?:string){const h=new Date().getHours(),part=h<5?'Still up':h<12?'Good morning':h<18?'Good afternoon':'Good evening';return name?.trim()?`${part}, ${name.trim()}`:part;}

// The day's number in this correspondence: days since your first record, counting today.
function letterNumber(s:State,now:string){const first=[...s.logs.map(l=>l.date),...s.journey.map(m=>m.date),...s.journals.map(j=>j.date)].filter(d=>d<=now).sort()[0];if(!first)return 1;return Math.round((Date.parse(now)-Date.parse(first))/864e5)+1;}

// A streak shown as a postmark: the number of days in a row, and the target around it.
function Postmark({n,target}:{n:number;target:number}){return <div className={`postmark ${n?'':'blank'}`} aria-label={`${n} of ${target} days in a row`}><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="23"/></svg><strong>{n}</strong><span>of {target}</span></div>;}
