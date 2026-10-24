// Horizon: the long game in one picture. Distance is time: the ten goals stand on the skyline, a single trail climbs
// from your feet to the peak you're focused on, and base camp (this month, this week, today) sits up close.
// Views: Horizon (the landscape), Life (a wheel of every life area, from this year out to 40) and Year (the next twelve months).
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import './horizon.css';
import type {State,PlanGoal,PlanStep} from '../model';
import type {Mutate} from '../GoalControls';
import {planGoals,addGoal,addStep,chooseOne,linkBoard,moveStep,toggleStep,stepToToday,stepToPeriod,nextStep,removeGoal,restoreGoal,removeStep,restoreStep,renameStep,setStepDue,reachGoal,weekOf,monthOf,stepPlace} from '../plan';
import {addDays} from '../dates';
import {usePocketPets} from '../Pet';
import {burst,inkStamp} from '../delight';
import {Ridge} from './Ridge';
import {Trail} from './Trail';
import {BaseCamp} from './BaseCamp';
import {StonePopover,type StoneAction} from './StonePopover';
import {StepsDrawer} from './StepsDrawer';
import {YearView} from './YearView';
import {LifeMap} from './LifeMap';
import {ridgeLayout,BAND_DESKTOP,BAND_PHONE,BAND_SHORT} from './geometry';
import {SkyLine,Popover,UndoBar,Bond,ss,useWidth,usePhone,useShort,useMaxOpen,SHORTCUT_SKIP,type BondPose} from './shared';
import {gsap,whenMotionOK,useGSAP,motionOK,flyChip,CLEAR_DASH} from './motion';

type View='horizon'|'map'|'year';
const VIEWS:[View,string][]=[['horizon','Horizon'],['map','Life'],['year','Year']];
const FOCUS_KEY='reboot-horizon-focus',VIEW_KEY='reboot-horizon-view',ARRIVED_KEY='reboot-horizon-arrived';
const CENTRE_FOUR:[string,string][]=[['16','Get a job'],['15','A girlfriend'],['21','Reach 75 kg'],['22','Land an investor or accelerator']];

type Pop={kind:'stone';stepId:string;anchor:HTMLElement}|{kind:'goal';anchor:HTMLElement|null;text?:string;board?:string}|{kind:'step';anchor:HTMLElement|null};

export function Horizon({state,mutate,now,go:_go}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void}){
 const goals=planGoals(state),pets=usePocketPets(),pet=pets!=='off',phone=usePhone(),short=useShort(),maxOpen=useMaxOpen();
 const [view,setViewState]=useState<View>(()=>{const v=ss.get(VIEW_KEY);return v==='map'||v==='year'?v:'horizon';});
 const [focusId,setFocusId]=useState(()=>ss.get(FOCUS_KEY)??'');
 const focus=goals.find(g=>g.id===focusId)??goals.find(g=>g.one)??goals[0]??null,fi=focus?goals.indexOf(focus):-1;
 const [pop,setPop]=useState<Pop|null>(null),[drawer,setDrawer]=useState(false),[expanded,setExpanded]=useState(false);
 const [undo,setUndo]=useState<{text:string;run:()=>void;key:number}|null>(null),[toast,setToast]=useState<{text:string;key:number}|null>(null);
 const [bondPose,setBondPose]=useState<BondPose>('sit'),poseTimer=useRef(0);
 const [monthNext,setMonthNext]=useState(false);
 const evening=new Date().getHours()>=17;
 const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),ridgeRef=useRef<HTMLDivElement>(null),trailCol=useRef<HTMLDivElement>(null);
 const stageKey=`${view}-${goals.length>0}`,stageW=useWidth(stage,1000,stageKey),trailW=useWidth(trailCol,600,stageKey);
 const band=phone?BAND_PHONE:short?BAND_SHORT:BAND_DESKTOP,oneIndex=goals.findIndex(g=>g.one);
 const ridge=useMemo(()=>ridgeLayout(goals.length,Math.max(1,stageW),oneIndex,band),[goals.length,stageW,oneIndex,band]);
 const peak=focus&&ridge.peaks[fi]?{x:ridge.peaks[fi].x,y:ridge.peaks[fi].base-6}:null;
 const action=useRef<'pointer'|'key'>('pointer'),lastVia=useRef<'pointer'|'key'>('pointer');

 const setView=(v:View)=>{setViewState(v);ss.set(VIEW_KEY,v);setPop(null);};
 const focusGoal=useCallback((id:string)=>{setFocusId(id);ss.set(FOCUS_KEY,id);setExpanded(false);},[]);
 const pose=(p:BondPose,ms=1400)=>{clearTimeout(poseTimer.current);setBondPose(p);poseTimer.current=window.setTimeout(()=>setBondPose('sit'),ms);};
 const editStep=(fn:(s:State,g:PlanGoal)=>void,what:string)=>{if(!focus)return;mutate(s=>{const g=s.plan?.goals.find(x=>x.id===focus.id);if(g)fn(s,g);},what);};

 // The chain: a step goes onto today's list (tomorrow's after 5 pm), into this week, or into this month.
 const doToday=(st:PlanStep,anchor:HTMLElement|null)=>{if(!focus)return;const day=evening?addDays(now,1):now;
  mutate(s=>{stepToToday(s,focus.id,st.id,day);},'plan step to today');if(day===now)flyChip(st.text,anchor,document.querySelector('[data-shelf="today"]'));pose('tilt');};
 const pending=useRef<(()=>void)|null>(null);
 useEffect(()=>()=>{pending.current?.();},[]);
 const complete=(st:PlanStep,anchor:Element|null)=>{if(!focus||pending.current)return;lastVia.current=action.current;const gid=focus.id;const run=()=>{pending.current=null;mutate(s=>toggleStep(s,gid,st.id),'plan step');};
  const stone=anchor?.closest('.hz-stone')??root.current?.querySelector(`.hz-stone[data-step="${st.id}"]`);
  if(st.done||action.current==='key'||!motionOK()||!stone){run();return;}
  const r=stone.getBoundingClientRect();inkStamp(r.left+r.width/2+60,r.top+r.height/2,'Done');
  const behind=root.current?.querySelector('.hz-behind,.hz-trail-svg');const to=behind?.getBoundingClientRect();
  pending.current=run;stone.classList.add('is-done');
  gsap.timeline({onComplete:run}).to(stone,{scale:1.12,duration:.15,ease:'stamp'}).to(stone,{scale:1,duration:.15,ease:'stamp'})
   .to(stone,{y:to?Math.max(0,to.bottom-40-r.top):40,opacity:.0,duration:.4,ease:'move'});
 };
 const stoneAction=(a:StoneAction,st:PlanStep,anchor:Element|null)=>{if(!focus)return;const gid=focus.id,i=focus.steps.findIndex(x=>x.id===st.id);setPop(null);
  if(a==='today')doToday(st,anchor as HTMLElement|null);
  else if(a==='week'){mutate(s=>{stepToPeriod(s,gid,st.id,'week',weekOf(now));},'plan step to week');flyChip(st.text,anchor,document.querySelector('[data-shelf="week"]'));pose('tilt');}
  else if(a==='month'){mutate(s=>{stepToPeriod(s,gid,st.id,'month',monthOf(now));},'plan step to month');setMonthNext(false);flyChip(st.text,anchor,document.querySelector('[data-shelf="month"]'));}
  else if(a==='done')complete(st,root.current?.querySelector(`.hz-stone[data-step="${st.id}"]`)??null);
  else if(a==='earlier'||a==='later')mutate(s=>moveStep(s,gid,st.id,a==='earlier'?-1:1),'plan order');
  else if(a==='remove')dropStep(st.id);
  void i;
 };
 const dropStep=(stepId:string)=>{if(!focus)return;const gid=focus.id;let removed:ReturnType<typeof removeStep>;mutate(s=>{removed=removeStep(s,gid,stepId);},'plan remove step');
  setUndo({text:'Removed. Undo',key:Date.now(),run:()=>{const r=removed;if(r)mutate(s=>restoreStep(s,gid,r.step,r.index),'plan restore step');}});};
 const dropGoal=(g:PlanGoal)=>{let removed:ReturnType<typeof removeGoal>;mutate(s=>{removed=removeGoal(s,g.id);},'plan remove goal');
  setUndo({text:'Removed. Undo',key:Date.now(),run:()=>{const r=removed;if(r){mutate(s=>restoreGoal(s,r.goal,r.index),'plan restore goal');focusGoal(r.goal.id);}}});};
 const plant=(g:PlanGoal)=>{mutate(s=>reachGoal(s,g.id,now),'plan reach goal');pose('flag',3200);setToast({text:'Flag planted. That one’s yours for good.',key:Date.now()});
  const btn=root.current?.querySelector(`.hz-peak[data-goal="${g.id}"] .hz-pennant`)?.getBoundingClientRect();if(btn)burst(btn.left+btn.width/2,btn.top,48);};

 // Keyboard map (outside text fields): G add goal, 1-9/0 focus, S make it the one, N add a step, T next step to today,
 // J/K or arrows move between stones, W/M/X act on the stone in focus (or the next one), Y year view.
 const latest=useRef({goals,focus,pop,drawer,view});latest.current={goals,focus,pop,drawer,view};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const t=e.target instanceof Element?e.target:null;
  if(e.ctrlKey||e.metaKey||e.altKey||t?.closest(SHORTCUT_SKIP)||t?.closest('.hz-popover,.hz-drawer'))return;
  const {goals:gs,focus:f,pop:p,drawer:d,view:v}=latest.current;if(p||d)return;const k=e.key.toLowerCase();
  const stoneFocus=t?.closest('[data-step]') as HTMLElement|null,stepOf=()=>{const id=stoneFocus?.dataset.step;return f?(id?f.steps.find(x=>x.id===id):nextStep(f)):undefined;};
  const stones=()=>[...(root.current?.querySelectorAll<HTMLElement>(v==='map'?'.lm-next-text[data-step]':'.hz-stone[data-step]')??[])];
  if(k==='y'){e.preventDefault();setView(v==='year'?'horizon':'year');return;}
  if(/^[0-9]$/.test(k)){const n=k==='0'?9:Number(k)-1;if(gs[n]){e.preventDefault();focusGoal(gs[n].id);}return;}
  if(k==='g'&&gs.length<10){e.preventDefault();setPop({kind:'goal',anchor:root.current?.querySelector('.hz-add')??null});return;}
  if(!f)return;
  if(k==='s'){e.preventDefault();mutate(s=>{const g=s.plan?.goals.find(x=>x.id===f.id);if(g&&!g.one)chooseOne(s,f.id);},'plan one goal');return;}
  if(k==='n'){e.preventDefault();setPop({kind:'step',anchor:root.current?.querySelector('.hz-add-stone')??null});return;}
  if(k==='j'||k==='k'||(stoneFocus&&(e.key==='ArrowDown'||e.key==='ArrowUp'))){const list=stones();if(!list.length)return;e.preventDefault();
   // On the trail the next stone is lowest, so "down" (J) goes toward the next step, "up" (K) climbs.
   const i=stoneFocus?list.indexOf(stoneFocus):-1,down=k==='j'||e.key==='ArrowDown',j=v==='map'?(i<0?0:i+(down?1:-1)):(i<0?0:i+(down?-1:1));list[Math.max(0,Math.min(list.length-1,j))]?.focus();return;}
  const st=stepOf();if(!st)return;
  if(k==='t'){e.preventDefault();if(stepPlace(state,st,now)!=='today')doToday(st,stoneFocus);return;}
  if(k==='w'){e.preventDefault();mutate(s=>{stepToPeriod(s,f.id,st.id,'week',weekOf(now));},'plan step to week');return;}
  if(k==='m'){e.preventDefault();mutate(s=>{stepToPeriod(s,f.id,st.id,'month',monthOf(now));},'plan step to month');return;}
  if(k==='x'){e.preventDefault();action.current='key';complete(st,null);action.current='pointer';return;}
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});

 // Arrival: once per session in full (about 1.4 s), then only a quick fade. Any click or key finishes it at once.
 useGSAP(()=>{if(!goals.length||view!=='horizon')return;let tl:gsap.core.Timeline|null=null;
  const mm=whenMotionOK(()=>{const q=(s:string)=>gsap.utils.toArray<Element>(s,root.current);
   if(ss.get(ARRIVED_KEY)){gsap.from(root.current,{opacity:0,duration:.25,ease:'enter',clearProps:'opacity'});return;}
   ss.set(ARRIVED_KEY,'1');tl=gsap.timeline({defaults:{ease:'enter'}});
   tl.from(q('.hz-sky'),{opacity:0,y:8,duration:.5,clearProps:'opacity,transform'},.1)
    .from(q('.hz-ridge-line path'),{drawSVG:'0%',duration:.9,ease:'pen',clearProps:CLEAR_DASH},.2)
    .from(q('.hz-card-col, .hz-shelves > *'),{opacity:0,y:16,duration:.5,stagger:.08,clearProps:'opacity,transform'},.4)
    .from(q('.hz-pennant'),{scale:.6,opacity:0,duration:.35,stagger:.05,transformOrigin:'0% 100%',clearProps:'opacity,transform'},.55)
    .from(q('.hz-trail-line path'),{drawSVG:'0%',duration:.8,ease:'pen',clearProps:CLEAR_DASH},.6)
    .from(q('.hz-stone-row, .hz-stone-art'),{opacity:0,scale:.8,duration:.3,stagger:.06,transformOrigin:'50% 50%',clearProps:'opacity,transform'},.65)
    .from(q('.hz-connector path'),{drawSVG:'0%',duration:.5,ease:'move',clearProps:CLEAR_DASH},1.1)
    .from(q('.hz-hatch-clip'),{attr:{y:band.base,height:0},duration:.6},.7)
    .from(q('.hz-ridge .hz-seal'),{scale:2.4,rotation:-30,opacity:0,duration:.42,ease:'stamp',clearProps:'opacity,transform'},1)
    .from(q('.hz-trail-bond'),{x:-24,opacity:0,duration:.4,clearProps:'opacity,transform'},1.1);
  });
  const skip=()=>{tl?.progress(1);};window.addEventListener('pointerdown',skip,true);window.addEventListener('keydown',skip,true);
  return()=>{window.removeEventListener('pointerdown',skip,true);window.removeEventListener('keydown',skip,true);tl?.progress(1);mm.revert();};
 },{scope:root,dependencies:[view,goals.length>0]});

 // Year comes in with a short fade.
 useGSAP(()=>{if(view!=='year')return;const mm=whenMotionOK(()=>{gsap.from(root.current,{opacity:0,duration:.2,ease:'enter',clearProps:'opacity'});});return()=>mm.revert();},{scope:root,dependencies:[view]});

 // Refocus: the new trail draws up from your feet, the stones and the goal card rise in.
 const lastFocus=useRef(focus?.id);
 useLayoutEffect(()=>{if(lastFocus.current===focus?.id)return;const first=lastFocus.current===undefined;lastFocus.current=focus?.id;if(first||view!=='horizon')return;
  const mm=whenMotionOK(()=>{const q=(s:string)=>gsap.utils.toArray<Element>(s,root.current);
   gsap.from(q('.hz-trail-line path'),{drawSVG:'0%',duration:.45,ease:'move',overwrite:'auto',clearProps:CLEAR_DASH});
   gsap.from(q('.hz-connector path'),{drawSVG:'0%',duration:.35,delay:.2,ease:'move',overwrite:'auto',clearProps:CLEAR_DASH});
   gsap.from(q('.hz-stone-row, .hz-stone-art, .hz-behind'),{opacity:0,y:8,duration:.2,stagger:.03,overwrite:'auto',clearProps:'opacity,transform'});
   gsap.from(q('[data-card]'),{opacity:0,y:6,duration:.2,overwrite:'auto',clearProps:'opacity,transform'});});
  return()=>{mm.revert();};
 },[focus?.id]);

 const popStep=pop?.kind==='stone'&&focus?focus.steps.find(x=>x.id===pop.stepId):undefined;
 const openYearMonth=(next:boolean)=>{setMonthNext(next);setView('horizon');window.setTimeout(()=>{const el=root.current?.querySelector<HTMLElement>('[data-shelf="month"]');el?.scrollIntoView({block:'center',behavior:motionOK()?'smooth':'auto'});el?.focus({preventScroll:true});},60);};
 const openDeadline=(id:string)=>{focusGoal(id);setView('horizon');window.setTimeout(()=>{const el=root.current?.querySelector<HTMLElement>('#hz-deadline,.hz-deadline');el?.scrollIntoView({block:'center'});el?.focus();if(el?.classList.contains('hz-deadline'))el.click();},60);};

 const heading=<div className="page-heading hz-heading">
  <h1>Horizon<span className="title-period">.</span></h1>
  <p>Where you’re headed, and the next step from here.</p>
  {goals.length>0&&<div className="segmented hz-views" role="group" aria-label="Horizon views">{VIEWS.map(([v,n])=><button key={v} type="button" aria-pressed={view===v} className={view===v?'selected':''} onClick={()=>setView(v)}>{n}</button>)}</div>}
 </div>;

 return <>{heading}
  <div ref={root} className={`horizon view-${view} ${phone?'is-phone':''}`} data-own-motion data-view={view}>
   {!goals.length?<FirstRun state={state} mutate={mutate} band={band} phone={phone} stage={stage} ridgeRef={ridgeRef} stageW={stageW} onAdd={(anchor,text,board)=>setPop({kind:'goal',anchor,text,board})}/>
   :view==='horizon'&&focus?<>
    <SkyLine state={state} mutate={mutate}/>
    <div ref={stage} className="hz-stage">
     <div ref={ridgeRef} className="hz-ridge-wrap"><Ridge state={state} goals={goals} ridge={ridge} band={band} width={stageW} focusId={focus.id} phone={phone} now={now} hatchDur={lastVia.current==='key'?.2:.6} onFocus={focusGoal} onAdd={anchor=>setPop({kind:'goal',anchor})}/></div>
     <div className="hz-below">
      <div ref={trailCol} className="hz-trail-col">
              <Trail state={state} goal={focus} gi={fi} now={now} phone={phone} maxOpen={maxOpen} expanded={expanded} onExpand={setExpanded} peak={peak} ridgeRef={ridgeRef} width={trailW} pet={pet} bondPose={bondPose} evening={evening}
        onStone={(anchor,st)=>setPop({kind:'stone',stepId:st.id,anchor})} onDoToday={doToday} onAddStep={anchor=>setPop({kind:'step',anchor})}/>
      </div>
      <BaseCamp state={state} mutate={mutate} goal={focus} gi={fi} goals={goals} now={now} evening={evening} monthNext={monthNext} setMonthNext={setMonthNext}
       onDoToday={doToday} onEditTrail={()=>setDrawer(true)} onRemoveGoal={dropGoal} onPlant={plant} onAddStep={anchor=>setPop({kind:'step',anchor})}/>
     </div>
    </div></>
   :view==='map'&&focus?<LifeMap state={state} mutate={mutate} goals={goals} focusId={focus.id} now={now} onFocus={focusGoal} onTwig={(anchor,st)=>setPop({kind:'stone',stepId:st.id,anchor})} onAddStep={anchor=>setPop({kind:'step',anchor})}/>
   :<YearView state={state} mutate={mutate} goals={goals} now={now} onOpenMonth={openYearMonth} onSetDeadline={openDeadline}/>}
  </div>
  {pop?.kind==='stone'&&focus&&popStep&&<StonePopover state={state} goal={focus} step={popStep} now={now} anchor={pop.anchor} evening={evening} onClose={()=>setPop(null)}
   onAction={(a,anchor)=>stoneAction(a,popStep,a==='today'||a==='week'||a==='month'?pop.anchor:anchor)} onRename={t=>editStep((s,g)=>renameStep(s,g.id,popStep.id,t),'plan step text')} onDue={d=>editStep((s,g)=>setStepDue(s,g.id,popStep.id,d),'plan step date')}/>}
  {pop?.kind==='goal'&&<AddGoal anchor={pop.anchor} count={goals.length} initial={pop.text} board={pop.board} onClose={()=>setPop(null)} onAdd={(text,board)=>{let id='';mutate(s=>{const g=addGoal(s,text);id=g.id;if(board)linkBoard(s,g.id,board);},'plan add goal');if(id)focusGoal(id);setPop(null);}}/>}
  {pop?.kind==='step'&&focus&&<AddStep anchor={pop.anchor} goal={focus} onClose={()=>setPop(null)} onAdd={text=>mutate(s=>{addStep(s,focus.id,text);},'plan add step')}/>}
  {drawer&&focus&&<StepsDrawer goal={focus} gi={fi} mutate={mutate} onRemoveStep={dropStep} onClose={()=>setDrawer(false)}/>}
  {undo&&<UndoBar key={undo.key} text={undo.text} onUndo={undo.run} onDone={()=>setUndo(null)}/>}
  {toast&&<HzToast key={toast.key} text={toast.text} pet={pet} onDone={()=>setToast(null)}/>}
 </>;
}

function AddGoal({anchor,count,initial,board,onAdd,onClose}:{anchor:Element|null;count:number;initial?:string;board?:string;onAdd:(t:string,board?:string)=>void;onClose:()=>void}){
 const [text,setText]=useState(initial??'');
 return <Popover anchor={anchor} onClose={onClose} label="Add a goal" className="hz-add-pop" width={360}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(v)onAdd(v,board);}}>
   <label><span className="hz-pop-label">Add a goal <span className="hz-count">{count} of 10</span></span><input autoFocus value={text} maxLength={140} placeholder="I …" onChange={e=>setText(e.target.value)}/></label>
   <small>{text.length>=140?'Keep it under 140 characters.':'Write it as if it’s already true: “I work as a product manager.”'}</small>
   <div className="hz-pop-buttons"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="button" disabled={!text.trim()}>Add a goal</button></div>
  </form>
 </Popover>;
}
function AddStep({anchor,goal,onAdd,onClose}:{anchor:Element|null;goal:PlanGoal;onAdd:(t:string)=>void;onClose:()=>void}){
 const [text,setText]=useState(''),[added,setAdded]=useState(0);
 return <Popover anchor={anchor} onClose={onClose} label="What comes next?" className="hz-add-pop" width={340}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onAdd(v);setText('');setAdded(a=>a+1);}}>
   <label><span className="hz-pop-label">What comes next?</span><input autoFocus value={text} maxLength={140} placeholder="One step, in a few words" onChange={e=>setText(e.target.value)}/></label>
   <small>{added?`Added ${added} to the trail for ${goal.text.length>40?goal.text.slice(0,38)+'…':goal.text}. Keep going, or press Esc.`:'List every step. Order them later.'}</small>
   <div className="hz-pop-buttons"><button type="button" className="text-button" onClick={onClose}>Done</button><button className="button" disabled={!text.trim()}>Add</button></div>
  </form>
 </Popover>;
}

function FirstRun({state,mutate,band,phone,stage,ridgeRef,stageW,onAdd}:{state:State;mutate:Mutate;band:typeof BAND_DESKTOP;phone:boolean;stage:React.RefObject<HTMLDivElement|null>;ridgeRef:React.RefObject<HTMLDivElement|null>;stageW:number;onAdd:(anchor:HTMLElement,text?:string,board?:string)=>void}){
 const ridge=useMemo(()=>ridgeLayout(0,Math.max(1,stageW),-1,band),[stageW,band]);
 return <div className="hz-first">
  <SkyLine state={state} mutate={mutate}/>
  <div ref={stage} className="hz-stage"><div ref={ridgeRef} className="hz-ridge-wrap"><Ridge state={state} goals={[]} ridge={ridge} band={band} width={stageW} focusId="" phone={phone} now="" onFocus={()=>{}} onAdd={a=>onAdd(a)}/></div></div>
  <div className="hz-first-body">
   <h2>Write ten goals as if they’re already true.</h2>
   <p>Then pick the one that would change your life the most, give it a deadline, and list every step. About 20 minutes.</p>
   <button type="button" className="button" onClick={e=>onAdd(e.currentTarget)}>Write the first goal</button>
   <p className="hz-first-chips-title">Start from your board’s centre four:</p>
   <div className="hz-first-chips">{CENTRE_FOUR.map(([id,text])=>{const sq=state.goals.find(g=>g.id===id);return <button key={id} type="button" className="hz-chip ring-2" onClick={e=>onAdd(e.currentTarget,'I ',id)} aria-label={`Start from square ${sq?`${sq.row}.${sq.col} `:''}${text}`}>{text}</button>;})}</div>
  </div>
 </div>;
}

// The flag moment: Bond cheers in place when he's out; otherwise a quiet toast carries the line.
function HzToast({text,pet,onDone}:{text:string;pet:boolean;onDone:()=>void}){
 const el=useRef<HTMLDivElement>(null);
 useEffect(()=>{const t=window.setTimeout(()=>{if(motionOK()&&el.current)gsap.to(el.current,{opacity:0,y:8,duration:.2,ease:'enter',onComplete:onDone});else onDone();},3400);return()=>{clearTimeout(t);if(el.current)gsap.killTweensOf(el.current);};},[onDone]);
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from(el.current,{y:16,opacity:0,duration:.24,ease:'enter',clearProps:'opacity,transform'});});return()=>mm.revert();},{scope:el});
 return <div ref={el} className="hz-toast" role="status">{pet&&<Bond pose="flag"/>}<p>{text}</p></div>;
}

// One line for the Board's goal drawer: "On your horizon: goal 2 · 4 of 9 steps · Open Horizon". Null when no goal links here.
export function HorizonBoardLine({state,goalId,go}:{state:State;goalId:string;go:(p:string)=>void}){
 const goals=planGoals(state),i=goals.findIndex(g=>g.boardGoal===goalId);if(i<0)return null;const g=goals[i],done=g.steps.filter(x=>x.done).length;
 return <p className="hz-board-line"><span>On your horizon: goal {i+1} · {done} of {g.steps.length} steps</span> · <button type="button" className="text-button" onClick={()=>{ss.set(FOCUS_KEY,g.id);ss.set(VIEW_KEY,'horizon');go('Horizon');}}>Open Horizon</button></p>;
}
