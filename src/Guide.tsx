// Where to next: the right side of Today. Each place you haven't been to yet today, with where you stand and a
// tap that takes you there and points at the spot. Finished ones stay, ticked. Tomorrow's frog closes the day.
import type {State} from './model';
import {putActivity,type Mutate} from './GoalControls';
import {goalName} from './Board';
import {stats,dayState,atRiskStreaks,criteriaAt} from './engine';
import {showMe} from './Quests';
import {TomorrowFrog} from './Frog';
import {oneGoal,periodItems,weekOf,nextWeek} from './plan';
import {addDays,weekStart} from './dates';
import {useState} from 'react';
import {BookOpen,Trophy,TrendingUp,ChartNoAxesCombined,Target,Check,ArrowRight,ChevronDown} from './icons';

const FELT:Record<string,string>={Great:'a big step forward',Good:'a step forward',Okay:'a steady day',Low:'a setback',Difficult:'a hard day'};
type Place={id:string;title:string;sub:string;done:boolean;page:string;target:string;Icon:typeof BookOpen;before?:()=>void};

export function places(s:State,now:string):Place[]{
 const entry=s.journals.find(j=>j.date===now&&j.kind==='daily'),words=entry?.text.trim()?entry.text.trim().split(/\s+/).length:0,mood=entry?.mood;
 const proofs=s.proofs.filter(p=>p.date===now),onLine=s.journey.find(d=>d.date===now),one=oneGoal(s);
 const dow=new Date(`${now}T12:00:00`).getDay(),[y,m]=now.split('-').map(Number),lastDay=new Date(y,m,0).getDate(),day=Number(now.slice(8)),ws=weekStart(now);
 const review=(kind:'weekly'|'monthly')=>()=>{try{sessionStorage.setItem('reboot-review-write',kind);}catch{/* fine */}};
 const list:Place[]=[
  {id:'journal',title:'Write today’s page',Icon:BookOpen,page:'Journal',target:'.verso .mood-picker',done:!!mood&&words>0,
   sub:mood&&words?`Felt ${mood.toLowerCase()} · ${words} ${words===1?'word':'words'}`:mood?`Felt ${mood.toLowerCase()}. Add a few lines.`:words?`${words} words. How did today feel?`:'How today felt, and a few honest lines.'},
  {id:'proof',title:'Add a win or a shot you took',Icon:Trophy,page:'Journal',target:'.book-proof',done:proofs.length>0,
   sub:proofs.length?`${proofs.length} on the record today`:'However small. You’ll reread these on hard days.'},
  {id:'line',title:'See your line',Icon:TrendingUp,page:'Journey',target:'.chart-frame',done:!!onLine,
   sub:onLine?mood?`Today marked as ${FELT[mood]??'a moment'}`:'Today is marked':'Your mood in the journal marks today on it.'},
 ];
 if(dow===5||dow===6||dow===0)list.push({id:'weekly',title:'Write your weekly review',Icon:ChartNoAxesCombined,page:'Review',target:'#main .board-topline .button',before:review('weekly'),
  done:s.journals.some(j=>j.kind==='weekly'&&!!j.text.trim()&&j.date>=ws&&j.date<=addDays(ws,6)),sub:'What improved, what didn’t, what changes next week.'});
 if(lastDay-day<3||day===1)list.push({id:'monthly',title:'Write your monthly review',Icon:ChartNoAxesCombined,page:'Review',target:'#main .board-topline .button',before:review('monthly'),
  done:s.journals.some(j=>j.kind==='monthly'&&!!j.text.trim()&&j.date.slice(0,7)===(day===1?addDays(now,-1):now).slice(0,7)),sub:'The same look back, for the whole month.'});
 const weekNow=periodItems(s,'week',weekOf(now)),weekNext=periodItems(s,'week',nextWeek(now)),weekend=dow===0||dow===6;
 list.push({id:'week',title:weekend?'Plan next week':'Plan this week',Icon:Target,page:'Reboot Board',target:'.period-lists',before:()=>{try{sessionStorage.setItem('reboot-board-mode','plan');}catch{/* fine */}},
  done:weekend?weekNext.length>0:weekNow.length>0,sub:(weekend?weekNext:weekNow).length?`${(weekend?weekNext:weekNow).length} on the list · move tomorrow’s onto your to-do`:'Write the week’s list, pulled from the month.'});
 list.push({id:'plan',title:one?'Your one goal':'Plan your year',Icon:Target,page:'Reboot Board',target:'.plan-goals, .one-goal',before:()=>{try{sessionStorage.setItem('reboot-board-mode','plan');}catch{/* fine */}},
  done:!!one&&one.steps.length>0&&(s.todos??[]).some(t=>t.date===now&&!!t.fromPlan),
  sub:one?`${one.steps.filter(x=>x.done).length} of ${one.steps.length} steps · ${(s.todos??[]).some(t=>t.date===now&&!!t.fromPlan)?'a step is on today’s list':'put one step on today’s list'}`:'Ten goals, then the one that would change the most.'});
 return list;
}

export function Guide({state,mutate,now,go}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void}){
 const list=places(state,now),done=list.filter(p=>p.done).length;
 const open=(p:Place)=>{p.before?.();showMe({id:p.id,title:p.title,how:'',page:p.page,target:p.target,done:p.done},go);};
 return <section className="guide-panel" aria-labelledby="guide-title">
  <div className="gp-head"><h2 id="guide-title">Where to next</h2><span>{done} of {list.length}</span></div>
  <ul className="gp-list">{list.map(p=><li key={p.id}><button type="button" className={`gp-item ${p.done?'done':''}`} onClick={()=>open(p)}>
   <span className="gp-icon" aria-hidden="true">{p.done?<Check size={16}/>:<p.Icon size={18}/>}</span>
   <span className="gp-text"><strong>{p.title}</strong><small>{p.sub}</small></span>
   <ArrowRight size={16} className="gp-arrow"/>
  </button></li>)}</ul>
  <div className="close-day"><h3>Close the day</h3><TomorrowFrog state={state} mutate={mutate} now={now} always/></div>
 </section>;
}

// Every day: all the board's daily goals in one list, styled like the to-do list. Ticking one counts it, and starts
// tracking it if it wasn't on yet. Two-part goals get two small checks; "2+ meals" gets a small counter.
export function DailyTicks({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const daily=state.goals.filter(g=>g.type==='daily'&&g.status!=='completed').sort((a,b)=>Number(b.status==='active')-Number(a.status==='active')||Number(b.pinned)-Number(a.pinned)||a.priority-b.priority);
 const on=daily.filter(g=>g.status==='active'),kept=daily.filter(g=>dayState(g,state.logs,now)==='success').length,risk=new Set(atRiskStreaks(state,now).map(r=>r.g.id));
 const [open,setOpen]=useState(()=>{try{return localStorage.getItem('reboot-daily-open')==='1';}catch{return false;}});
 const left=on.filter(g=>dayState(g,state.logs,now)!=='success');
 return <section className="daily-ticks" aria-label="Every day">
  <button type="button" className="dt-toggle" aria-expanded={open} onClick={()=>{setOpen(!open);try{localStorage.setItem('reboot-daily-open',open?'0':'1');}catch{/* fine */}}}>
   <h2>Every day</h2><span className="dt-count">{kept} kept</span><i className="dt-dots" aria-hidden="true">{on.map(g=><b key={g.id} className={dayState(g,state.logs,now)==='success'?'on':''}/>)}</i><ChevronDown size={16}/>
  </button>
  {!open&&(left.length?<p className="dt-left">Still to tick: {left.map(g=>goalName(g,state)).join(' · ')}</p>:on.length?<p className="dt-left">Every daily promise kept today.</p>:null)}
  {open&&<><ul className="dt-list">{daily.map(g=><DailyRow key={g.id} g={g} state={state} mutate={mutate} now={now} risk={risk.has(g.id)}/>)}</ul>
   <p className="dt-board">Big milestones are logged on the Reboot Board.</p></>}
 </section>;
}

function DailyRow({g,state,mutate,now,risk}:{g:State['goals'][number];state:State;mutate:Mutate;now:string;risk:boolean}){
 const c=criteriaAt(g,now),ds=dayState(g,state.logs,now),done=ds==='success',st=stats(g,state.logs,now),name=goalName(g,state);
 const mine=(l:State['logs'][number],s:State)=>l.goalId===g.id&&l.run===s.goals.find(x=>x.id===g.id)!.run&&l.date===now&&!l.title&&!l.stage;
 const today=state.logs.find(l=>mine(l,state)),tasks=new Set(today?.tasks??[]),count=today?.value??0;
 // Ticking an untracked goal turns it on from today.
 const track=(s:State)=>{const x=s.goals.find(y=>y.id===g.id)!;if(x.status!=='active'){x.status='active';if(x.start>now)x.start=now;}return x;};
 const clear=(s:State)=>{s.logs=s.logs.filter(l=>!mine(l,s));};
 const main=()=>mutate(s=>{const x=track(s);if(done){clear(s);return;}if(c.checklist)putActivity(s,x,now,{tasks:[...c.checklist],state:'success'});else if(c.dailyMin)putActivity(s,x,now,{value:c.dailyMin,state:'success'});else putActivity(s,x,now,{state:'success'});},`goal ${g.id}, ${now}`);
 const part=(task:string)=>mutate(s=>{const x=track(s);const set=new Set(tasks);if(set.has(task))set.delete(task);else set.add(task);if(!set.size){clear(s);return;}putActivity(s,x,now,{tasks:[...set],state:c.checklist!.every(t=>set.has(t))?'success':'partial'});},`goal ${g.id}, ${now}`);
 const step=(by:number)=>mutate(s=>{const x=track(s);const n=Math.max(0,count+by);if(!n){clear(s);return;}putActivity(s,x,now,{value:n,state:n>=(c.dailyMin??1)?'success':'partial'});},`goal ${g.id}, ${now}`);
 const meta=g.status!=='active'?'Not tracked yet · tick to start':st.current?`${st.current}-day streak`:'Start today';
 return <li className={`dt-row ${done?'done':''} ${g.status!=='active'?'idle':''}`}>
  <button type="button" className={`check-action dt-check ${done?'checked':''}`} aria-pressed={done} aria-label={`Mark “${name}” done`} onClick={main}><span className="check-box">{done&&<Check size={15}/>}</span></button>
  <div className="dt-text"><strong>{name}</strong><small>{meta}{risk&&!done&&<b> · today keeps it going</b>}</small>
   {c.checklist&&<div className="dt-parts">{c.checklist.map(task=>{const on=tasks.has(task);return <button key={task} type="button" className={`dt-part ${on?'on':''}`} aria-pressed={on} onClick={()=>part(task)}><i aria-hidden="true">{on&&<Check size={10}/>}</i>{task}</button>;})}</div>}
   {c.dailyMin!==undefined&&<div className="dt-counter"><button type="button" aria-label={`One fewer for ${name}`} disabled={!count} onClick={()=>step(-1)}>−</button><span>{count} of {c.dailyMin} {c.unit}</span><button type="button" aria-label={`One more for ${name}`} onClick={()=>step(1)}>+</button></div>}
  </div>
 </li>;
}
