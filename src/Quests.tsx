// Getting started: a checklist of the things Reboot can do, ticked off by actually doing them, like a game's
// first quests. Each has "Show me", which opens the right page and points at the spot. It lives in the sidebar
// (desktop), a slim row on Today (phone), and always in Settings → Guide.
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {State} from './model';
import {Check,ArrowRight,X} from './icons';
import {tourSeen,startTour} from './Tour';
import {CHECK_IN} from './mood';
import {gsap,useGSAP,whenMotionOK} from './motion';

import {FLAGS,flag} from './flags';
import {usePocketPets} from './Pet';
export const openQuests=()=>window.dispatchEvent(new Event('reboot-quests'));

type Quest={id:string;title:string;how:string;page:string;target?:string;done:boolean;optional?:boolean};
export function quests(s:State,bondAround:boolean):Quest[]{
 const todos=s.todos??[],frogs=todos.filter(t=>t.frog);
 return [
  {id:'tour',title:'Take the tour',how:'A one-minute walk through Today.',page:'Today',done:tourSeen()},
  {id:'identity',title:'Write who you’re becoming',how:'One sentence at the top of Today.',page:'Today',target:'.today-head .rh-statement',done:!!s.settings.identity?.trim()},
  {id:'frog',title:'Pick today’s frog',how:'The task you’d most like to put off. Add a task, then tap it under “Pick today’s frog”.',page:'Today',target:'.frog-card, .frog-pick, .today-list .todo-add',done:frogs.length>0},
  {id:'slice',title:'Slice your frog',how:'Break it into small first steps inside the frog card.',page:'Today',target:'.frog-card .slice-add, .frog-card, .frog-pick',done:frogs.some(t=>(t.slices??[]).length>0)},
  {id:'priority',title:'Organize with A–E',how:'Tap the A–E chip on a task: A must, B should, C nice to do, D hand off, E drop.',page:'Today',target:'.todo-list .prio-chip, .today-list .todo-add',done:todos.some(t=>!!t.priority)},
  {id:'eat',title:'Eat a frog',how:'Finish your frog first thing. “Eat it now” starts a focus timer.',page:'Today',target:'.frog-card, .frog-pick',done:frogs.some(t=>t.done)},
  {id:'promise',title:'Keep a promise',how:'Tap “Mark done” on one of your promises.',page:'Today',target:'.promises',done:s.logs.some(l=>l.state==='success')},
  {id:'checkin',title:'Check in on your day',how:'One tap on “How was today?” It also marks your Journey line.',page:'Today',target:'.checkin .mood-row',done:s.journals.some(j=>!!j.mood)||s.journey.some(d=>(d.moments??[]).some(m=>m.tag===CHECK_IN))},
  {id:'journal',title:'Write in your journal',how:'A line on Today’s check-in, or a full page in Journal.',page:'Journal',target:'.book .writing-area, .writing-room',done:s.journals.some(j=>!!j.text.trim())},
  {id:'progress',title:'Look at your progress',how:'Your Journey line and the weekly review.',page:'Journey',target:'.progress-tabs',done:flag(FLAGS.progress)},
  {id:'tomorrow',title:'Plan tomorrow’s frog',how:'In the evening, choose tomorrow’s frog under “Close the day”.',page:'Today',target:'.close-day, .checkin',done:frogs.some(t=>t.date>t.createdAt.slice(0,10))},
  {id:'reminders',title:'Set your frog reminders',how:'Add the morning and evening reminders to your calendar.',page:'Settings',target:'.reminders',done:flag(FLAGS.calendar)||!!s.settings.reminders?.notify},
  {id:'bond',title:'Meet Bond',how:'Tap Bond at the bottom of the screen. He’ll remind you of a real win.',page:'Today',target:'.pocket-pet .pet-frame',done:flag(FLAGS.bond),optional:!bondAround},
 ].filter(q=>!q.optional);
}

// Open the page and point at the spot: it scrolls into view and pulses for a moment.
export function showMe(q:Quest,go:(p:string)=>void){
 if(q.id==='tour'){startTour();return;}
 go(q.page);
 window.setTimeout(()=>{const el=q.target?q.target.split(',').map(x=>document.querySelector(x.trim())).find(Boolean):null;if(!el)return;
  el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.remove('quest-pulse');void (el as HTMLElement).offsetWidth;el.classList.add('quest-pulse');window.setTimeout(()=>el.classList.remove('quest-pulse'),2400);},380);
}

export function QuestList({list,go,onPick}:{list:Quest[];go:(p:string)=>void;onPick?:()=>void}){
 return <ol className="quest-list">{list.map(q=><li key={q.id} className={q.done?'done':''}>
  <span className="quest-check" aria-hidden="true">{q.done&&<Check size={14}/>}</span>
  <div><strong>{q.title}</strong><small>{q.how}</small></div>
  {!q.done&&<button type="button" className="text-button" onClick={()=>{onPick?.();showMe(q,go);}} aria-label={`Show me: ${q.title}`}>Show me <ArrowRight size={14}/></button>}
 </li>)}</ol>;
}

export function QuestMeter({list,onOpen,className=''}:{list:Quest[];onOpen:()=>void;className?:string}){
 const done=list.filter(q=>q.done).length;
 if(done===list.length)return null;
 return <button type="button" className={`quest-meter ${className}`} onClick={onOpen} aria-label={`Getting started: ${done} of ${list.length} done. Open the checklist`}>
  <span>Getting started</span><b>{done}/{list.length}</b><i aria-hidden="true"><em style={{transform:`scaleX(${done/list.length})`}}/></i>
 </button>;
}

export function QuestPanel({list,go,onClose}:{list:Quest[];go:(p:string)=>void;onClose:()=>void}){
 const box=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 const done=list.filter(q=>q.done).length;
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')close.current();};window.addEventListener('keydown',esc);box.current?.querySelector<HTMLElement>('h2')?.focus();return()=>window.removeEventListener('keydown',esc);},[]);
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from('.quest-drawer',{xPercent:8,opacity:0,duration:.35,ease:'power3.out'});gsap.from('.quest-list li',{opacity:0,y:8,duration:.3,stagger:.03,delay:.1});});return()=>mm.revert();},{scope:box});
 return createPortal(<div ref={box} className="drawer-root">
  <button type="button" className="drawer-scrim" aria-hidden="true" tabIndex={-1} onClick={onClose}/>
  <aside className="goal-drawer quest-drawer" role="dialog" aria-modal="true" aria-labelledby="quest-title">
   <header className="drawer-head"><span className="drawer-eyebrow">{done} of {list.length} done</span><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></header>
   <h2 id="quest-title" tabIndex={-1}>Getting started</h2>
   <p className="muted">Everything Reboot can do for you, one at a time. Each one ticks itself off when you do it.</p>
   <div className="quest-progress" aria-hidden="true"><em style={{transform:`scaleX(${done/list.length})`}}/></div>
   <QuestList list={list} go={go} onPick={onClose}/>
  </aside>
 </div>,document.body);
}

// Settings → Guide: replay the tour, and the whole checklist, always available.
export function GuideSetting({state}:{state:State}){
 const list=quests(state,usePocketPets()!=='off'),done=list.filter(x=>x.done).length;
 return <section className="settings-section guide"><h2>Guide</h2>
  <p className="muted">A one-minute walk through Today, and a checklist of everything Reboot can do. You can also press ? anywhere.</p>
  <button type="button" className="button" onClick={startTour}>Take the tour</button>
  <h3 className="guide-sub">Getting started · {done} of {list.length}</h3>
  <QuestList list={list} go={p=>{location.hash=encodeURIComponent(p);}}/>
 </section>;
}
