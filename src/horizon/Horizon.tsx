// Horizon: who you're becoming, as one hand-drawn mind map per horizon - this year, in 5 years, in 10, at 40, and any
// horizon you add. "Me" sits in the middle; each area of life is a branch. On "This year" the branches carry your goals
// (the ten-goal plan), each with its next step and "Do today". This file owns the goals - adding, editing, the one
// goal, removing with undo, and the step popover. LifeMap draws the map and owns the visions, areas and horizons.
import {useEffect,useRef,useState} from 'react';
import './horizon.css';
import type {State,PlanGoal,PlanStep} from '../model';
import type {Mutate} from '../GoalControls';
import {planGoals,addGoal,addStep,chooseOne,linkBoard,moveStep,toggleStep,stepToToday,stepToPeriod,removeGoal,restoreGoal,removeStep,restoreStep,renameStep,setStepDue,renameGoal,setGoalDeadline,weekOf,monthOf} from '../plan';
import {setGoalArea,lifeAreas} from './life';
import {addDays} from '../dates';
import {usePocketPets} from '../Pet';
import {burst,inkStamp} from '../delight';
import {StonePopover,type StoneAction} from './StonePopover';
import {LifeMap,type GoalActions} from './LifeMap';
import {Popover,UndoBar,Bond,ss,squareLabel,HORIZON_KEY,OPEN_AREA_KEY,GOAL_MAX} from './shared';
import {gsap,whenMotionOK,useGSAP,motionOK} from './motion';


type Pop={kind:'step';goalId:string;stepId:string;anchor:HTMLElement|null}|{kind:'addGoal';area?:string;anchor:HTMLElement|null}
 |{kind:'addStep';goalId:string;anchor:HTMLElement|null}|{kind:'editGoal';goalId:string;anchor:HTMLElement|null};

export function Horizon({state,mutate,now,go:_go}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void}){
 const goals=planGoals(state),pet=usePocketPets()!=='off',evening=new Date().getHours()>=17;
 const [pop,setPop]=useState<Pop|null>(null);
 const [undo,setUndo]=useState<{text:string;run:()=>void;key:number}|null>(null),[toast,setToast]=useState<{text:string;key:number}|null>(null);
 const goalOf=(id:string)=>goals.find(g=>g.id===id);

 // A step goes onto today's list as an A task (tomorrow's after 5 pm). A small stamp says it landed.
 const doToday=(g:PlanGoal,st:PlanStep,anchor:HTMLElement|null)=>{const day=evening?addDays(now,1):now;
  mutate(s=>{stepToToday(s,g.id,st.id,day);},'plan step to today');
  const r=anchor?.getBoundingClientRect();if(r)inkStamp(r.left+r.width/2,r.top+r.height/2,evening?'Tomorrow':'Today');};
 const dropStep=(gid:string,stepId:string)=>{let removed:ReturnType<typeof removeStep>;mutate(s=>{removed=removeStep(s,gid,stepId);},'plan remove step');
  setUndo({text:'Step removed. Undo',key:Date.now(),run:()=>{const r=removed;if(r)mutate(s=>restoreStep(s,gid,r.step,r.index),'plan restore step');}});};
 const dropGoal=(g:PlanGoal)=>{let removed:ReturnType<typeof removeGoal>;mutate(s=>{removed=removeGoal(s,g.id);},'plan remove goal');setPop(null);
  setUndo({text:'Goal removed. Undo',key:Date.now(),run:()=>{const r=removed;if(r)mutate(s=>restoreGoal(s,r.goal,r.index),'plan restore goal');}});};
 const stoneAction=(a:StoneAction,g:PlanGoal,st:PlanStep,anchor:HTMLElement|null)=>{setPop(null);
  if(a==='today')doToday(g,st,anchor);
  else if(a==='week')mutate(s=>{stepToPeriod(s,g.id,st.id,'week',weekOf(now));},'plan step to week');
  else if(a==='month')mutate(s=>{stepToPeriod(s,g.id,st.id,'month',monthOf(now));},'plan step to month');
  else if(a==='done'){mutate(s=>toggleStep(s,g.id,st.id),'plan step');const r=anchor?.getBoundingClientRect();if(r&&!st.done)inkStamp(r.left+r.width/2,r.top+r.height/2,'Done');}
  else if(a==='earlier'||a==='later')mutate(s=>moveStep(s,g.id,st.id,a==='earlier'?-1:1),'plan order');
  else if(a==='remove')dropStep(g.id,st.id);
 };
 // Adding a goal: on its branch when an area is given, else it waits under the map for one. The first one gets a moment.
 const add=(text:string,area?:string,from?:Element|null)=>{const first=goals.length===0;
  mutate(s=>{const g=addGoal(s,text);if(area)setGoalArea(s,g.id,area);},'plan add goal');setPop(null);
  if(first){const r=from?.getBoundingClientRect();if(r)burst(r.left+r.width/2,r.top,40);
   setToast({text:area?'Your first goal is on the map. Add the next whenever it comes to you.':'Your first goal is written down. Pick its part of life, under the map, to put it on a branch.',key:Date.now()});}};

 const actions:GoalActions={evening,canAdd:goals.length<GOAL_MAX,
  onStep:(g,st,anchor)=>setPop({kind:'step',goalId:g.id,stepId:st.id,anchor}),
  onDoToday:doToday,
  onAddGoal:(anchor,area)=>setPop({kind:'addGoal',area,anchor}),
  onFirstGoal:add,
  onAddStep:(g,anchor)=>setPop({kind:'addStep',goalId:g.id,anchor}),
  onEditGoal:(g,anchor)=>setPop({kind:'editGoal',goalId:g.id,anchor}),
  onToggleOne:g=>mutate(s=>chooseOne(s,g.id),'plan one goal')};

 const pg=pop&&pop.kind!=='addGoal'?goalOf(pop.goalId):undefined,ps=pop?.kind==='step'&&pg?pg.steps.find(x=>x.id===pop.stepId):undefined;
 const areaName=(id?:string)=>lifeAreas(state).find(a=>a.id===id)?.name;
 return <>
  <div className="page-heading hz-heading">
   <h1>Horizon<span className="title-period">.</span></h1>
   <p>Who you’re becoming - this year, in 5 years, in 10, and at 40.</p>
  </div>
  <div className="horizon" data-own-motion>
   <LifeMap state={state} mutate={mutate} goals={goals} now={now} actions={actions}/>
  </div>
  {pop?.kind==='step'&&pg&&ps&&<StonePopover state={state} goal={pg} step={ps} now={now} anchor={pop.anchor} evening={evening} onClose={()=>setPop(null)}
   onAction={a=>stoneAction(a,pg,ps,pop.anchor)} onRename={t=>mutate(s=>renameStep(s,pg.id,ps.id,t),'plan step text')} onDue={d=>mutate(s=>setStepDue(s,pg.id,ps.id,d),'plan step date')}/>}
  {pop?.kind==='addGoal'&&<AddGoal anchor={pop.anchor} count={goals.length} area={areaName(pop.area)} onClose={()=>setPop(null)} onAdd={t=>add(t,pop.area,pop.anchor)}/>}
  {pop?.kind==='addStep'&&pg&&<AddStep anchor={pop.anchor} goal={pg} onClose={()=>setPop(null)} onAdd={t=>mutate(s=>{addStep(s,pg.id,t);},'plan add step')}/>}
  {pop?.kind==='editGoal'&&pg&&<EditGoal anchor={pop.anchor} goal={pg} state={state} onClose={()=>setPop(null)} onRemove={()=>dropGoal(pg)}
   onSave={(text,deadline,board)=>{mutate(s=>{renameGoal(s,pg.id,text);setGoalDeadline(s,pg.id,deadline);linkBoard(s,pg.id,board);},'plan edit goal');setPop(null);}}/>}
  {undo&&<UndoBar key={undo.key} text={undo.text} onUndo={undo.run} onDone={()=>setUndo(null)}/>}
  {toast&&<HzToast key={toast.key} text={toast.text} pet={pet} onDone={()=>setToast(null)}/>}
 </>;
}

function AddGoal({anchor,count,area,onAdd,onClose}:{anchor:Element|null;count:number;area?:string;onAdd:(t:string)=>void;onClose:()=>void}){
 const [text,setText]=useState('');
 return <Popover anchor={anchor} onClose={onClose} label={area?`A goal for ${area}, this year`:'A goal for this year'} className="hz-add-pop" width={380}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(v)onAdd(v);}}>
   <label><span className="hz-pop-label">{area??'A goal'}<span className="hz-count">this year · {count} of {GOAL_MAX}</span></span>
    <input autoFocus value={text} maxLength={140} placeholder="I …" onChange={e=>setText(e.target.value)}/></label>
   <small>{text.length>=140?'Keep it under 140 characters.':'Write it as if it’s already true: “I work as a product manager.”'}</small>
   <div className="hz-pop-buttons"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="button" disabled={!text.trim()}>Add it</button></div>
  </form>
 </Popover>;
}
function AddStep({anchor,goal,onAdd,onClose}:{anchor:Element|null;goal:PlanGoal;onAdd:(t:string)=>void;onClose:()=>void}){
 const [text,setText]=useState(''),[added,setAdded]=useState(0);
 return <Popover anchor={anchor} onClose={onClose} label="What comes next?" className="hz-add-pop" width={360}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onAdd(v);setText('');setAdded(a=>a+1);}}>
   <label><span className="hz-pop-label">What comes next?</span><input autoFocus value={text} maxLength={140} placeholder="One step, in a few words" onChange={e=>setText(e.target.value)}/></label>
   <small>{added?`Added ${added} to “${goal.text.length>40?goal.text.slice(0,38)+'…':goal.text}”. Keep going, or press Esc.`:'List every step you can think of. Order them later.'}</small>
   <div className="hz-pop-buttons"><button type="button" className="text-button" onClick={onClose}>Done</button><button className="button" disabled={!text.trim()}>Add</button></div>
  </form>
 </Popover>;
}
// The goal's words, its deadline and the board square it serves. Removing lives here too, with Undo after.
function EditGoal({anchor,goal,state,onSave,onRemove,onClose}:{anchor:Element|null;goal:PlanGoal;state:State;onSave:(t:string,deadline?:string,board?:string)=>void;onRemove:()=>void;onClose:()=>void}){
 const [text,setText]=useState(goal.text),[deadline,setDeadline]=useState(goal.deadline??''),[board,setBoard]=useState(goal.boardGoal??'');
 const squares=[...state.goals].sort((a,b)=>a.row-b.row||a.col-b.col);
 return <Popover anchor={anchor} onClose={onClose} label="Edit the goal" className="hz-add-pop" width={420}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();if(text.trim())onSave(text,deadline||undefined,board||undefined);}}>
   <label><span className="hz-pop-label">The goal</span><input autoFocus value={text} maxLength={140} onChange={e=>setText(e.target.value)}/></label>
   <div className="hz-pop-pair">
    <label><span className="hz-field">Deadline</span><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
    <label><span className="hz-field">Board square</span><select value={board} onChange={e=>setBoard(e.target.value)}><option value="">None</option>{squares.map(g=><option key={g.id} value={g.id}>{squareLabel(g,state)}</option>)}</select></label>
   </div>
   <div className="hz-pop-buttons"><button type="button" className="text-button lm-remove" onClick={onRemove}>Remove</button><span className="lm-spacer"/><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="button" disabled={!text.trim()}>Save</button></div>
  </form>
 </Popover>;
}

// The first goal's moment: Bond cheers beside the line when he's out; otherwise the line alone.
function HzToast({text,pet,onDone}:{text:string;pet:boolean;onDone:()=>void}){
 const el=useRef<HTMLDivElement>(null),done=useRef(onDone);done.current=onDone;
 useEffect(()=>{const t=window.setTimeout(()=>{if(motionOK()&&el.current)gsap.to(el.current,{opacity:0,y:8,duration:.2,ease:'enter',onComplete:()=>done.current()});else done.current();},4200);
  const node=el.current;return()=>{clearTimeout(t);if(node)gsap.killTweensOf(node);};},[]);
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from(el.current,{y:16,opacity:0,duration:.24,ease:'enter',clearProps:'opacity,transform'});});return()=>mm.revert();},{scope:el});
 return <div ref={el} className="hz-toast" role="status">{pet&&<Bond pose="cheer"/>}<p>{text}</p></div>;
}

// One line for the Board's goal drawer: "On your horizon: goal 2 · 4 of 9 steps · Open Horizon". Null when no goal links here.
export function HorizonBoardLine({state,goalId,go}:{state:State;goalId:string;go:(p:string)=>void}){
 const goals=planGoals(state),i=goals.findIndex(g=>g.boardGoal===goalId);if(i<0)return null;const g=goals[i],done=g.steps.filter(x=>x.done).length;
 return <p className="hz-board-line"><span>On your horizon: goal {i+1} · {done} of {g.steps.length} steps</span> · <button type="button" className="text-button" onClick={()=>{ss.set(HORIZON_KEY,'year');if(g.area)ss.set(OPEN_AREA_KEY,g.area);go('Horizon');}}>Open Horizon</button></p>;
}

