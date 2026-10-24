// Where to next: the right side of Today. Each place you haven't been to yet today, with where you stand and a
// tap that takes you there and points at the spot. Finished ones stay, ticked. Tomorrow's frog closes the day.
import type {State} from './model';
import {GoalControls,type Mutate} from './GoalControls';
import {goalName} from './Board';
import {stats,dayState,atRiskStreaks} from './engine';
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

// Every day: the board's daily promises you track, to tick right here. Other daily goals wait one tap away.
export function DailyTicks({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const daily=state.goals.filter(g=>g.type==='daily'),on=daily.filter(g=>g.status==='active').sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.priority-b.priority),off=daily.filter(g=>g.status==='not-started');
 const kept=on.filter(g=>dayState(g,state.logs,now)==='success').length,risk=new Set(atRiskStreaks(state,now).map(r=>r.g.id));
 const [open,setOpen]=useState(()=>{try{return localStorage.getItem('reboot-daily-open')==='1';}catch{return false;}});
 return <section className="daily-ticks" aria-label="Every day">
  <button type="button" className="dt-toggle" aria-expanded={open} onClick={()=>{setOpen(!open);try{localStorage.setItem('reboot-daily-open',open?'0':'1');}catch{/* fine */}}}>
   <h2>Every day</h2>{on.length>0&&<span className="dt-count">{kept} of {on.length} kept</span>}<i className="dt-dots" aria-hidden="true">{on.map(g=><b key={g.id} className={dayState(g,state.logs,now)==='success'?'on':''}/>)}</i><ChevronDown size={16}/>
  </button>
  {!open&&on.length>kept&&<p className="dt-left">Still to tick: {on.filter(g=>dayState(g,state.logs,now)!=='success').map(g=>goalName(g,state)).join(' · ')}</p>}
  {open&&<>
  {on.length?<ul className="dt-list">{on.map(g=>{const st=stats(g,state.logs,now),ds=dayState(g,state.logs,now);return <li key={g.id} className={`dt-row ${ds}`}>
   <div className="dt-text"><strong>{goalName(g,state)}</strong><small>{st.current?`${st.current}-day streak`:'Start today'}{risk.has(g.id)&&ds!=='success'&&<b> · today keeps it going</b>}</small></div>
   <GoalControls g={g} state={state} date={now} mutate={mutate} quick/>
  </li>;})}</ul>:<p className="muted">No daily promises yet. Turn one on below.</p>}
  <p className="dt-board">Big milestones are logged on the Reboot Board.</p>
  {off.length>0&&<details className="dt-more"><summary>More daily goals on your board ({off.length})</summary><ul>{off.map(g=><li key={g.id}><span>{goalName(g,state)}</span><button type="button" className="text-button" onClick={()=>mutate(s=>{const x=s.goals.find(y=>y.id===g.id);if(x){x.status='active';if(x.start>now)x.start=now;}},`goal ${g.id} status`)}>Track daily</button></li>)}</ul></details>}
  </>}
 </section>;
}
