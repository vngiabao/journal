// Eat That Frog, as daily habits:
//  · one frog a day: the task you would most like to put off, done first;
//  · ABCDE: label every task, and never do a B while an A is waiting;
//  · slice it: break the frog into small steps you can start right now;
//  · single-handle it: a focus session with only the frog on screen;
//  · plan tomorrow tonight: choose tomorrow's frog before bed.
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {State,Todo,Priority} from './model';
import {uid} from './model';
import type {Mutate} from './GoalControls';
import {addDays,label} from './dates';
import {Check,Plus,X,Play,Pause,Bell,CalendarPlus} from './icons';
import {gsap,useGSAP,whenMotionOK} from './motion';
import {inkStamp} from './delight';
import {download} from './storage';
import {remindersOf,remindersIcs,askPermission,notificationsSupported,notify} from './reminders';
import {PRIORITIES,PRIORITY_NAME,frogOf} from './frog-rules';
export {frogOf,frogStats,priorityRank} from './frog-rules';

const FROG={sit:'/art/frog/frog-sit.webp',nervous:'/art/frog/frog-nervous.webp',leap:'/art/frog/frog-leap.webp'};
export function FrogGlyph({className=''}:{className?:string}){return <img className={`frog-glyph ${className}`} src={FROG.sit} alt=""/>;}
const timeOf=(iso?:string)=>iso?new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';

const SHORT:Record<Priority,string>={A:'Must do',B:'Should do',C:'Nice to do',D:'Hand it off',E:'Drop it'};
// The priority letter opens a small labelled menu: no letters to memorise.
export function PriorityChip({t,onSet}:{t:Todo;onSet:(p?:Priority)=>void}){
 const [open,setOpen]=useState(false),ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{if(!open)return;const down=(e:MouseEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};
  document.addEventListener('mousedown',down);window.addEventListener('keydown',key);return()=>{document.removeEventListener('mousedown',down);window.removeEventListener('keydown',key);};},[open]);
 const pick=(p?:Priority)=>{onSet(p);setOpen(false);};
 return <span ref={ref} className="prio-wrap">
  <button type="button" className={`prio-chip ${t.priority?`prio-${t.priority}`:'prio-none'}`} aria-haspopup="menu" aria-expanded={open} aria-label={t.priority?`Priority ${t.priority}, ${SHORT[t.priority].toLowerCase()}. Change it`:`Set a priority for “${t.text}”`} title={t.priority?PRIORITY_NAME[t.priority]:'Set a priority'} onClick={()=>setOpen(!open)}>{t.priority??'A–E'}</button>
  {open&&<span className="prio-menu" role="menu">{PRIORITIES.map(p=><button key={p} type="button" role="menuitemradio" aria-checked={t.priority===p} onClick={()=>pick(p)}><b className={`prio-chip prio-${p}`} aria-hidden="true">{p}</b>{SHORT[p]}</button>)}{t.priority&&<button type="button" role="menuitem" className="prio-clear" onClick={()=>pick(undefined)}>No priority</button>}</span>}
 </span>;
}

// The frog, featured above the list. Afternoon makes it nervous; eating it sends it leaping off.
export function FrogCard({frog,mutate,now,onFocus}:{frog:Todo;mutate:Mutate;now:string;onFocus:()=>void}){
 const box=useRef<HTMLElement>(null),wasDone=useRef(frog.done),[slice,setSlice]=useState('');
 const late=!frog.done&&frog.date===now&&new Date().getHours()>=12,slices=frog.slices??[],sliced=slices.filter(s=>s.done).length;
 const edit=(fn:(t:Todo)=>void,what:string)=>mutate(s=>{const t=(s.todos??[]).find(x=>x.id===frog.id);if(t)fn(t);},what);
 const eat=(e?:React.MouseEvent<HTMLElement>)=>{if(!frog.done&&e){const r=e.currentTarget.getBoundingClientRect();inkStamp(Math.min(r.right-70,innerWidth-70),r.top+r.height/2,'Eaten');}edit(t=>{t.done=!t.done;t.doneAt=t.done?new Date().toISOString():undefined;},'frog eaten');};
 useGSAP(()=>{const was=wasDone.current;wasDone.current=frog.done;if(!frog.done||was)return;const mm=whenMotionOK(()=>{gsap.timeline().fromTo('.frog-art',{y:0,rotation:0},{keyframes:{y:[0,-70,-20,0],rotation:[0,-12,6,0]},duration:.9,ease:'power2.out'}).from('.frog-eyebrow',{opacity:0,y:6,duration:.3},'-=.4');});return()=>mm.revert();},{dependencies:[frog.done],scope:box});
 return <section ref={box} className={`frog-card ${frog.done?'eaten':''} ${late?'late':''}`} aria-label="Today’s frog">
  <img className="frog-art" src={frog.done?FROG.leap:late?FROG.nervous:FROG.sit} alt=""/>
  <div className="frog-body">
   <p className="frog-eyebrow">{frog.done?`Frog eaten${frog.doneAt?` at ${timeOf(frog.doneAt)}`:''}. The rest of today is downhill.`:late?'Still waiting. Don’t stare at it: start one slice.':'Your frog · eat this first'}</p>
   <button className={`check-action frog-title ${frog.done?'checked':''}`} aria-pressed={frog.done} onClick={eat}><span className="check-box">{frog.done&&<Check size={18}/>}</span><span className="todo-text">{frog.text}</span></button>
   {(slices.length>0||!frog.done)&&<div className="frog-slices">
    {slices.length>0&&<><div className="slice-meter" aria-hidden="true"><b style={{transform:`scaleX(${sliced/slices.length})`}}/></div>
    <ul>{slices.map(s=><li key={s.id} className={s.done?'done':''}><button className={`check-action ${s.done?'checked':''}`} aria-pressed={s.done} onClick={()=>edit(t=>{const x=t.slices?.find(y=>y.id===s.id);if(x)x.done=!x.done;},'frog slice')}><span className="check-box">{s.done&&<Check size={13}/>}</span><span>{s.text}</span></button><button className="icon-button" aria-label={`Remove slice “${s.text}”`} onClick={()=>edit(t=>{t.slices=(t.slices??[]).filter(y=>y.id!==s.id);},'frog slice')}><X size={12}/></button></li>)}</ul></>}
    {!frog.done&&<form className="slice-add" onSubmit={e=>{e.preventDefault();const v=slice.trim();if(!v)return;edit(t=>{t.slices=[...(t.slices??[]),{id:uid(),text:v,done:false}];},'frog slice');setSlice('');}}><Plus size={15}/><input aria-label="Add a slice of your frog" value={slice} maxLength={120} placeholder={slices.length?'Next slice…':'Slice it: what is the first small step?'} onChange={e=>setSlice(e.target.value)}/></form>}
   </div>}
   {!frog.done&&<div className="frog-actions"><button className="button frog-go" onClick={onFocus}><Play size={15}/>Eat it now</button><button className="text-button" onClick={()=>edit(t=>{t.frog=false;},'frog unset')}>Not my frog</button></div>}
  </div>
 </section>;
}

// Plan tomorrow tonight: one task, not a whole list. At midnight it becomes the day's frog.
export function TomorrowFrog({state,mutate,now,always=false}:{state:State;mutate:Mutate;now:string;always?:boolean}){
 const tomorrow=addDays(now,1),set=frogOf(state,tomorrow),[text,setText]=useState(''),[open,setOpen]=useState(false);
 const evening=new Date().getHours()>=17;
 if(set&&!open)return <p className="tomorrow-frog is-set"><FrogGlyph/><span>Tomorrow’s frog: <b>{set.text}</b></span><button className="text-button" onClick={()=>{setText(set.text);setOpen(true);}}>Change</button></p>;
 if(!evening&&!open&&!always)return null;
 return <form className="tomorrow-frog" onSubmit={e=>{e.preventDefault();const v=text.trim();mutate(s=>{const list=(s.todos??[]).filter(t=>!(t.date===tomorrow&&t.frog&&!v));const ex=list.find(t=>t.date===tomorrow&&t.frog);if(v){if(ex)ex.text=v;else list.push({id:uid(),date:tomorrow,text:v,done:false,frog:true,priority:'A',createdAt:new Date().toISOString()});}s.todos=list;},'tomorrow frog');setOpen(false);setText('');}}>
  <FrogGlyph/><label><span>Before bed: choose tomorrow’s frog</span><input aria-label="Tomorrow’s frog" value={text} maxLength={140} placeholder="The one task you’ll do first tomorrow" onChange={e=>setText(e.target.value)}/></label><button className="button secondary" disabled={!text.trim()&&!set}>{set&&!text.trim()?'Clear':'Set'}</button>
 </form>;
}

// Single-handle it: only the frog, a timer, and its slices. Phone face down.
export function FrogFocus({frog,mutate,onClose}:{frog:Todo;mutate:Mutate;onClose:()=>void}){
 const [minutes,setMinutes]=useState(25),[left,setLeft]=useState(25*60),[endAt,setEndAt]=useState<number|null>(null),[finished,setFinished]=useState(false);
 const root=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')close.current();};window.addEventListener('keydown',esc);document.body.classList.add('drawer-open');root.current?.querySelector<HTMLElement>('.focus-start')?.focus();
  return()=>{window.removeEventListener('keydown',esc);document.body.classList.remove('drawer-open');};},[]);
 useEffect(()=>{if(!endAt)return;const tick=()=>{const s=Math.max(0,Math.round((endAt-Date.now())/1000));setLeft(s);if(!s){setEndAt(null);setFinished(true);void notify('Time’s up','How far did you get with your frog? Finish the slice you’re on.','frog-focus');}};tick();const id=window.setInterval(tick,500);return()=>clearInterval(id);},[endAt]);
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from('.focus-panel',{y:24,opacity:0,duration:.45,ease:'power3.out'});gsap.from('.focus-root',{opacity:0,duration:.3});});return()=>mm.revert();},{scope:root});
 const pick=(m:number)=>{setMinutes(m);setLeft(m*60);setEndAt(null);setFinished(false);};
 const edit=(fn:(t:Todo)=>void,what:string)=>mutate(s=>{const t=(s.todos??[]).find(x=>x.id===frog.id);if(t)fn(t);},what);
 const mm=String(Math.floor(left/60)).padStart(2,'0'),ss=String(left%60).padStart(2,'0'),progress=1-left/(minutes*60);
 return createPortal(<div ref={root} className="focus-root" role="dialog" aria-modal="true" aria-label="Focus on your frog">
  <div className="focus-panel">
   <p className="focus-eyebrow">Single-handle it · phone face down</p>
   <img className="focus-frog" src={frog.done?FROG.leap:FROG.sit} alt=""/>
   <h2>{frog.text}</h2>
   <div className="focus-clock" style={{['--p' as string]:progress}}><span role="timer" aria-live="off">{mm}:{ss}</span></div>
   {finished?<p className="focus-note">Time. Finish the slice you’re on, or go again.</p>:<div className="focus-presets" role="radiogroup" aria-label="Session length">{[25,50,90].map(m=><button key={m} type="button" role="radio" aria-checked={minutes===m} className={minutes===m?'selected':''} onClick={()=>pick(m)}>{m} min</button>)}</div>}
   <div className="focus-controls">{endAt?<button className="button secondary focus-start" onClick={()=>{setEndAt(null);}}><Pause size={16}/>Pause</button>:<button className="button focus-start" onClick={()=>{setFinished(false);setEndAt(Date.now()+(left||minutes*60)*1000);if(!left)setLeft(minutes*60);}}><Play size={16}/>{left<minutes*60&&left>0?'Resume':'Start'}</button>}
    <button className={`button ${frog.done?'secondary':'frog-eat'}`} onClick={()=>{edit(t=>{t.done=!t.done;t.doneAt=t.done?new Date().toISOString():undefined;},'frog eaten');if(!frog.done)onClose();}}><Check size={16}/>{frog.done?'Not done yet':'I ate it'}</button></div>
   {(frog.slices??[]).length>0&&<ul className="focus-slices">{frog.slices!.map(s=><li key={s.id}><button className={`check-action ${s.done?'checked':''}`} aria-pressed={s.done} onClick={()=>edit(t=>{const x=t.slices?.find(y=>y.id===s.id);if(x)x.done=!x.done;},'frog slice')}><span className="check-box">{s.done&&<Check size={13}/>}</span><span>{s.text}</span></button></li>)}</ul>}
   <button className="text-button focus-leave" onClick={onClose}>Leave focus</button>
  </div>
 </div>,document.body);
}

// Settings: when the two reminders ring, and how they reach you.
const permState=()=>notificationsSupported()?Notification.permission:'unsupported';
export function ReminderSettings({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const r=remindersOf(state),[perm,setPerm]=useState<string>(permState),[sent,setSent]=useState('');
 const set=(p:Partial<typeof r>)=>mutate(s=>{s.settings.reminders={...remindersOf(s),...p};},'reminder settings');
 return <section className="settings-section reminders"><h2>Frog reminders</h2>
  <p className="muted">A morning nudge to eat your frog first, and an evening nudge to choose tomorrow’s. The morning one stays quiet once your frog is eaten.</p>
  <div className="reminder-times"><label>Eat your frog<input type="time" value={r.morning} onChange={e=>e.target.value&&set({morning:e.target.value})}/></label><label>Choose tomorrow’s frog<input type="time" value={r.evening} onChange={e=>e.target.value&&set({evening:e.target.value})}/></label></div>
  <div className="reminder-ways">
   <div><h3><CalendarPlus size={18}/>On your phone, even when Reboot is closed</h3><p className="muted">Adds two daily alarms to your calendar. On iPhone, open the file and tap Add All. Download it again after changing the times.</p><button className="button" onClick={()=>download('reboot-frog-reminders.ics',remindersIcs(r,now),'text/calendar')}><CalendarPlus size={16}/>Add to my calendar</button></div>
   <div><h3><Bell size={18}/>While Reboot is open</h3><p className="muted">{perm==='unsupported'?'This browser can’t show notifications.':perm==='denied'?'Notifications are blocked for this site. Allow them in your browser settings to use this.':'A notification at each time, if Reboot is open on this device.'}</p>
    <label className="checkbox-label"><input type="checkbox" disabled={perm==='unsupported'||perm==='denied'} checked={r.notify&&perm==='granted'} onChange={async e=>{if(e.target.checked){const p=await askPermission();setPerm(p);set({notify:p==='granted'});}else set({notify:false});}}/>Notify me on this device</label>
    {r.notify&&perm==='granted'&&<button className="text-button" onClick={async()=>{const ok=await notify('Eat your frog first','This is how your reminder will look.','frog-test');setSent(ok?'Sent. Check your notifications.':'Could not show a notification here.');}}>Send a test</button>}{sent&&<p className="muted" role="status">{sent}</p>}</div>
  </div>
 </section>;
}
