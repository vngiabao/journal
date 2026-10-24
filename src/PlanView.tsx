// The Plan view on the Board: ten goals written as if already true, the one with the greatest impact chosen,
// its deadline and reason, and the steps to get there, as a list or as a hand-drawn map.
import {useState} from 'react';
import type {State,PlanGoal} from './model';
import type {Mutate} from './GoalControls';
import {Check,Plus,X,ArrowRight,ChevronUp,ChevronDown,Trophy} from './icons';
import {planGoals,oneGoal,addGoal,chooseOne,addStep,moveStep,toggleStep,stepToToday,nextStep,monthOf,weekOf,nextMonth,nextWeek,periodItems,addItem,toggleItem,itemToWeek,itemToDay} from './plan';
import {addDays} from './dates';
import {daysBetween,label} from './dates';
import {Rough,sk,seedOf} from './Sketch';

export function Plan({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const goals=planGoals(state),one=oneGoal(state),[text,setText]=useState('');
 return <><div className="plan">
  <section className="plan-goals" aria-labelledby="plan-goals-title">
   <h2 id="plan-goals-title">Ten goals for the next year</h2>
   <p className="muted">Write each one as if it’s already true: “I work as a product manager.” Then ask which one, if you reached it, would have the greatest positive impact on your life. Star it.</p>
   <ol className="ten-goals">{goals.map((g,i)=><li key={g.id} className={g.one?'is-one':''}>
    <span className="tg-no">{i+1}</span><span className="tg-text">{g.text}</span>
    <button type="button" className={`icon-button tg-star ${g.one?'on':''}`} aria-pressed={!!g.one} aria-label={g.one?`“${g.text}” is your one goal`:`Make “${g.text}” your one goal`} title={g.one?'Your one goal':'Make this my one goal'} onClick={()=>mutate(s=>chooseOne(s,g.id),'plan one goal')}><Trophy size={16}/></button>
    <button type="button" className="icon-button" aria-label={`Remove “${g.text}”`} onClick={()=>mutate(s=>{if(s.plan)s.plan.goals=s.plan.goals.filter(x=>x.id!==g.id);},'plan remove goal')}><X size={14}/></button>
   </li>)}</ol>
   {goals.length<10&&<form className="tg-add" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;mutate(s=>{addGoal(s,v);},'plan add goal');setText('');}}><Plus size={16}/><input aria-label="Add a goal" value={text} maxLength={140} placeholder={goals.length?`Goal ${goals.length+1}: I…`:'Goal 1: I…'} onChange={e=>setText(e.target.value)}/><button className="button" disabled={!text.trim()}>Add</button></form>}
   <p className="tg-count">{goals.length} of 10{goals.length>=10?'. That’s the list.':''}</p>
  </section>
  {one?<OneGoal g={one} mutate={mutate} now={now} state={state}/>:<section className="one-goal empty"><h2>Your one goal</h2><p>{goals.length?'Star the goal that would change the most if you reached it.':'Write your goals first. Then choose the one that matters most.'}</p></section>}
 </div>
 <PeriodLists state={state} mutate={mutate} now={now}/></>;
}

function OneGoal({g,mutate,now,state}:{g:PlanGoal;mutate:Mutate;now:string;state:State}){
 const [step,setStep]=useState(''),[view,setView]=useState<'list'|'map'>('list'),done=g.steps.filter(x=>x.done).length,next=nextStep(g);
 const left=g.deadline?daysBetween(now,g.deadline):null,onToday=new Set((state.todos??[]).filter(t=>t.date===now&&t.fromPlan).map(t=>t.fromPlan));
 const edit=(fn:(x:PlanGoal)=>void,what:string)=>mutate(s=>{const x=s.plan?.goals.find(y=>y.id===g.id);if(x)fn(x);},what);
 return <section className="one-goal" aria-labelledby="one-goal-title">
  <p className="og-kicker">Your one goal</p>
  <h2 id="one-goal-title">{g.text}</h2>
  <div className="og-row">
   <label>Deadline<input type="date" value={g.deadline??''} min={now} onChange={e=>edit(x=>{x.deadline=e.target.value||undefined;},'plan deadline')}/></label>
   {left!==null&&<span className="og-left">{left>0?`${left} days left`:left===0?'Due today':`${-left} days past the deadline`}</span>}
  </div>
  <label className="og-why">Why it matters<textarea rows={2} value={g.why??''} maxLength={400} placeholder="What changes for you, and for the people around you, when this is true?" onChange={e=>edit(x=>{x.why=e.target.value;},'plan why')}/></label>
  <div className="og-steps-head"><h3>Every step to get there <span>{done} of {g.steps.length} done</span></h3>
   <div className="segmented og-view" role="tablist" aria-label="Plan view">{(['list','map'] as const).map(v=><button key={v} type="button" role="tab" aria-selected={view===v} className={view===v?'selected':''} onClick={()=>setView(v)}>{v==='list'?'List':'Map'}</button>)}</div></div>
  {g.steps.length>0&&<div className="og-meter" aria-hidden="true"><em style={{transform:`scaleX(${done/g.steps.length})`}}/></div>}
  {view==='list'?<ol className="og-steps">{g.steps.map((x,i)=><li key={x.id} className={x.done?'done':''}>
    <button type="button" className={`check-action ${x.done?'checked':''}`} aria-pressed={x.done} onClick={()=>mutate(s=>toggleStep(s,g.id,x.id),'plan step')}><span className="check-box">{x.done&&<Check size={13}/>}</span><span>{x.text}</span></button>
    {!x.done&&(onToday.has(x.id)?<span className="og-on-today">On today’s list</span>:<button type="button" className="text-button" onClick={()=>mutate(s=>{stepToToday(s,g.id,x.id,now);},'plan step to today')}>Do today <ArrowRight size={13}/></button>)}
    <span className="og-move"><button type="button" className="icon-button" aria-label={`Move “${x.text}” up`} disabled={i===0} onClick={()=>mutate(s=>moveStep(s,g.id,x.id,-1),'plan order')}><ChevronUp size={14}/></button><button type="button" className="icon-button" aria-label={`Move “${x.text}” down`} disabled={i===g.steps.length-1} onClick={()=>mutate(s=>moveStep(s,g.id,x.id,1),'plan order')}><ChevronDown size={14}/></button></span>
    <button type="button" className="icon-button" aria-label={`Remove “${x.text}”`} onClick={()=>edit(y=>{y.steps=y.steps.filter(z=>z.id!==x.id);},'plan remove step')}><X size={13}/></button>
   </li>)}</ol>:<GoalMap g={g}/>}
  <form className="tg-add og-add" onSubmit={e=>{e.preventDefault();const v=step.trim();if(!v)return;mutate(s=>addStep(s,g.id,v),'plan add step');setStep('');}}><Plus size={16}/><input aria-label="Add a step" value={step} maxLength={140} placeholder={g.steps.length?'Next step…':'List everything you’ll need to do, one step at a time'} onChange={e=>setStep(e.target.value)}/><button className="button" disabled={!step.trim()}>Add</button></form>
  {next&&!onToday.has(next.id)&&<p className="og-today">Do one thing toward it today: <b>{next.text}</b> <button type="button" className="button secondary" onClick={()=>mutate(s=>{stepToToday(s,g.id,next.id,now);},'plan step to today')}>Add to today</button></p>}
  {g.deadline&&<p className="og-foot">Set {label(g.createdAt.slice(0,10),{month:'short',day:'numeric'})} · due {label(g.deadline,{month:'short',day:'numeric',year:'numeric'})}</p>}
 </section>;
}

// The goal in the middle, its steps around it, drawn in pencil like the Journey line. Finished steps are inked in.
function GoalMap({g}:{g:PlanGoal}){
 const W=640,H=480,cx=W/2,cy=H/2,n=Math.max(1,g.steps.length),r=Math.min(175,128+n*5);
 const wrap=(t:string,max:number)=>{const out:string[]=[];let line='';for(const w of t.split(/\s+/)){if((line+' '+w).trim().length>max){if(line)out.push(line);line=w;}else line=(line+' '+w).trim();}if(line)out.push(line);return out.slice(0,4);};
 return <figure className="goal-map"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of “${g.text}” and ${g.steps.length} steps`}>
  {g.steps.map((x,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,px=cx+Math.cos(a)*r*1.25,py=cy+Math.sin(a)*r*.82,mx=(cx+px)/2+Math.sin(a)*14,my=(cy+py)/2-Math.cos(a)*14;
   return <g key={x.id} className={`gm-step ${x.done?'done':''}`}>
    <Rough className="gm-branch" shape={sk.curve([[cx,cy],[mx,my],[px,py]],{roughness:1,strokeWidth:1.4,seed:seedOf(x.id)})}/>
    <Rough className="gm-node" shape={sk.circle(px,py,20,{roughness:1.1,strokeWidth:1.3,...(x.done?{fill:'F',fillStyle:'solid'}:{}),seed:seedOf(x.id+'n')})}/>
    {x.done&&<path d={`M${px-6} ${py} l5 5 l8 -9`} className="gm-tick"/>}
    {wrap(x.text,20).map((l,k,all)=><text key={k} x={px} y={py+(py<cy?-26-(all.length-1-k)*19:34+k*19)} textAnchor="middle" className="gm-label">{l}</text>)}
   </g>;})}
  <Rough className="gm-core" shape={sk.circle(cx,cy,156,{roughness:1.2,strokeWidth:1.8,fill:'F',fillStyle:'solid',seed:seedOf(g.id)})}/>
  {wrap(g.text,15).map((l,k,all)=><text key={k} x={cx} y={cy+(k-(all.length-1)/2)*22+6} textAnchor="middle" className="gm-goal">{l}</text>)}
 </svg>{!g.steps.length&&<figcaption>Add steps below and they branch out from your goal.</figcaption>}</figure>;
}

// The book's lists: plan the month before it begins, the week before it begins, then each day from the week.
function PeriodLists({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const dow=new Date(`${now}T12:00:00`).getDay(),late=Number(now.slice(8))>=new Date(Number(now.slice(0,4)),Number(now.slice(5,7)),0).getDate()-3;
 const [monthNext,setMonthNext]=useState(late),[weekNext,setWeekNext]=useState(dow===0||dow===6);
 const month=monthNext?nextMonth(now):monthOf(now),week=weekNext?nextWeek(now):weekOf(now);
 return <section className="period-lists" aria-labelledby="period-title">
  <div className="pl-head"><h2 id="period-title">Plan the month, then the week</h2><p className="muted">Make the month’s list before it starts. Each weekend, move what comes next into the week. Each evening, move tomorrow’s from the week onto your list.</p></div>
  <div className="pl-grid">
   <PeriodCard title={label(`${month}-01`,{month:'long',year:'numeric'})} scope="month" period={month} next={monthNext} onNext={setMonthNext} nextLabel={['This month','Next month']} state={state} mutate={mutate} now={now}
    move={{label:'To this week',run:(s,id)=>itemToWeek(s,id,weekOf(now)),moved:it=>it.sentTo?'In a week’s list':''}}/>
   <PeriodCard title={`Week of ${label(week,{month:'short',day:'numeric'})}`} scope="week" period={week} next={weekNext} onNext={setWeekNext} nextLabel={['This week','Next week']} state={state} mutate={mutate} now={now}
    move={{label:new Date().getHours()>=17?'Do tomorrow':'Do today',run:(s,id)=>itemToDay(s,id,new Date().getHours()>=17?addDays(now,1):now),moved:it=>(state.todos??[]).some(t=>t.fromPlan===it.id&&!t.done&&t.date>=now)?'On your list':''}}/>
  </div>
 </section>;
}
function PeriodCard({title,scope,period,next,onNext,nextLabel,state,mutate,move}:{title:string;scope:'week'|'month';period:string;next:boolean;onNext:(v:boolean)=>void;nextLabel:[string,string];state:State;mutate:Mutate;now:string;move:{label:string;run:(s:State,id:string)=>void;moved:(it:ReturnType<typeof periodItems>[number])=>string}}){
 const items=periodItems(state,scope,period),[text,setText]=useState(''),done=items.filter(x=>x.done).length;
 return <div className="pl-card">
  <div className="pl-card-head"><h3>{title}</h3><div className="segmented pl-switch" role="tablist" aria-label={`${scope} to plan`}>{nextLabel.map((n,i)=><button key={n} type="button" role="tab" aria-selected={next===(i===1)} className={next===(i===1)?'selected':''} onClick={()=>onNext(i===1)}>{n}</button>)}</div></div>
  {items.length>0&&<p className="pl-count">{done} of {items.length} done</p>}
  <ul className="pl-items">{items.map(it=>{const moved=move.moved(it);return <li key={it.id} className={it.done?'done':''}>
   <button type="button" className={`check-action ${it.done?'checked':''}`} aria-pressed={it.done} onClick={()=>mutate(s=>toggleItem(s,it.id),'plan list')}><span className="check-box">{it.done&&<Check size={13}/>}</span><span>{it.text}</span></button>
   {!it.done&&(moved?<span className="og-on-today">{moved}</span>:<button type="button" className="text-button" onClick={()=>mutate(s=>{move.run(s,it.id);},'plan list move')}>{move.label} <ArrowRight size={13}/></button>)}
   <button type="button" className="icon-button" aria-label={`Remove “${it.text}”`} onClick={()=>mutate(s=>{if(s.plan?.items)s.plan.items=s.plan.items.filter(x=>x.id!==it.id);},'plan list remove')}><X size={13}/></button>
  </li>;})}</ul>
  {!items.length&&<p className="pl-empty">{scope==='month'?'What has to happen this month? Write all of it down.':'What will you get done this week? Pull it from the month.'}</p>}
  <form className="tg-add" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;mutate(s=>addItem(s,scope,period,v),'plan list add');setText('');}}><Plus size={16}/><input aria-label={`Add to ${title}`} value={text} maxLength={140} placeholder={scope==='month'?'Add to the month…':'Add to the week…'} onChange={e=>setText(e.target.value)}/><button className="button" disabled={!text.trim()}>Add</button></form>
 </div>;
}
