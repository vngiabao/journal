import {useRef,useState} from 'react';
import {gsap,useGSAP,SplitText,whenMotionOK,CLEAR_DASH} from './motion';
import {Rough,sk} from './Sketch';
import {journeyLevels} from './engine';
import {range} from './dates';
import {BookOpen,ArrowRight,Pin,Check,PenLine} from './icons';
import type {State,Goal} from './model';
import {label,addDays,daysBetween,weekStart} from './dates';
import {stats,criteriaAt,dayState,promisesKept,proofCounts,atRiskStreaks} from './engine';
import {Progress,goalName,statusLabel} from './Board';
import {GoalControls,type Mutate} from './GoalControls';
import {Journey} from './Journey';
import {ProofQuickAdd,ProofRecall} from './Proof';
import {inkOf} from './seed';
import {TodayList} from './Todo';
import {Chibi} from './Art';

export function Today({state,mutate,now,go}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void}){
 const [choosing,setChoosing]=useState(false);
 const active=state.goals.filter(g=>g.status==='active').sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.priority-b.priority);
 const daily=active.filter(g=>g.type==='daily'),weekly=active.filter(g=>g.type.startsWith('weekly')),pins=active.filter(g=>g.pinned).slice(0,3);
 const doneToday=daily.filter(g=>dayState(g,state.logs,now)==='success').length;
 const daysLeft=7-daysBetween(weekStart(now),now),due=active.filter(g=>g.deadline&&g.deadline>=now&&g.deadline<=addDays(now,7)),overdue=active.filter(g=>g.deadline&&g.deadline<now&&!stats(g,state.logs,now).complete);
 const risk=atRiskStreaks(state,now),core=state.goals.filter(g=>inkOf(g)==='maize');
 const allKept=daily.length>0&&doneToday===daily.length,hero=useRef<HTMLElement>(null);
 // Every visit, your line draws itself behind the hero. On the first visit of the day the statement rises in and the evidence counts up.
 useGSAP((_,contextSafe)=>{const mm=whenMotionOK(()=>{
  gsap.from('.rh-line .s',{drawSVG:0,duration:1.8,ease:'pen',stagger:.1,clearProps:CLEAR_DASH});
  const key=`reboot-greeted-${now}`;let seen=false;try{seen=!!sessionStorage.getItem(key);sessionStorage.setItem(key,'1');}catch{/* private mode: greet anyway */}
  if(seen)return;
  const line=hero.current?.querySelector('.rh-becoming');if(line)gsap.set(line,{opacity:0});
  document.fonts.ready.then(contextSafe!(()=>{
   if(line){const split=SplitText.create(line,{type:'words,lines',mask:'lines'});gsap.set(line,{opacity:1});gsap.from(split.words,{yPercent:110,duration:.8,stagger:.045,ease:'power4.out',onComplete:()=>split.revert()});}
   hero.current?.querySelectorAll<HTMLElement>('[data-count]').forEach((el,i)=>{const n={v:0},to=Number(el.dataset.count);gsap.to(n,{v:to,duration:1.1,delay:.35+i*.08,ease:'power3.out',onUpdate:()=>{el.textContent=String(Math.round(n.v));}});});
   gsap.from('.rh-top, .rh-evidence>div, .rh-foot',{opacity:0,y:12,duration:.6,stagger:.07,ease:'power3.out',delay:.15});
  }));
 });return()=>mm.revert();},{scope:hero});

 return <>
  <header ref={hero} className="reboot-hero">
   <HeroLine state={state} now={now}/>
   <img className="rh-figure" src="/art/bao-write.webp" alt="" width={520} height={291}/>
   <div className="rh-top"><p className="dateline">{label(now,{weekday:'short',month:'short',day:'numeric',year:'numeric'}).toUpperCase()} <span>Day {letterNumber(state,now)}</span></p><h1 className="rh-greet">{greeting(state.settings.name)}.</h1></div>
   <Identity state={state} mutate={mutate}/>
   <Evidence state={state} now={now} daily={daily}/>
   <div className="rh-foot"><p className="rh-nudge">{nudge(daily.length,doneToday)}</p><button className="button secondary" onClick={()=>go('Journal')}><BookOpen size={16}/>Write today’s entry</button></div>
  </header>

  <TodayList state={state} mutate={mutate} now={now}/>

  <div className="today-layout">
   <section className="daily-section">
    <div className="section-title"><h2>Today’s check-in</h2>{daily.length>0&&<span className="count-note">{doneToday} of {daily.length} kept</span>}</div>
    {daily.length>0&&<div className="kept-meter" aria-hidden="true">{daily.map(g=><span key={g.id} className={dayState(g,state.logs,now)}/>)}</div>}
    {allKept&&<p className="all-kept"><Check size={16}/>Every promise for today is kept. That counts.</p>}
    {daily.length?daily.map(g=><div className={`commitment-row ${dayState(g,state.logs,now)}`} key={g.id}><div><strong>{goalName(g,state)}</strong><small>{criteriaAt(g,now).description}</small></div><Postmark n={stats(g,state.logs,now).current} target={stats(g,state.logs,now).target}/><GoalControls g={g} state={state} date={now} mutate={mutate}/></div>)
    :<div className="empty-commitments"><h3>Choose what you’ll show up for.</h3><p>Your 36 original commitments are waiting on the board. Activate a handful, not all of them. You can add more once these feel automatic.</p><button className="button" onClick={()=>go('Reboot Board')}>Set up your board <ArrowRight size={16}/></button></div>}
    {daily.length>0&&<button className="text-button section-link" onClick={()=>go('Reboot Board')}>All {state.goals.length} commitments <ArrowRight size={16}/></button>}

    <div className="weekly-block">
     <div className="section-title"><div><h2>This week</h2><p>Flexible days, firm totals. {daysLeft} {daysLeft===1?'day':'days'} left, counting today.</p></div><span className="count-note">Week of {label(weekStart(now))}</span></div>
     {weekly.length?weekly.map(g=>{const st=stats(g,state.logs,now),c=criteriaAt(g,now),pct=Math.min(100,st.period/c.target*100);return <div key={g.id} className="quota-row"><div><strong>{goalName(g,state)}</strong><small>{g.type==='weekly-max'?`${fmt(st.period)} ${c.unit} so far. Stay below ${c.target}.${st.canQualify?'':' Limit reached this week.'}`:st.period>=c.target?`${fmt(st.period)} of ${c.target} ${c.unit}. This week is covered.`:`${fmt(st.period)} of ${c.target} ${c.unit}. ${fmt(c.target-st.period)} to go.`}</small></div><div className={`progress-track ${g.type==='weekly-max'?'limit':''} ${st.period>=c.target&&g.type!=='weekly-max'?'met':''}`}><span style={{transform:`scaleX(${pct/100})`}}/></div><GoalControls g={g} state={state} date={now} mutate={mutate}/></div>;})
     :<p className="empty-inline">No weekly commitments are active. Gym, journaling, and calls home live here once you turn them on.</p>}
    </div>
   </section>

   <aside className="today-rail">
    <section className="priorities">
     <div className="section-title"><h2>Three priorities</h2><button className="icon-button" aria-label="Choose priorities" aria-expanded={choosing} onClick={()=>setChoosing(!choosing)}><Pin size={15}/></button></div>
     {pins.length?pins.map((g,i)=><div className="priority-row" key={g.id}><span>{i+1}</span><div><strong>{goalName(g,state)}</strong><small>{shortProgress(g,state,now)}</small></div></div>):<p className="muted">Pin up to three. Attention is the scarcest thing you have.</p>}
     {choosing&&<div className="priority-options">{active.map(g=><label key={g.id} className="checkbox-label"><input type="checkbox" checked={g.pinned} disabled={!g.pinned&&pins.length>=3} onChange={()=>mutate(s=>{s.goals.find(x=>x.id===g.id)!.pinned=!g.pinned;},`pin goal ${g.id}`)}/>{goalName(g,state)}</label>)}{!active.length&&<button className="text-button" onClick={()=>go('Reboot Board')}>Activate goals first</button>}</div>}
    </section>
    <section className="attention-note">
     <h3>Needs you today</h3>
     {risk.map(({g,st})=><p key={g.id}><b>{goalName(g,state)}</b>: a {st.current}-day streak continues only if you record today.</p>)}
     {weekly.filter(g=>g.type!=='weekly-max').map(g=>{const st=stats(g,state.logs,now),need=criteriaAt(g,now).target-st.period;return need>0&&need>=daysLeft-1?<p key={g.id}><b>{goalName(g,state)}</b>: {fmt(need)} more in {daysLeft} {daysLeft===1?'day':'days'}.</p>:null;})}
     {due.map(g=><p key={g.id}><b>{goalName(g,state)}</b>: due {label(g.deadline)}.</p>)}
     {overdue.map(g=><p key={g.id}><b>{goalName(g,state)}</b>: deadline passed {label(g.deadline)}. Adjust it or push through.</p>)}
     {!risk.length&&!due.length&&!overdue.length&&<p>Nothing urgent. Use the room for something that matters.</p>}
    </section>
    <section className="proof-rail"><ProofRecall state={state} now={now}/><ProofQuickAdd state={state} mutate={mutate} date={now} compact/></section>
   </aside>
  </div>

  <Journey state={state} mutate={mutate} now={now} mode="inline" days={21} onOpen={()=>go('Journey')}/>

  <section className="core-four">
   <div className="section-title"><div><h2>The hardest four</h2><p>The center of your board, where the goals that ask the most of you live. One step at a time still counts.</p></div><button className="text-button" onClick={()=>go('Reboot Board')}>Open the board <ArrowRight size={16}/></button></div>
   <div className="core-grid">{core.map(g=><div className="core-tile" key={g.id}><span className="core-vi">{g.originalName.vi}</span><strong>{goalName(g,state)}</strong><div className="progress-cell"><Progress g={g} state={state} date={now}/></div><span className={`status-chip ${g.status}`}>{statusLabel(g.status,g)}</span></div>)}</div>
  </section>

  <section className="reflection-strip night-card"><Chibi pose="tea" className="night-chibi"/><div><h3>What did today teach you?</h3><p>One honest sentence is enough to start.</p></div><button className="button secondary" onClick={()=>go('Journal')}><PenLine size={16}/>Open the journal</button></section>
 </>;
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
 const items:[number,string][]=[[kept,kept===1?'promise kept':'promises kept'],[streak,streak===1?'day, longest streak running':'days, longest streak running'],[c.attempt,c.attempt===1?'shot taken':'shots taken'],[c.win,c.win===1?'win logged':'wins logged']];
 if(!items.some(([n])=>n))return <p className="rh-evidence-empty">Day one. Every promise you keep from today on is counted here, and nothing you didn’t do.</p>;
 return <div className="rh-evidence">{items.map(([n,l])=><div key={l}><strong data-count={n}>{n}</strong><span>{l}</span></div>)}</div>;
}

const nudge=(total:number,done:number)=>!total?'Pick a few promises on the board, then come back here each day.':done===total?'Every promise kept today. That counts.':`${total-done} ${total-done===1?'promise':'promises'} left today. Start with the smallest one.`;

// Your own Journey line, drawn in pencil behind the hero: the shape of what you have done so far.
function HeroLine({state,now}:{state:State;now:string}){
 const W=1200,H=360;let pts:[number,number][];
 const days=range([...state.journey.map(m=>m.date)].sort()[0]??now,now).slice(-60),lv=state.journey.length>1?journeyLevels(state.journey,days):[];
 if(lv.length>2){const lo=Math.min(...lv),hi=Math.max(...lv),span=Math.max(1,hi-lo);pts=lv.map((v,i)=>[60+i/(lv.length-1)*(W-140),H-40-(v-lo)/span*(H-90)]);}
 else pts=[[60,300],[300,250],[430,280],[650,190],[820,215],[1060,70]];
 const [ax,ay]=pts.at(-1)!,[bx,by]=pts.at(-2)!,ang=Math.atan2(ay-by,ax-bx),s=22;
 return <svg className="rh-line" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
  <Rough className="rh-stroke" shape={sk.curve(pts,{strokeWidth:3,roughness:1.2,bowing:.8,seed:77})}/>
  <Rough className="rh-stroke" shape={sk.path([[ax-s*Math.cos(ang-.5),ay-s*Math.sin(ang-.5)],[ax,ay],[ax-s*Math.cos(ang+.5),ay-s*Math.sin(ang+.5)]],{strokeWidth:3,roughness:.9,seed:78})}/>
 </svg>;
}

function EvidenceLine({state,now}:{state:State;now:string}){
 const kept=promisesKept(state,now),c=proofCounts(state.proofs.filter(p=>p.date<=now));
 const parts=[kept&&<><b>{kept}</b> {kept===1?'promise':'promises'} kept to yourself</>,c.attempt&&<><b>{c.attempt}</b> {c.attempt===1?'shot':'shots'} taken</>,c.win&&<><b>{c.win}</b> {c.win===1?'win':'wins'} logged</>,c.lesson&&<><b>{c.lesson}</b> {c.lesson===1?'lesson':'lessons'} learned</>].filter(Boolean);
 if(!parts.length)return <p className="evidence">Every promise you keep from today on is counted here. Nothing is counted that you didn’t do.</p>;
 return <p className="evidence">So far: {parts.map((p,i)=><span key={i}>{i>0&&(i===parts.length-1?' and ':', ')}{p}</span>)}.</p>;
}

const fmt=(n:number)=>String(Number(n.toFixed(1)));
function shortProgress(g:Goal,s:State,d:string){const st=stats(g,s.logs,d);if(g.type==='daily')return `${st.current} of ${st.target} days in a row`;if(g.type.startsWith('weekly'))return `${fmt(st.period)} of ${criteriaAt(g,d).target} this week`;if(g.type==='measurement')return st.total?`Latest ${fmt(st.period)} ${criteriaAt(g,d).unit}`:'Needs a first measurement';return `${st.progress} of ${st.target} ${criteriaAt(g,d).unit}`;}

function greeting(name?:string){const h=new Date().getHours(),part=h<5?'Still up':h<12?'Good morning':h<18?'Good afternoon':'Good evening';return name?.trim()?`${part}, ${name.trim()}`:part;}

// The day's number in this correspondence: days since your first record, counting today.
function letterNumber(s:State,now:string){const first=[...s.logs.map(l=>l.date),...s.journey.map(m=>m.date),...s.journals.map(j=>j.date)].filter(d=>d<=now).sort()[0];if(!first)return 1;return Math.round((Date.parse(now)-Date.parse(first))/864e5)+1;}

// A streak shown as a postmark: the number of days in a row, and the target around it.
function Postmark({n,target}:{n:number;target:number}){return <div className={`postmark ${n?'':'blank'}`} aria-label={`${n} of ${target} days in a row`}><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="23"/></svg><strong>{n}</strong><span>of {target}</span></div>;}
