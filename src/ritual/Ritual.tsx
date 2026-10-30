// The two-minute ritual: one calm card, one question at a time, one action. Morning plans the day, evening closes it,
// Sunday (and Saturday evening) adds the week. Every step can be skipped; finishing it is the day you showed up.
import {useEffect,useRef,useState} from 'react';
import './ritual.css';
import type {State,Todo} from '../model';
import type {Mutate} from '../GoalControls';
import {gsap,useGSAP,whenMotionOK,motionOK} from '../motion';
import {inkStamp} from '../delight';
import {bondCelebrate} from '../bond';
import {ArrowLeft,ArrowRight,Check,Plus,X} from '../icons';
import {label} from '../dates';
import {PriorityChip,FrogGlyph} from '../Frog';
import {DailyRow} from '../Guide';
import {MOODS,applyMood,setEntryText} from '../mood';
import {dayPlan,isTrainingDay,setAll} from '../training';
import {periodItems,addItem,syncStepFromTodo} from '../plan';
import {putActivity} from '../GoalControls';
import {dayState} from '../engine';
import {TODO_GOAL} from '../Todo';
import {type RitualKind,hasWeekStep,frogCandidates,suggestFrog,chooseFrog,newFrog,afterFrog,addTask,toTomorrow,todaysTasks,leftToSettle,rewriteTomorrow,letGo,settledOn,tomorrowsFrog,tomorrowsTasks,setTomorrowFrog,markRitual,planWeek,planMonth,isMonthEnd} from './rules';

type Step='frog'|'three'|'go'|'ticks'|'mood'|'tomorrow'|'week';
type StepProps={state:State;mutate:Mutate;now:string};
const ART:Record<Step,string>={frog:'/art/frog/frog-sit.webp',three:'/art/chibi-think.webp',go:'/art/chibi-bingo.webp',ticks:'/art/chibi-check.webp',mood:'/art/chibi-tea.webp',tomorrow:'/art/chibi-sleep.webp',week:'/art/dog/bond-flag.webp'};

export function RitualCard({kind,state,mutate,now,go,onDone,hour}:{kind:RitualKind;state:State;mutate:Mutate;now:string;go:(p:string)=>void;onDone:()=>void;hour:number}){
 // The steps are fixed when the card opens, so finishing the week step mid-flow doesn't reshuffle them.
 const [steps]=useState<Step[]>(()=>{const week=hasWeekStep(state,now,hour);return kind==='morning'?(week?['frog','three','week','go']:['frog','three','go']):(week?['ticks','mood','tomorrow','week']:['ticks','mood','tomorrow']);});
 const [i,setI]=useState(0),step=steps[i],last=i===steps.length-1,card=useRef<HTMLElement>(null);
 // Each step's work is applied by the step itself; `commit` is what its primary button saves before moving on.
 const commit=useRef<(()=>void)|null>(null);
 // A step can hold its primary button until it has what it needs (the frog step with an empty new frog).
 const [blocked,setBlocked]=useState<string|null>(null);
 // A new step takes focus to its question, so keyboard and screen-reader users land where the eyes do.
 useGSAP(()=>{if(!i)return;card.current?.querySelector<HTMLElement>('#ritual-q')?.focus({preventScroll:true});const mm=whenMotionOK(()=>{gsap.from('.rs-in',{opacity:0,y:14,duration:.28,ease:'enter',stagger:.04,clearProps:'all'});});return()=>mm.revert();},{dependencies:[i],scope:card,revertOnUpdate:true});
 // After a long step the page may sit below the card's top; bring it back so "2 of 3" and the question are on screen.
 // The card's scroll-margin-top clears the phone's top bar.
 useEffect(()=>{const el=card.current;if(!i||!el)return;const margin=parseFloat(getComputedStyle(el).scrollMarginTop)||0;
  if(el.getBoundingClientRect().top<margin-1)el.scrollIntoView({block:'start',behavior:motionOK()?'smooth':'auto'});},[i]);
 // Finishing is the earned moment: a stamp where you pressed, Bond reacts, and Today turns into the doing view.
 // The card holds still for a beat so the stamp lands on it, then gives way.
 const [closing,setClosing]=useState(false);
 const finish=(btn:HTMLElement)=>{
  setClosing(true);const r=btn.getBoundingClientRect();inkStamp(Math.min(r.left+r.width/2,innerWidth-80),r.top+r.height/2,kind==='morning'?'Planned':'Closed');
  let fired=false;
  const done=()=>{if(fired)return;fired=true;clearTimeout(t);removeEventListener('pointerdown',done,true);removeEventListener('keydown',done,true);
   mutate(s=>markRitual(s,now,kind),`ritual ${kind}`);bondCelebrate(kind==='morning'?'morning-done':'evening-done');onDone();};
  // Any tap or key cuts the beat short.
  const t=motionOK()?window.setTimeout(done,700):0;
  if(t){pendingDone.current=done;window.setTimeout(()=>{if(!fired){addEventListener('pointerdown',done,true);addEventListener('keydown',done,true);}},0);}else done();
 };
 // Leaving mid-beat still counts the ritual, and takes the listeners with it.
 const pendingDone=useRef<(()=>void)|null>(null);
 useEffect(()=>()=>{pendingDone.current?.();},[]);
 const next=(e:React.MouseEvent<HTMLButtonElement>,save:boolean)=>{if(closing)return;if(save&&blocked)return;
  if(save)commit.current?.();commit.current=null;
  if(step==='week'&&save){mutate(s=>markRitual(s,now,'week'),'ritual week');bondCelebrate('week-done');}
  if(last){finish(e.currentTarget);return;}setBlocked(null);setI(i+1);
 };
 const q=QUESTION[step](state,now);
 return <section ref={card} className={`ritual-card ritual-${kind} step-${step} ${closing?'is-closing':''}`} aria-busy={closing} aria-labelledby="ritual-q">
  {/* The question side fills its column; its content stays in view while a long step scrolls past. */}
  <div className="rs-side"><div className="rs-side-in">
   <p className="rs-count"><span>{kind==='morning'?'Morning':'Evening'}</span><span aria-hidden="true" className="rs-dots">{steps.map((s,n)=><i key={s} className={n<i?'past':n===i?'now':''}/>)}</span><span>{i+1} of {steps.length}</span></p>
   <h2 id="ritual-q" tabIndex={-1} className="rs-question rs-in">{q.ask}</h2>
   {q.help&&<p className="rs-help rs-in">{q.help}</p>}
   <img className="rs-art rs-in" src={ART[step]} alt="" key={step}/>
  </div></div>
  <div className="rs-main">
   <div className="rs-controls rs-in" key={step}>
    {step==='frog'&&<FrogStep state={state} mutate={mutate} now={now} commit={commit} onBlock={setBlocked}/>}
    {step==='three'&&<ThreeStep state={state} mutate={mutate} now={now}/>}
    {step==='go'&&<GoStep state={state} mutate={mutate} now={now}/>}
    {step==='ticks'&&<TicksStep state={state} mutate={mutate} now={now}/>}
    {step==='mood'&&<MoodStep state={state} mutate={mutate} now={now} commit={commit}/>}
    {step==='tomorrow'&&<TomorrowStep state={state} mutate={mutate} now={now}/>}
    {step==='week'&&<WeekStep state={state} mutate={mutate} now={now} go={go} commit={commit}/>}
   </div>
   {/* The one action follows the content; on a long step it stays pinned to the bottom of the screen. */}
   <div className="rs-foot">
    <button type="button" className="button rs-primary" aria-disabled={closing||!!blocked} onClick={e=>next(e,true)}>{blocked??PRIMARY[step](last,kind,state,now)}{!last&&!blocked&&<ArrowRight size={18}/>}</button>
    {!(last&&step==='go')&&<button type="button" className="text-button rs-skip" onClick={e=>next(e,false)}>{last?<>Skip<span className="rs-skip-more"> and close</span></>:'Skip'}</button>}
    {i>0&&<button type="button" className="text-button rs-back" onClick={()=>{if(closing)return;commit.current=null;setBlocked(null);setI(i-1);}}><ArrowLeft size={16}/><span className="rs-back-label">Back</span></button>}
   </div>
  </div>
 </section>;
}

const QUESTION:Record<Step,(s:State,now:string)=>{ask:string;help?:string}>={
 frog:()=>({ask:'What’s your frog today?',help:'The one task you’d most like to put off. You do it first, before anything else.'}),
 three:()=>({ask:'And after the frog, which three?',help:'The next three are what you work through. Not today? Send it to tomorrow and the next one steps up.'}),
 go:()=>({ask:'That’s the day. Frog first.',help:'Everything else waits until it’s done.'}),
 ticks:()=>({ask:'What did you get done today?',help:'Tick what you did. Nothing here is a grade.'}),
 mood:()=>({ask:'How was today?',help:'One tap, and one honest line if you want. It goes into today’s journal page.'}),
 tomorrow:()=>({ask:'What carries over to tomorrow?',help:'Unfinished tasks don’t move by themselves. Write each one that still matters again, or let it go.'}),
 week:(_s,now)=>({ask:'Three things for the week.',help:`The week of ${label(planWeek(now),{month:'long',day:'numeric'})}. Three that would make it a good one.`}),
};
// "These three" only when there are three: with fewer the button names what's there, and with none it simply moves on.
const THREE=['Next','This one','These two','These three'];
const PRIMARY:Record<Step,(last:boolean,kind:RitualKind,s:State,now:string)=>string>={
 frog:()=>'This is my frog',three:(_l,_k,s,now)=>THREE[Math.min(3,afterFrog(s,now).filter(t=>!t.auto).length)],go:()=>'Start my day',ticks:()=>'That’s the day',mood:()=>'Save',
 tomorrow:last=>last?'Close the day':'Next',week:(last,kind)=>last?(kind==='morning'?'Start my day':'Close the day'):'Plan set',
};

function FrogStep({state,mutate,now,commit,onBlock}:StepProps&{commit:React.MutableRefObject<(()=>void)|null>;onBlock:(why:string|null)=>void}){
 const list=frogCandidates(state,now).slice(0,5),suggested=suggestFrog(state,now);
 const [pick,setPick]=useState<string>(suggested?.id??'new'),[text,setText]=useState('');
 const empty=pick==='new'&&!text.trim();
 useEffect(()=>{onBlock(empty?'Write it first':null);},[empty]);
 commit.current=()=>{if(pick==='new'){const v=text.trim();if(v)mutate(s=>{newFrog(s,now,v);},'frog chosen');}else mutate(s=>chooseFrog(s,now,pick),'frog chosen');};
 return <div className="rs-frog">
  {list.length>0&&<ul className="rs-choices" role="radiogroup" aria-label="Today’s frog">{list.map(t=><li key={t.id}><button type="button" role="radio" aria-checked={pick===t.id} className={`rs-choice ${pick===t.id?'on':''}`} onClick={()=>setPick(t.id)}><span className="rs-radio" aria-hidden="true">{pick===t.id&&<FrogGlyph/>}</span><span className="rs-choice-text">{t.text}</span>{t.priority&&<b className={`prio-chip prio-${t.priority}`} aria-label={`Priority ${t.priority}`}>{t.priority}</b>}</button></li>)}</ul>}
  <label className={`rs-write ${pick==='new'?'on':''}`}><span>{list.length?'Or write a new one':'Write it down'}</span><input value={text} maxLength={140} placeholder="The task you’d most like to put off" onFocus={()=>setPick('new')} onChange={e=>{setText(e.target.value);setPick('new');}}/></label>
  {!list.length&&<p className="rs-note">Today’s list is empty, so your frog becomes its first task.</p>}
 </div>;
}

function ThreeStep({state,mutate,now}:StepProps){
 const list=afterFrog(state,now).filter(t=>!t.auto),three=list.slice(0,3),then=list.slice(3,6),more=list.length-6,frog=todaysTasks(state,now).find(t=>t.frog&&!t.done),day=dayPlan(state,now),[text,setText]=useState('');
 const setPriority=(id:string,p?:Todo['priority'])=>mutate(s=>{const t=(s.todos??[]).find(x=>x.id===id);if(t)t.priority=p;},'todo priority');
 return <div className="rs-three">
  {frog&&<p className="rs-frog-line"><FrogGlyph/><span>Frog: <b>{frog.text}</b></span></p>}
  {three.length?<ol className="rs-list">{three.map((t,n)=><li key={t.id}><span className="rs-num" aria-hidden="true">{n+1}</span><PriorityChip t={t} onSet={p=>setPriority(t.id,p)}/><span className="rs-task">{t.text}</span><button type="button" className="text-button rs-later" aria-label={`Move “${t.text}” to tomorrow`} onClick={()=>mutate(s=>toTomorrow(s,t.id,now),'todo to tomorrow')}>Tomorrow</button></li>)}</ol>
   :<p className="rs-empty">Nothing else on today’s list yet. Add what comes after the frog.</p>}
  {then.length>0&&<p className="rs-then"><span>Then</span>{then.map(t=>t.text).join(' · ')}{more>0?` · ${more} more`:''}</p>}
  {isTrainingDay(day)&&<p className="rs-go-gym">{day.kind==='gym'?'Gym':'Training'} today: <b>{day.title}</b></p>}
  <form className="rs-add" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;mutate(s=>{addTask(s,now,v);const g=s.goals.find(x=>x.id===TODO_GOAL);if(g&&dayState(g,s.logs,now)!=='success')putActivity(s,g,now,{state:'success',note:'Wrote today’s to-do list'});},`todo ${now}`);setText('');}}>
   <Plus size={20}/><input aria-label="Add a task for today" value={text} maxLength={140} placeholder="Add a task for today" onChange={e=>setText(e.target.value)}/><button className="button secondary" disabled={!text.trim()}>Add</button>
  </form>
 </div>;
}

function GoStep({state,now}:StepProps){
 const frog=todaysTasks(state,now).find(t=>t.frog&&!t.done),three=afterFrog(state,now).filter(t=>!t.auto).slice(0,3),day=dayPlan(state,now);
 return <div className="rs-go">
  <div className="rs-go-frog"><FrogGlyph/><div><strong>{frog?.text??'No frog today. Start with the first task.'}</strong></div></div>
  {three.length>0&&<ol className="rs-list rs-go-list" aria-label="Then">{three.map((t,n)=><li key={t.id}><span className="rs-num" aria-hidden="true">{n+1}</span><span className="rs-task">{t.text}</span></li>)}</ol>}
  {isTrainingDay(day)&&<p className="rs-go-gym">{day.kind==='gym'?'Gym':'Training'} today: <b>{day.title}</b></p>}
 </div>;
}

function TicksStep({state,mutate,now}:StepProps){
 const tasks=todaysTasks(state,now).sort((a,b)=>Number(!!b.frog)-Number(!!a.frog)),daily=state.goals.filter(g=>g.type==='daily'&&g.status==='active').sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.priority-b.priority);
 const tick=(t:Todo)=>{const becomes=!t.done;mutate(s=>{const x=(s.todos??[]).find(y=>y.id===t.id);if(!x)return;if(x.auto==='workout'){setAll(s,x.date,!x.done);return;}x.done=!x.done;x.doneAt=x.done?new Date().toISOString():undefined;syncStepFromTodo(s,x.id);},'todo check');if(becomes&&t.frog)bondCelebrate('frog-done');};
 return <div className="rs-ticks">
  {tasks.length>0&&<ul className="rs-checks" aria-label="Today’s tasks">{tasks.map(t=><li key={t.id} className={t.done?'done':''}><button type="button" className={`check-action rs-check ${t.done?'checked':''}`} aria-pressed={t.done} onClick={()=>tick(t)}><span className="check-box">{t.done&&<Check size={18}/>}</span>{t.frog&&<FrogGlyph/>}<span className="rs-task">{t.text}</span></button></li>)}</ul>}
  {daily.length>0&&<><h3 className="rs-sub">Every day</h3><ul className="dt-list rs-daily">{daily.map(g=><DailyRow key={g.id} g={g} state={state} mutate={mutate} now={now} risk={false}/>)}</ul></>}
  {!tasks.length&&!daily.length&&<p className="rs-empty">Nothing was on the list today. That’s allowed. Go on to how it felt.</p>}
 </div>;
}

function MoodStep({state,mutate,now,commit}:StepProps&{commit:React.MutableRefObject<(()=>void)|null>}){
 const entry=state.journals.find(j=>j.date===now&&j.kind==='daily'),[mood,setMood]=useState(entry?.mood??''),[line,setLine]=useState('');
 commit.current=()=>{const v=line.trim();if(!mood&&!v)return;mutate(s=>{if(mood)applyMood(s,now,mood);if(v){const had=s.journals.find(j=>j.date===now&&j.kind==='daily')?.text.trim();setEntryText(s,now,had?`${had}\n\n${v}`:v);}},'evening check-in');};
 return <div className="rs-mood">
  <div className="rs-moods" role="radiogroup" aria-label="How today felt">{MOODS.map(m=><button key={m} type="button" role="radio" aria-checked={mood===m} className={`rs-mood-btn mood-${m.toLowerCase()} ${mood===m?'on':''}`} onClick={()=>setMood(mood===m?'':m)}>{m}</button>)}</div>
  <label className="rs-write on"><span>One line about today</span><input value={line} maxLength={240} placeholder="What you want to remember about today" onChange={e=>setLine(e.target.value)}/></label>
  {entry?.text.trim()&&<p className="rs-note">Today’s page already has {entry.text.trim().split(/\s+/).length} words. This line is added at the end.</p>}
 </div>;
}

// Evening 3: each leftover is one calm line with two quiet choices. Only the row you choose to rewrite opens a field.
// Three show at a time, so tomorrow's frog stays close: settle first, and what you write again becomes a frog option.
const SHOW_LEFT=3;
function TomorrowStep({state,mutate,now}:StepProps){
 const left=leftToSettle(state,now),frog=tomorrowsFrog(state,now),next=tomorrowsTasks(state,now).filter(t=>!t.frog),[text,setText]=useState(''),[changing,setChanging]=useState(false);
 const [all,setShowAll]=useState(false),[editing,setEditing]=useState<string|null>(null),list=useRef<HTMLDivElement>(null);
 const shown=all?left:left.slice(0,SHOW_LEFT),hidden=left.length-shown.length,tally=settledOn(state,now);
 // Keyboard focus lands on the next row's first choice (or tomorrow's frog when the list is done), never on <body>.
 const focusRow=(n:number)=>requestAnimationFrame(()=>{const rows=list.current?.querySelectorAll<HTMLElement>('.rs-again')??[];
  const to=rows[Math.min(n,rows.length-1)]??list.current?.querySelector<HTMLElement>('.rs-tfrog button, .rs-tfrog input');to?.focus({preventScroll:true});});
 const settle=(n:number,fn:(s:State)=>void,what:string)=>{mutate(fn,what);setEditing(null);focusRow(n);};
 return <div className="rs-tomorrow" ref={list}>
  <div className="rs-left-wrap">
   {left.length>0?<ul className="rs-left" aria-label="Left over">{shown.map((t,n)=><LeftRow key={t.id} t={t} now={now} editing={editing===t.id}
     onEdit={()=>setEditing(t.id)} onCancel={()=>{setEditing(null);focusRow(n);}}
     onSave={v=>settle(n,s=>rewriteTomorrow(s,t.id,v,now),'todo rewrite')} onDrop={()=>settle(n,s=>letGo(s,t.id,now),'todo let go')}/>)}</ul>
    :<p className="rs-settled"><Check size={18}/>{tally.total?'All settled.':'Nothing left over.'} Today’s list is clear.</p>}
   {hidden>0&&<button type="button" className="text-button rs-more" onClick={()=>setShowAll(true)}>{hidden} more left over</button>}
   {tally.total>0&&left.length>0&&<p className="rs-tally"><Check size={16}/>{[tally.again&&`${tally.again} written for tomorrow`,tally.dropped&&`${tally.dropped} let go`].filter(Boolean).join(', ')}</p>}
  </div>
  <div className="rs-tfrog">
   <h3 className="rs-sub"><FrogGlyph/>Tomorrow’s frog</h3>
   {frog&&!changing?<p className="rs-tfrog-set"><b>{frog.text}</b><button type="button" className="text-button" onClick={()=>setChanging(true)}>Change</button></p>
   :<>{next.length>0&&<div className="rs-chips" role="group" aria-label="Pick from tomorrow’s list">{next.slice(0,5).map(t=><button key={t.id} type="button" className="rs-chip" onClick={()=>{mutate(s=>setTomorrowFrog(s,now,{id:t.id}),'tomorrow frog');setChanging(false);}}>{t.text}</button>)}</div>}
    <form className="rs-add" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;mutate(s=>setTomorrowFrog(s,now,{text:v}),'tomorrow frog');setText('');setChanging(false);}}><input aria-label="Tomorrow’s frog" value={text} maxLength={140} placeholder={next.length?'Or write a new one':'Tomorrow’s first task'} onChange={e=>setText(e.target.value)}/><button className="button secondary" disabled={!text.trim()}>Set</button></form></>}
  </div>
 </div>;
}
function LeftRow({t,now,editing,onEdit,onCancel,onSave,onDrop}:{t:Todo;now:string;editing:boolean;onEdit:()=>void;onCancel:()=>void;onSave:(v:string)=>void;onDrop:()=>void}){
 // The rewrite rule: the field starts empty, so the task is written again by hand rather than copied forward.
 const [text,setText]=useState('');
 return <li className={`rs-left-row ${editing?'editing':''}`}>
  <p className="rs-left-text">{t.frog&&<FrogGlyph/>}<span>{t.text}</span>{t.date<now&&<small>{label(t.date,{weekday:'short',month:'short',day:'numeric'})}</small>}</p>
  {editing?<form className="rs-rewrite" onSubmit={e=>{e.preventDefault();if(text.trim())onSave(text);}}>
    <input autoFocus aria-label={`Write “${t.text}” again for tomorrow`} value={text} maxLength={140} placeholder="In your own words, for tomorrow" onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onCancel();}}}/>
    <button className="button secondary" disabled={!text.trim()}>Save</button>
    <button type="button" className="text-button rs-cancel" onClick={onCancel}>Cancel</button>
   </form>
   :<span className="rs-left-acts"><button type="button" className="text-button rs-again" aria-label={`Write it again: ${t.text}`} onClick={onEdit}>Write it again</button><button type="button" className="text-button rs-letgo" aria-label={`Let it go: ${t.text}`} onClick={onDrop}>Let it go</button></span>}
 </li>;
}

// Sunday: the week's three slots show at once, so you can see the shape of the week while you write it.
const ORDINAL=['first','second','third'];
function WeekStep({state,mutate,now,go,commit}:StepProps&{go:(p:string)=>void;commit:React.MutableRefObject<(()=>void)|null>}){
 const week=planWeek(now),items=periodItems(state,'week',week),month=planMonth(now),monthItems=periodItems(state,'month',month),monthEnd=isMonthEnd(now);
 const open=Math.max(0,3-items.length),[drafts,setDrafts]=useState<string[]>([]),slots=useRef<HTMLOListElement>(null);
 // The primary button keeps whatever is written but not yet entered.
 commit.current=()=>{const vs=drafts.slice(0,open).map(v=>v.trim()).filter(Boolean);if(vs.length)mutate(s=>{for(const v of vs)addItem(s,'week',week,v);},'week list');};
 const focusSlot=(k:number)=>requestAnimationFrame(()=>slots.current?.querySelectorAll<HTMLInputElement>('.rs-slot input')[k]?.focus());
 const enter=(k:number)=>{const v=(drafts[k]??'').trim();if(!v){focusSlot(k+1);return;}mutate(s=>addItem(s,'week',week,v),'week list');setDrafts(d=>d.filter((_,j)=>j!==k));focusSlot(k);};
 return <div className="rs-week">
  <ol className="rs-list rs-slots" ref={slots} aria-label="Three things for the week">
   {items.map((it,n)=><li key={it.id} className={it.done?'done':''}><span className="rs-num" aria-hidden="true">{n+1}</span><span className="rs-task">{it.text}</span>{it.done&&<Check size={18}/>}</li>)}
   {Array.from({length:open},(_,k)=>{const n=items.length+k;return <li key={`slot-${n}`} className="rs-slot"><span className="rs-num" aria-hidden="true">{n+1}</span>
    <input aria-label={`The ${ORDINAL[n]} thing for the week`} value={drafts[k]??''} maxLength={140} placeholder={`The ${ORDINAL[n]} thing`} enterKeyHint={k<open-1?'next':'done'}
     onChange={e=>{const v=e.target.value;setDrafts(d=>{const c=[...d];c[k]=v;return c;});}} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();enter(k);}}}/></li>;})}
  </ol>
  {monthEnd&&<><h3 className="rs-sub">And {label(`${month}-01`,{month:'long'})}</h3><PeriodList items={monthItems} max={5} placeholder={['What the month is for']} onAdd={v=>mutate(s=>addItem(s,'month',month,v),'month list')} name={label(`${month}-01`,{month:'long'})}/></>}
  <nav className="rs-rooms" aria-label="Your rooms"><span>Your rooms</span><button type="button" className="text-button" onClick={()=>go('Reboot Board')}>Board<ArrowRight size={16}/></button><button type="button" className="text-button" onClick={()=>go('Horizon')}>Horizon<ArrowRight size={16}/></button><button type="button" className="text-button" onClick={()=>go('Review')}>Weekly review<ArrowRight size={16}/></button></nav>
 </div>;
}
function PeriodList({items,max,placeholder,onAdd,name}:{items:{id:string;text:string;done:boolean}[];max:number;placeholder:string[];onAdd:(v:string)=>void;name:string}){
 const [text,setText]=useState('');
 return <div className="rs-period">
  {items.length>0&&<ol className="rs-list">{items.map((it,n)=><li key={it.id} className={it.done?'done':''}><span className="rs-num" aria-hidden="true">{n+1}</span><span className="rs-task">{it.text}</span>{it.done&&<Check size={18}/>}</li>)}</ol>}
  {items.length<max&&<form className="rs-add" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onAdd(v);setText('');}}><Plus size={20}/><input aria-label={`Add to ${name}`} value={text} maxLength={140} placeholder={placeholder[Math.min(items.length,placeholder.length-1)]} onChange={e=>setText(e.target.value)}/><button className="button secondary" disabled={!text.trim()}>Add</button></form>}
 </div>;
}

// When the ritual is done or waiting: one calm line, never a checklist.
export function RitualNote({state,now,hour,skipped,onOpen}:{state:State;now:string;hour:number;skipped:boolean;onOpen:()=>void}){
 const r=(state.rituals??[]).find(x=>x.date===now),at=(iso?:string)=>iso?new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
 const frog=tomorrowsFrog(state,now);
 if(r?.evening)return <p className="ritual-note closed"><Check size={18}/><span>Day closed at {at(r.evening)}.{frog?<> Tomorrow’s frog: <b>{frog.text}</b>.</>:' See you tomorrow.'}</span></p>;
 if(hour<17&&!r?.morning&&skipped)return <p className="ritual-note"><span>Your morning plan takes two minutes.</span><button type="button" className="button secondary" onClick={onOpen}>Plan my morning</button></p>;
 if(hour<17)return <p className="ritual-note">{r?.morning&&<Check size={18}/>}<span>{r?.morning?`Morning planned at ${at(r.morning)}. `:''}Evening check-in opens at 5 pm.</span></p>;
 return null;
}
