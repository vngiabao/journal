// Base camp: the goal card for the focused peak, then the month, week and today shelves, far to near.
import {useEffect,useState} from 'react';
import type {State,PlanGoal,PlanStep,PlanItem} from '../model';
import type {Mutate} from '../GoalControls';
import {nextStep,monthOf,weekOf,nextMonth,nextWeek,periodItems,addItem,toggleItem,itemToWeek,itemToDay,chooseOne,stepPlace,syncStepFromTodo} from '../plan';
import {addDays,label,parse} from '../dates';
import {Popover,deadlineText,boardSquare,squareLabel,ringOf,RINGS,isReached} from './shared';
import {Check,Plus,X,ArrowRight,PenLine,Trash2,Flag,Mountains} from '../icons';
import {flyChip} from './motion';

const monthName=(period:string)=>label(`${period}-01`,{month:'long'});

export interface CampProps{state:State;mutate:Mutate;goal:PlanGoal|null;gi:number;goals:PlanGoal[];now:string;evening:boolean;monthNext:boolean;setMonthNext:(v:boolean)=>void;
 onDoToday:(st:PlanStep,anchor:HTMLElement|null)=>void;onEditTrail:()=>void;onRemoveGoal:(g:PlanGoal)=>void;onPlant:(g:PlanGoal,anchor:HTMLElement)=>void;onAddStep:(anchor:HTMLElement)=>void}

export function BaseCamp(p:CampProps){
 const {state,goal,goals}=p,anyOne=goals.some(g=>g.one);
 return <div className="hz-camp">
  <div className="hz-card-col">
   {!anyOne&&goals.length>1&&<p className="hz-prompt">Which of these, if you reached it, would change the most? Make it your one goal.</p>}
   {goal&&<GoalCard key={goal.id} {...p} goal={goal}/>}
  </div>
  <div className="hz-shelves">
   <MonthShelf {...p}/>
   <WeekShelf {...p}/>
   <TodayShelf {...p}/>
  </div>
 </div>;
}

function GoalCard({state,mutate,goal:g,gi,goals,now,evening,onDoToday,onEditTrail,onRemoveGoal,onPlant,onAddStep}:CampProps&{goal:PlanGoal}){
 const done=g.steps.filter(x=>x.done).length,next=nextStep(g),dl=deadlineText(g.deadline,now),sq=boardSquare(state,g.boardGoal),reached=isReached(state,g);
 const edit=(fn:(x:PlanGoal)=>void,what:string)=>mutate(s=>{const x=s.plan?.goals.find(y=>y.id===g.id);if(x)fn(x);},what);
 const [why,setWhy]=useState(g.why??''),[title,setTitle]=useState<string|null>(null),[picker,setPicker]=useState<HTMLElement|null>(null),[stampLater,setStampLater]=useState(false),[dateOpen,setDateOpen]=useState(false);
 useEffect(()=>setWhy(g.why??''),[g.why]);
 const allDone=g.steps.length>0&&!next,onToday=next?stepPlace(state,next,now)==='today':false;
 return <section className={`hz-card ${g.one?'is-one':''}`} aria-labelledby="hz-card-title" data-card>
  <div className="hz-card-top"><p className="hz-kicker">{g.one?'Your one goal':`Goal ${gi+1} of ${goals.length}`}</p></div>
  {title===null?<h2 id="hz-card-title" className="hz-card-title"><button type="button" className="hz-title-edit" onClick={()=>setTitle(g.text)} aria-label={`${g.text}. Edit the goal`}>{g.text}<PenLine size={16}/></button></h2>
   :<form className="hz-title-form" onSubmit={e=>{e.preventDefault();const v=title.trim();if(v)edit(x=>{x.text=v;},'plan goal text');setTitle(null);}}><label className="visually-hidden" htmlFor="hz-title-input">Goal</label><input id="hz-title-input" autoFocus value={title} maxLength={140} onChange={e=>setTitle(e.target.value)} onBlur={()=>{const v=title.trim();if(v&&v!==g.text)edit(x=>{x.text=v;},'plan goal text');setTitle(null);}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setTitle(null);}}}/>{title.length>=140&&<small>Keep it under 140 characters.</small>}</form>}
  <div className="hz-card-meta">
   {g.deadline&&!dateOpen?<button type="button" className={`hz-deadline ${dl.late?'late':''}`} onClick={()=>setDateOpen(true)}>{dl.text}</button>
    :<label className="hz-date"><span>{g.deadline?'Deadline':'Set a deadline'}</span><input id="hz-deadline" type="date" value={g.deadline??''} onChange={e=>edit(x=>{x.deadline=e.target.value||undefined;},'plan deadline')} onBlur={()=>setDateOpen(false)} autoFocus={dateOpen}/></label>}
   <span className="hz-progress">{done} of {g.steps.length} steps done</span>
   {sq?<button type="button" className={`hz-chip ring-${ringOf(sq)}`} onClick={e=>setPicker(e.currentTarget)} aria-label={`Linked to board square ${squareLabel(sq,state)}. Change`}>{squareLabel(sq,state)}</button>
    :<button type="button" className="text-button hz-link" onClick={e=>setPicker(e.currentTarget)}>Link a board square</button>}
  </div>
  <label className="hz-why"><span>Why it matters</span><textarea rows={2} value={why} maxLength={400} placeholder="What changes for you, and for the people around you, when this is true?" onChange={e=>setWhy(e.target.value)} onBlur={()=>{if(why!==(g.why??''))edit(x=>{x.why=why;},'plan why');}}/></label>
  {next&&<div className="hz-next-row"><p><span>Next:</span> {next.text}</p>{onToday?<span className="hz-on-today">On today’s list</span>:<button type="button" className="button secondary" onClick={e=>onDoToday(next,e.currentTarget)}>{evening?'Do tomorrow':'Do today'}</button>}</div>}
  {allDone&&!g.reachedAt&&<div className="hz-reach"><p>Every step is done. Did you reach it?</p><div><button type="button" className="button" onClick={e=>onPlant(g,e.currentTarget)}><Flag size={16}/>Plant the flag</button><button type="button" className="text-button" onClick={e=>onAddStep(e.currentTarget)}>Not yet - add a step</button></div></div>}
  {g.reachedAt&&<div className="hz-reached"><p><Flag size={16}/>Reached {label(g.reachedAt)}.</p>
   {sq&&sq.status!=='completed'&&!stampLater&&<div className="hz-stamp-ask"><p>Stamp square {sq.row}.{sq.col} on the board too?</p><button type="button" className="button secondary" onClick={()=>mutate(s=>{const x=s.goals.find(y=>y.id===sq.id);if(x)x.status='completed';},`goal ${sq.id} status`)}>Stamp it</button><button type="button" className="text-button" onClick={()=>setStampLater(true)}>Not now</button></div>}</div>}
  {!g.reachedAt&&reached&&<p className="hz-reached-note">Square {sq?.row}.{sq?.col} is stamped on your board.</p>}
  <div className="hz-card-actions">
   {!g.one&&<button type="button" className="button secondary" onClick={()=>mutate(s=>chooseOne(s,g.id),'plan one goal')}>Make this my one goal</button>}
   <button type="button" className="text-button" onClick={onEditTrail}>Edit the trail <ArrowRight size={14}/></button>
   <button type="button" className="icon-button hz-remove" aria-label={`Remove goal: ${g.text}`} title="Remove goal" onClick={()=>onRemoveGoal(g)}><Trash2 size={17}/></button>
  </div>
  {picker&&<BoardPicker state={state} anchor={picker} value={g.boardGoal} onPick={id=>{edit(x=>{if(id)x.boardGoal=id;else delete x.boardGoal;},'plan board link');setPicker(null);}} onClose={()=>setPicker(null)}/>}
 </section>;
}

function BoardPicker({state,anchor,value,onPick,onClose}:{state:State;anchor:Element;value?:string;onPick:(id?:string)=>void;onClose:()=>void}){
 const rings=[2,1,0].map(r=>({r,goals:state.goals.filter(g=>ringOf(g)===r).sort((a,b)=>a.row-b.row||a.col-b.col)}));
 return <Popover anchor={anchor} onClose={onClose} label="Which square does this serve?" className="hz-board-pop" width={340}>
  <header className="hz-pop-head"><h3>Which square does this serve?</h3><button type="button" className="icon-button hz-pop-close" aria-label="Close" onClick={onClose}><X size={14}/></button></header>
  <div className="hz-board-list">
   <button type="button" className={!value?'on':''} aria-pressed={!value} onClick={()=>onPick(undefined)}>None</button>
   {rings.map(({r,goals})=><div key={r} role="group" aria-label={RINGS[r]}><p className="hz-kicker">{RINGS[r]}</p>{goals.map(g=><button key={g.id} type="button" className={`ring-${r} ${value===g.id?'on':''}`} aria-pressed={value===g.id} onClick={()=>onPick(g.id)}>{squareLabel(g,state)}</button>)}</div>)}
  </div>
 </Popover>;
}

// Which goal an item or to-do came from, for the small peak number beside it.
export function goalNoOf(state:State,goals:PlanGoal[],ref:{goalId?:string;stepId?:string;fromPlan?:string}){
 let gid=ref.goalId,sid=ref.stepId??ref.fromPlan;
 if(!gid&&ref.fromPlan){const it=(state.plan?.items??[]).find(x=>x.id===ref.fromPlan);if(it){gid=it.goalId;sid=it.stepId;}}
 const i=goals.findIndex(g=>g.id===gid||!!sid&&g.steps.some(x=>x.id===sid));return i>=0?i+1:null;
}
const ShelfNo=({n}:{n:number|null})=>n?<span className="hz-shelf-no" title={`Goal ${n}`} aria-label={`goal ${n}`}>{n}</span>:null;

function Ritual({text}:{text:string}){return <p className="hz-ritual">{text}</p>;}

function Shelf({kicker,title,scope,period,state,mutate,goals,toggle,move,empty,placeholder,ritual}:{kicker:string;title:string;scope:'week'|'month';period:string;state:State;mutate:Mutate;goals:PlanGoal[];
 toggle:{labels:[string,string];next:boolean;set:(v:boolean)=>void};move:{label:string;target:string;run:(s:State,id:string)=>void;moved:(it:PlanItem)=>string};empty:string;placeholder:string;ritual?:string}){
 const items=periodItems(state,scope,period),[text,setText]=useState(''),[all,setAll]=useState(false),shown=all?items:items.slice(0,3),done=items.filter(x=>x.done).length;
 return <section className="hz-shelf" data-shelf={scope} aria-label={`${kicker} - ${title}`} tabIndex={-1}>
  {ritual&&<Ritual text={ritual}/>}
  <header className="hz-shelf-head"><h3>{title}</h3>
   <div className="segmented hz-shelf-switch" role="group" aria-label={`${kicker} to plan`}>{toggle.labels.map((n,i)=><button key={n} type="button" aria-pressed={toggle.next===(i===1)} className={toggle.next===(i===1)?'selected':''} onClick={()=>toggle.set(i===1)}>{n}</button>)}</div></header>
  {items.length>0&&<p className="hz-shelf-count">{done} of {items.length} done</p>}
  <ul className="hz-items">{shown.map(it=>{const moved=move.moved(it);return <li key={it.id} className={it.done?'done':''}>
   <button type="button" className={`check-action ${it.done?'checked':''}`} aria-pressed={it.done} onClick={()=>mutate(s=>toggleItem(s,it.id),'plan list')}><span className="check-box">{it.done&&<Check size={13}/>}</span><span className="hz-item-text">{it.text}</span></button>
   <ShelfNo n={goalNoOf(state,goals,it)}/>
   {!it.done&&(moved?<span className="hz-moved">{moved}</span>:<button type="button" className="text-button hz-move" onClick={e=>{flyChip(it.text,e.currentTarget,document.querySelector(`[data-shelf="${move.target}"]`));mutate(s=>{move.run(s,it.id);},'plan list move');}}>{move.label} <ArrowRight size={13}/></button>)}
   <button type="button" className="icon-button hz-x" aria-label={`Remove “${it.text}”`} onClick={()=>mutate(s=>{if(s.plan?.items)s.plan.items=s.plan.items.filter(x=>x.id!==it.id);},'plan list remove')}><X size={13}/></button>
  </li>;})}</ul>
  {items.length>3&&<button type="button" className="text-button hz-more" onClick={()=>setAll(!all)}>{all?'Show fewer':`+${items.length-3} more`}</button>}
  <form className="hz-add-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;mutate(s=>addItem(s,scope,period,v),'plan list add');setText('');}}>
   <Plus size={16}/><input aria-label={`Add to ${title}`} value={text} maxLength={140} placeholder={items.length?placeholder:empty} onChange={e=>setText(e.target.value)}/><button className="button secondary" disabled={!text.trim()}>Add</button></form>
 </section>;
}

function MonthShelf({state,mutate,goals,now,monthNext,setMonthNext}:CampProps){
 const month=monthNext?nextMonth(now):monthOf(now),nm=nextMonth(now),left=Math.round((parse(`${nm}-01`).getTime()-parse(now).getTime())/864e5);
 const ritual=left<=3&&!monthNext?(left===1?`${monthName(nm)} starts tomorrow. Plan it before it begins.`:`${monthName(nm)} starts in ${left} days. Plan it before it begins.`):undefined;
 return <Shelf kicker="This month" title={monthName(month)} scope="month" period={month} state={state} mutate={mutate} goals={goals} ritual={ritual}
  toggle={{labels:['This month','Next month'],next:monthNext,set:setMonthNext}} empty={`What happens in ${monthName(month)}?`} placeholder="Add to the month…"
  move={{label:'To this week',target:'week',run:(s,id)=>itemToWeek(s,id,weekOf(now)),moved:it=>it.sentTo?'In this week':''}}/>;
}
function WeekShelf({state,mutate,goals,now,evening}:CampProps){
 const dow=parse(now).getDay(),weekend=dow===0||dow===6,[weekNext,setWeekNext]=useState(false),week=weekNext?nextWeek(now):weekOf(now),day=evening?addDays(now,1):now;
 return <Shelf kicker="This week" title={`Week of ${label(week)}`} scope="week" period={week} state={state} mutate={mutate} goals={goals} ritual={weekend&&!weekNext?'It’s the weekend. Plan next week now.':undefined}
  toggle={{labels:['This week','Next week'],next:weekNext,set:setWeekNext}} empty="What gets done this week?" placeholder="Add to the week…"
  move={{label:evening?'Do tomorrow':'Do today',target:'today',run:(s,id)=>itemToDay(s,id,day),moved:it=>(state.todos??[]).some(t=>t.fromPlan===it.id&&!t.done&&t.date>=now)?'On your list':''}}/>;
}
function TodayShelf({state,mutate,goals,goal,now,evening,onDoToday}:CampProps){
 const ids=new Set([...goals.flatMap(g=>g.steps.map(x=>x.id)),...(state.plan?.items??[]).map(x=>x.id)]);
 const todos=(state.todos??[]).filter(t=>t.date===now&&t.fromPlan&&ids.has(t.fromPlan)&&!t.dismissed),next=goal?nextStep(goal):undefined,late=new Date().getHours()>=19&&periodItems(state,'week',weekOf(now)).some(x=>!x.done);
 const [all,setAll]=useState(false),shown=all?todos:todos.slice(0,3);
 return <section className="hz-shelf hz-today" data-shelf="today" aria-label="Today, from your horizon" tabIndex={-1}>
  {late&&<Ritual text="Plan tomorrow tonight. Pick it from this week."/>}
  <header className="hz-shelf-head"><h3>Today</h3></header>
  <ul className="hz-items">{shown.map(t=><li key={t.id} className={t.done?'done':''}>
   <button type="button" className={`check-action ${t.done?'checked':''}`} aria-pressed={t.done} onClick={()=>mutate(s=>{const x=s.todos?.find(y=>y.id===t.id);if(!x)return;x.done=!x.done;x.doneAt=x.done?new Date().toISOString():undefined;syncStepFromTodo(s,t.id);},'todo')}><span className="check-box">{t.done&&<Check size={13}/>}</span><span className="hz-item-text">{t.text}</span></button>
   <ShelfNo n={goalNoOf(state,goals,t)}/><span className="hz-moved"><Mountains size={14}/>On your list</span>
  </li>)}</ul>
  {todos.length>3&&<button type="button" className="text-button hz-more" onClick={()=>setAll(!all)}>{all?'Show fewer':`+${todos.length-3} more`}</button>}
  {!todos.length&&<div className="hz-empty"><p>Nothing from your horizon on today’s list yet.</p>{next&&<button type="button" className="button secondary" onClick={e=>onDoToday(next,e.currentTarget)}>{evening?'Do the next step tomorrow':'Do the next step today'}</button>}</div>}
 </section>;
}
