// Getting started: a checklist of the things Reboot can do, ticked off by actually doing them, like a game's
// first quests. Each has "Show me", which opens the right page and points at the spot. It lives in Settings → Guide
// only: the sidebar and Today no longer carry a "6 of 17" meter, so nothing nags (Bao, 2026-10-30).
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {State} from './model';
import {Check,ArrowRight,X} from './icons';
import {tourSeen,startTour,TOUR_NAMES,type TourId} from './Tour';
import {CHECK_IN} from './mood';
import {gsap,useGSAP,whenMotionOK} from './motion';

import {FLAGS,flag} from './flags';
import {oneGoal} from './plan';
import {usePocketPets} from './Pet';
export const openQuests=()=>window.dispatchEvent(new Event('reboot-quests'));

type Quest={id:string;title:string;how:string;page:string;target?:string;done:boolean;optional?:boolean};
export function quests(s:State,bondAround:boolean):Quest[]{
 const todos=s.todos??[],frogs=todos.filter(t=>t.frog);
 return [
  {id:'tour',title:'Take the tour',how:'A one-minute walk through Today.',page:'Today',done:tourSeen()},
  {id:'identity',title:'Write who you’re becoming',how:'One sentence at the top of Today.',page:'Today',target:'.today-head .rh-statement',done:!!s.settings.identity?.trim()},
  {id:'ritual',title:'Finish a ritual',how:'Two minutes on Today: plan the morning, or close the day from 5 pm. Each one is a day you showed up.',page:'Today',target:'.ritual-card, .ritual-note',done:(s.rituals??[]).some(r=>!!(r.morning||r.evening))},
  {id:'frog',title:'Pick today’s frog',how:'The task you’d most like to put off. Pick it in the morning ritual, or tap a task under “Pick today’s frog”.',page:'Today',target:'.ritual-card .rs-choices, .frog-card, .frog-pick, .today-list .todo-add',done:frogs.length>0},
  {id:'slice',title:'Slice your frog',how:'Break it into small first steps inside the frog card.',page:'Today',target:'.frog-card .slice-add, .frog-card, .frog-pick',done:frogs.some(t=>(t.slices??[]).length>0)},
  {id:'priority',title:'Organize with A–E',how:'Tap the A–E chip on a task: A must, B should, C nice to do, D hand off, E drop.',page:'Today',target:'.todo-list .prio-chip, .today-list .todo-add',done:todos.some(t=>!!t.priority)},
  {id:'eat',title:'Eat a frog',how:'Finish your frog first thing. “Eat it now” starts a focus timer.',page:'Today',target:'.frog-card, .frog-pick',done:frogs.some(t=>t.done)},
  {id:'training',title:'Train from your plan',how:'Tick off today’s exercises on Today. “Edit plan” changes your week.',page:'Today',target:'.training',done:(s.workouts??[]).some(w=>w.done.length>0)},
  {id:'promise',title:'Keep a promise',how:'Tick one under “Every day” on Today, or in the evening ritual.',page:'Today',target:'.daily-ticks',done:s.logs.some(l=>l.state==='success')},
  {id:'checkin',title:'Check in on your day',how:'In your journal: one tap for how today was, then a few lines.',page:'Journal',target:'.verso .mood-picker',done:s.journals.some(j=>!!j.mood)||s.journey.some(d=>(d.moments??[]).some(m=>m.tag===CHECK_IN))},
  {id:'journal',title:'Write in your journal',how:'A line on Today’s check-in, or a full page in Journal.',page:'Journal',target:'.book .writing-area, .writing-room',done:s.journals.some(j=>!!j.text.trim())},
  {id:'weekly',title:'Write a weekly review',how:'Once a week in Progress → Review: three questions on what improved, what didn’t, what you’ll change.',page:'Review',target:'#main .board-topline .button',done:s.journals.some(j=>j.kind==='weekly'&&!!j.text.trim())},
  {id:'monthly',title:'Write a monthly review',how:'The same, for the whole month. Switch Review to Monthly, then write it.',page:'Review',target:'#main .board-topline .button',done:s.journals.some(j=>j.kind==='monthly'&&!!j.text.trim())},
  {id:'plan',title:'Set your one goal',how:'In Horizon: write a goal for this year on its branch, then open the branch and tap “Make it the one”.',page:'Horizon',target:'.hz-ask, .mm, .mm-phone',done:!!oneGoal(s)},
  {id:'progress',title:'Look at your progress',how:'Your Journey line and the weekly review.',page:'Journey',target:'.progress-tabs',done:flag(FLAGS.progress)},
  {id:'tomorrow',title:'Plan tomorrow’s frog',how:'The last step of the evening ritual on Today, from 5 pm.',page:'Today',target:'.rs-tfrog, .ritual-card, .ritual-note',done:frogs.some(t=>t.date>t.createdAt.slice(0,10))},
  {id:'reminders',title:'Set your frog reminders',how:'Add the morning and evening reminders to your calendar.',page:'Settings',target:'.reminders',done:flag(FLAGS.calendar)||!!s.settings.reminders?.notify},
  {id:'bond',title:'Meet Bond',how:'Tap Bond at the bottom of the screen. He’ll remind you of a real win.',page:'Today',target:'.pocket-pet .pet-frame',done:flag(FLAGS.bond),optional:!bondAround},
 ].filter(q=>!q.optional);
}

// Open the page and point at the spot: it scrolls into view and pulses for a moment.
export function showMe(q:Quest,go:(p:string)=>void){
 if(q.id==='tour'){startTour('today');return;}
 if(q.id==='weekly'||q.id==='monthly')try{sessionStorage.setItem('reboot-review-write',q.id);}catch{/* fine */}
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

// The meter is retired: SHOW_METER stays false so the sidebar and Today render nothing. Callers can drop it.
export const SHOW_METER=false;
export function QuestMeter({list,onOpen,className=''}:{list:Quest[];onOpen:()=>void;className?:string}){
 const done=list.filter(q=>q.done).length;
 if(!SHOW_METER||done===list.length)return null;
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
   <header className="drawer-head"><h2 id="quest-title" tabIndex={-1}>Getting started</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></header>
   <p className="drawer-eyebrow">{done} of {list.length} done</p>
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
  <div className="guide-tours">{(Object.keys(TOUR_NAMES) as TourId[]).map(id=><button key={id} type="button" className={id==='today'?'button':'button secondary'} onClick={()=>startTour(id)}>{id==='today'?'Take the tour':`Tour: ${TOUR_NAMES[id]}`}</button>)}</div>
  <h3 className="guide-sub">Getting started · {done} of {list.length}</h3>
  <QuestList list={list} go={p=>{location.hash=encodeURIComponent(p);}}/>
 </section>;
}
