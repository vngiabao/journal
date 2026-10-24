// Life map: one hand-drawn Buzan mind map per horizon. "Me" always sits in the middle, in a soft cloud, with the
// horizon under it ("in 5 years", "at 40"). Each area of life is a thick, tapering branch with its name written along
// it; its twigs hold only that horizon's ideas (on "This year", the area's goals and their next steps). Switch
// horizons above the map; tap an area to open it across every horizon in a sheet, without moving the map.
import {Fragment,useEffect,useLayoutEffect,useMemo,useRef,useState,type ComponentType,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import './lifemap.css';
import type {State,PlanGoal,PlanStep,Vision,VisionWhen,LifeArea,LifeHorizon} from '../model';
import type {Mutate} from '../GoalControls';
import {Rough,sk,seedOf} from '../Sketch';
import {mindLayout,mindSizes,cloudPoints,spinePath,branchPoints,taperedPoly,taperedOutline,wrapText,type Pt} from './geometry';
import {AreaCareer,AreaEducation,AreaHealth,AreaRelationship,AreaConnection,AreaOwnership,AreaMind,AreaOther,X} from '../icons';
import {SkyLine,Popover,UndoBar,ss,useWidth,usePhone,useMeasure,deadlineText} from './shared';
import {stepTag,stepToToday,nextStep} from '../plan';
import {addDays} from '../dates';
import {lifeAreas,lifeVisions,visionsAt,goalsIn,unassignedGoals,addVision,editVision,removeVision,restoreVision,addArea,renameArea,removeArea,restoreArea,setGoalArea,areaOf,
 lifeHorizons,visionHorizons,horizonOf,horizonTitle,horizonPhrase,isDefaultHorizon,addHorizon,renameHorizon,removeHorizon,restoreHorizon,AREA_HINTS,AREA_MIN,AREA_MAX} from './life';
import {gsap,whenMotionOK,useGSAP,CLEAR_DASH} from './motion';

// Eight clearly different inks (three mixed from tokens in lifemap.css). Red stays free to mean "past the deadline".
const INK=['var(--blue)','var(--violet)','var(--green)','var(--lm-plum)','var(--gold-text)','var(--lm-rust)','var(--lm-olive)','var(--ink-soft)'];
const HORIZON_KEY='reboot-life-horizon',ARRIVED_KEY='reboot-life-arrived';
// Canvas measuring uses the same families as the CSS tokens, so a font change in tokens.css carries over.
const tok=(name:string,fallback:string)=>{try{return getComputedStyle(document.documentElement).getPropertyValue(name).trim()||fallback;}catch{return fallback;}};
const SERIF=tok('--serif','"Cormorant Garamond", serif'),SANS=tok('--sans','"Source Sans 3", sans-serif'),HAND=tok('--hand','Caveat, cursive');
const F={miniName:`600 18px ${HAND}`,small:`400 13px ${SANS}`,chip:`550 14px ${SANS}`};
const ink=(i:number)=>INK[i%INK.length];
const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
// One small drawing per area, in its ink, beside its branch (Buzan's doodles). Areas you add get a leaf.
const AREA_ICON:Record<string,ComponentType<{size?:number}>>={career:AreaCareer,education:AreaEducation,health:AreaHealth,relationship:AreaRelationship,connection:AreaConnection,ownership:AreaOwnership,mind:AreaMind};

type Pop={kind:'add';area:string;when:VisionWhen;anchor:HTMLElement|null}|{kind:'edit';id:string;anchor:HTMLElement|null}|{kind:'areas';anchor:HTMLElement|null}
 |{kind:'pick';goalId:string;anchor:HTMLElement|null}|{kind:'horizons';anchor:HTMLElement|null};
type Undo={text:string;run:()=>void;key:number};

export function goalStatus(g:PlanGoal,now:string){const done=g.steps.filter(x=>x.done).length,total=g.steps.length,d=deadlineText(g.deadline,now);
 return {done,total,steps:total?`${done} of ${total} ${total===1?'step':'steps'}`:'No steps yet',due:d.text,late:d.late};}

export function LifeMap({state,mutate,goals,focusId,now,onFocus,onTwig,onAddStep}:{state:State;mutate:Mutate;goals:PlanGoal[];focusId:string;now:string;
 onFocus:(id:string)=>void;onTwig:(anchor:HTMLElement,step:PlanStep)=>void;onAddStep:(anchor:HTMLElement)=>void}){
 const phone=usePhone(),root=useRef<HTMLDivElement>(null),rootW=useWidth(root,1100,phone);
 const areas=lifeAreas(state),visions=lifeVisions(state),horizons=lifeHorizons(state),firstRun=visions.length===0;
 const [hid,setHid]=useState(()=>ss.get(HORIZON_KEY)??'40');
 const horizon=horizons.find(h=>h.id===hid)??horizons[horizons.length-1]??horizons[0];
 const pickHorizon=(id:string)=>{setHid(id);ss.set(HORIZON_KEY,id);};
 const step=(by:number)=>{const i=horizons.findIndex(h=>h.id===horizon.id),j=Math.max(0,Math.min(horizons.length-1,i+by));if(j!==i)pickHorizon(horizons[j].id);};
 // The sheet opens on the side opposite the tapped branch, so that branch stays in view.
 const [sheet,setSheetId]=useState(''),[sheetFrom,setSheetFrom]=useState<'left'|'right'>('right'),sheetArea=areas.find(a=>a.id===sheet);
 const setSheet=(id:string,side?:1|-1)=>{if(side)setSheetFrom(side===1?'left':'right');setSheetId(id);};
 const [pop,setPop]=useState<Pop|null>(null),[undo,setUndo]=useState<Undo|null>(null);
 const evening=new Date().getHours()>=17;

 // ← and → move between horizons (outside text fields, and not while a sheet or popover is open).
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;if(e.altKey||e.ctrlKey||e.metaKey||sheet||document.querySelector('.hz-popover,.hz-drawer-root'))return;
  const t=e.target instanceof Element?e.target:null;if(t?.closest('input,textarea,select,[contenteditable="true"],[role="slider"]'))return;e.preventDefault();step(e.key==='ArrowRight'?1:-1);};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});

 const doToday=(g:PlanGoal,st:PlanStep)=>{const day=evening?addDays(now,1):now;mutate(s=>{stepToToday(s,g.id,st.id,day);},'plan step to today');};
 const openStep=(g:PlanGoal,st:PlanStep,anchor:HTMLElement)=>{onFocus(g.id);onTwig(anchor,st);};
 const dropVision=(id:string)=>{let r:ReturnType<typeof removeVision>;mutate(s=>{r=removeVision(s,id);},'life remove vision');setPop(null);
  setUndo({text:'Removed. Undo',key:Date.now(),run:()=>{const x=r;if(x)mutate(s=>restoreVision(s,x.vision,x.index),'life restore vision');}});};
 const dropArea=(id:string)=>{let r:ReturnType<typeof removeArea>;mutate(s=>{r=removeArea(s,id);},'life remove area');if(sheet===id)setSheet('');
  setUndo({text:'Area removed. Undo',key:Date.now(),run:()=>{const x=r;if(x)mutate(s=>restoreArea(s,x),'life restore area');}});};
 const dropHorizon=(id:string)=>{let r:ReturnType<typeof removeHorizon>;mutate(s=>{r=removeHorizon(s,id);},'life remove horizon');if(horizon.id===id)pickHorizon('40');
  setUndo({text:'Horizon removed. Undo',key:Date.now(),run:()=>{const x=r;if(x)mutate(s=>restoreHorizon(s,x),'life restore horizon');}});};
 const tray=(area?:LifeArea)=><Tray state={state} goals={goals} area={area} onAssign={(g,a)=>mutate(s=>setGoalArea(s,g.id,a),'life goal area')} onPick={(g,anchor)=>setPop({kind:'pick',goalId:g.id,anchor})}/>;
 const unassigned=unassignedGoals(state).length;

 // Arrival, once per session: the branches grow out from "Me" (their centrelines draw), then the inked shapes fill in
 // and the words arrive. Later visits get a 0.2 s fade. A data attribute (which React never rewrites) marks it running.
 useGSAP(()=>{const el=root.current;const mm=whenMotionOK(()=>{
  if(ss.get(ARRIVED_KEY)){gsap.from(el,{opacity:0,duration:.2,ease:'enter',clearProps:'opacity'});return;}
  const q=(s:string)=>gsap.utils.toArray<Element>(s,el);
  const done=()=>{ss.set(ARRIVED_KEY,'1');if(el)delete el.dataset.arriving;gsap.set(q('.mm-spine'),{clearProps:CLEAR_DASH});};if(el)el.dataset.arriving='1';
  const tl=gsap.timeline({defaults:{ease:'enter'},onComplete:done});
  tl.from(q('.mm-cloud, .mm-centre'),{opacity:0,scale:.96,svgOrigin:'0 0',duration:.35,clearProps:'opacity,transform'},0)
   .from(q('.mm-spine:not(.twig)'),{drawSVG:'0%',duration:.55,stagger:.05,clearProps:CLEAR_DASH},.1)
   .from(q('.mm-spine.twig'),{drawSVG:'0%',duration:.35,stagger:.01,clearProps:CLEAR_DASH},.45)
   .from(q('.mm-fill, .mm-line, .mm-line-add'),{opacity:0,duration:.35,clearProps:'opacity'},.55)
   .from(q('.mm-name, .mm-row, .mm-icon, .mm-mini-name, .lm-prow'),{opacity:0,y:6,duration:.3,stagger:.015,clearProps:'opacity,transform'},.6);
  const skip=()=>tl.progress(1);window.addEventListener('pointerdown',skip,true);window.addEventListener('keydown',skip,true);
  return()=>{window.removeEventListener('pointerdown',skip,true);window.removeEventListener('keydown',skip,true);if(el)delete el.dataset.arriving;};
 });return()=>mm.revert();},{scope:root,dependencies:[phone],revertOnUpdate:true});
 // Switching horizon: the twigs and words cross-fade in (0.22 s). Reduced motion swaps instantly.
 const lastH=useRef(horizon.id);
 useGSAP(()=>{if(lastH.current===horizon.id)return;lastH.current=horizon.id;
  const mm=whenMotionOK(()=>{gsap.from(gsap.utils.toArray<Element>('.mm-twig, .mm-row, .mm-when, .lm-prow-items',root.current),{opacity:0,duration:.22,ease:'enter',clearProps:'opacity'});});return()=>mm.revert();},
  {scope:root,dependencies:[horizon.id]});

 const popVision=pop?.kind==='edit'?visions.find(v=>v.id===pop.id):undefined,popGoal=pop?.kind==='pick'?goals.find(g=>g.id===pop.goalId):undefined;
 const openAdd=(area:string,when:string,anchor:HTMLElement|null)=>setPop({kind:'add',area,when,anchor});
 return <div ref={root} className={`lm ${phone?'is-phone':''}`}>
  <HorizonSwitch horizons={horizons} current={horizon.id} onPick={pickHorizon} onManage={anchor=>setPop({kind:'horizons',anchor})}/>
  {phone?<PhoneMap state={state} areas={areas} goals={goals} horizon={horizon} now={now} sheet={sheet} onArea={setSheet} onSwipe={step}/>
  :<MindMap state={state} mutate={mutate} areas={areas} goals={goals} horizon={horizon} focusArea={sheet} focusId={focusId} now={now} width={rootW} sheetOpen={!!sheet}
   onArea={(id,side)=>setSheet(id,side)} onGoal={(g,a,side)=>{onFocus(g.id);setSheet(a,side);}} onStep={openStep} onVision={(v,anchor)=>setPop({kind:'edit',id:v.id,anchor})} onAdd={openAdd} onSwipe={step}/>}
  <div className="lm-under">
   {firstRun&&<FirstPrompt areas={areas} horizon={horizon} onPick={(id,anchor)=>{setSheet(id);openAdd(id,horizon.id==='year'?'40':horizon.id,anchor);}}/>}
   {unassigned>0&&!phone&&<div className="lm-under-tray">{tray()}</div>}
   <button type="button" className="text-button lm-edit-areas" onClick={e=>setPop({kind:'areas',anchor:e.currentTarget})}>Edit areas</button>
  </div>
  {phone&&unassigned>0&&tray()}
  {sheetArea&&<AreaSheet area={sheetArea} index={areas.indexOf(sheetArea)} phone={phone} from={sheetFrom} onClose={()=>setSheet('')}>
   <Ladder state={state} area={sheetArea} index={areas.indexOf(sheetArea)} goals={goals} focusId={focusId} now={now} evening={evening}
    onVision={(v,anchor)=>setPop({kind:'edit',id:v.id,anchor})} onAdd={(when,anchor)=>openAdd(sheetArea.id,when,anchor)} onGoal={g=>onFocus(g.id)}
    onStep={openStep} onDoToday={doToday} onAddStep={(g,anchor)=>{onFocus(g.id);onAddStep(anchor);}} onPickArea={(g,anchor)=>setPop({kind:'pick',goalId:g.id,anchor})}/>
   {tray(sheetArea)}
  </AreaSheet>}
  {pop?.kind==='add'&&<AddVision anchor={pop.anchor} area={areas.find(a=>a.id===pop.area)?.name??''} when={horizonOf(state,pop.when)} onClose={()=>setPop(null)} onAdd={t=>mutate(s=>{addVision(s,pop.area,pop.when,t);},'life add vision')}/>}
  {pop?.kind==='edit'&&popVision&&<EditVision anchor={pop.anchor} vision={popVision} horizons={visionHorizons(state).slice().reverse()} area={areas.find(a=>a.id===popVision.area)?.name??''} onClose={()=>setPop(null)}
   onSave={(text,when)=>{mutate(s=>editVision(s,popVision.id,{text,when}),'life edit vision');setPop(null);}} onRemove={()=>dropVision(popVision.id)}/>}
  {pop?.kind==='areas'&&<EditAreas anchor={pop.anchor} areas={areas} onClose={()=>setPop(null)} onRename={(id,n)=>mutate(s=>renameArea(s,id,n),'life rename area')}
   onAdd={n=>mutate(s=>{addArea(s,n);},'life add area')} onRemove={id=>dropArea(id)}/>}
  {pop?.kind==='horizons'&&<EditHorizons anchor={pop.anchor} horizons={horizons} onClose={()=>setPop(null)} onRename={(id,l)=>mutate(s=>renameHorizon(s,id,l),'life rename horizon')}
   onAdd={l=>{let id='';mutate(s=>{id=addHorizon(s,l)?.id??'';},'life add horizon');if(id)pickHorizon(id);return !!id;}} onRemove={id=>dropHorizon(id)}/>}
  {pop?.kind==='pick'&&popGoal&&<PickArea anchor={pop.anchor} goal={popGoal} gi={goals.indexOf(popGoal)} areas={areas} current={areaOf(state,popGoal)} onClose={()=>setPop(null)}
   onPick={area=>{mutate(s=>setGoalArea(s,popGoal.id,area),'life goal area');setPop(null);}}/>}
  {undo&&<UndoBar key={undo.key} text={undo.text} onUndo={undo.run} onDone={()=>setUndo(null)}/>}
 </div>;
}

// "This year · 5 years · 10 years · At 40 · + Add": one map per horizon. ← → also switch, and a swipe on touch.
function HorizonSwitch({horizons,current,onPick,onManage}:{horizons:LifeHorizon[];current:string;onPick:(id:string)=>void;onManage:(anchor:HTMLElement)=>void}){
 return <div className="lm-switch-row">
  <div className="segmented lm-switch" role="group" aria-label="Horizon">
   {horizons.map(h=><button key={h.id} type="button" aria-pressed={h.id===current} className={h.id===current?'selected':''} onClick={()=>onPick(h.id)}>{h.label}</button>)}
  </div>
  {/* Pinned after the horizons, so it never scrolls out of reach. */}
  <button type="button" className="lm-switch-add" onClick={e=>onManage(e.currentTarget)} aria-label="Add a horizon"><span aria-hidden="true">+</span><span className="lm-add-word">Add</span></button>
 </div>;
}

// Horizontal swipes on touch switch horizons (the page still scrolls vertically).
function useSwipe(ref:RefObject<HTMLElement|null>,onSwipe:(by:number)=>void){
 useEffect(()=>{const el=ref.current;if(!el)return;let x0=0,y0=0,on=false;
  const down=(e:PointerEvent)=>{if(e.pointerType!=='touch')return;on=true;x0=e.clientX;y0=e.clientY;};
  const up=(e:PointerEvent)=>{if(!on)return;on=false;const dx=e.clientX-x0,dy=e.clientY-y0;if(Math.abs(dx)>60&&Math.abs(dy)<Math.abs(dx)*.6)onSwipe(dx<0?1:-1);};
  el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);return()=>{el.removeEventListener('pointerdown',down);el.removeEventListener('pointerup',up);};},[ref,onSwipe]);
}

// The map fills the window below it (html zoom included), so a big screen gets a big map, not empty paper.
function useFillHeight(ref:RefObject<HTMLElement|null>,min:number,max:number,below=0){
 const [h,setH]=useState(min);
 useLayoutEffect(()=>{const calc=()=>{const el=ref.current;if(!el)return;const z=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
   const top=el.getBoundingClientRect().top+scrollY,avail=(innerHeight-top)/z-28-below;setH(x=>{const v=Math.round(Math.max(min,Math.min(max,avail)));return Math.abs(v-x)>2?v:x;});};
  calc();window.addEventListener('resize',calc);return()=>window.removeEventListener('resize',calc);},[ref,min,max,below]);
 return h;
}

// One idea on the map: its words sit on their own short line at the end of a twig.
type MRow={key:string;kind:'vision'|'goal'|'step'|'more'|'add';horizon:number;lines:string[];w:number;h:number;base:number;v?:Vision;g?:PlanGoal;st?:PlanStep;n?:number;meta?:string[];late?:boolean;count?:number;tag?:string};
// Touch screens get taller rows so every line on the map is a full 44px target.
const COARSE=typeof window!=='undefined'&&window.matchMedia?.('(pointer: coarse)').matches;
// Wraps to the fewest lines that fit, then evens them out, so a long idea never leaves one word alone on its last line.
function wrapEven(text:string,room:number,measure:(t:string)=>number){const longest=Math.max(...text.split(/\s+/).map(measure),0),r=Math.max(room,Math.ceil(longest)+2),first=wrapText(text,r,measure,99).lines;if(first.length<2)return first;
 // Never narrower than the longest word, so no word is ever cut.
 let lo=Math.max(60,Math.ceil(measure(text)/first.length),Math.ceil(longest)+2),hi=r,best=first;
 while(lo<=hi){const mid=Math.floor((lo+hi)/2),w=wrapText(text,mid,measure,99);if(!w.truncated&&w.lines.length<=first.length){best=w.lines;hi=mid-1;}else lo=mid+1;}
 return best;}

// Two text scales: the usual one (17px words) and big screens (20px words once the map has over 1000px of height).
type Scale='m'|'l';
const FONTS:Record<Scale,{vision:string;goal:string;step:string;name:string;nameSize:number;row:number;stepRow:number;gap:number}>={
 m:{vision:`500 18px ${SERIF}`,goal:`650 18px ${SERIF}`,step:`500 16px ${SERIF}`,name:`600 22px ${HAND}`,nameSize:22,row:21,stepRow:19,gap:COARSE?16:12},
 l:{vision:`500 21px ${SERIF}`,goal:`650 21px ${SERIF}`,step:`500 18px ${SERIF}`,name:`600 26px ${HAND}`,nameSize:26,row:25,stepRow:21,gap:COARSE?18:16}};

function MindMap({state,mutate,areas,goals,horizon,focusArea,focusId,now,width,sheetOpen,onArea,onGoal,onStep,onVision,onAdd,onSwipe}:{state:State;mutate:Mutate;areas:LifeArea[];goals:PlanGoal[];horizon:LifeHorizon;focusArea:string;focusId:string;now:string;width:number;sheetOpen:boolean;
 onArea:(id:string,side?:1|-1)=>void;onGoal:(g:PlanGoal,area:string,side?:1|-1)=>void;onStep:(g:PlanGoal,st:PlanStep,anchor:HTMLElement)=>void;onVision:(v:Vision,anchor:HTMLElement)=>void;onAdd:(area:string,when:string,anchor:HTMLElement)=>void;onSwipe:(by:number)=>void}){
 const wrap=useRef<HTMLDivElement>(null),height=useFillHeight(wrap,460,1400),fi=areas.findIndex(a=>a.id===focusArea);
 useSwipe(wrap,onSwipe);
 const scale:Scale=height>1000&&width>1300?'l':'m',FT=FONTS[scale];
 const mName=useMeasure(FT.name),nameWs=areas.map(a=>Math.ceil(mName.measure(a.name.toUpperCase()))+2);
 // "Me" is the largest thing on the map, always in the middle.
 const cloudW=Math.round(Math.max(250,Math.min(scale==='l'?380:340,width*.22)));
 // On a wide window the branches grow longer, so the map spreads to fill it instead of sitting small in the middle.
 const opts={width,height,mode:'both' as const,cloudW,branchLen:Math.round(Math.max(30,Math.min(200,(width-1100)*.16+36))),twig:scale==='l'?26:20,stagger:5,tail:22,nameGap:8};
 const sizes=mindSizes(opts,nameWs);
 const mV=useMeasure(FT.vision),mG=useMeasure(FT.goal),mSt=useMeasure(FT.step),mS=useMeasure(F.small),mC=useMeasure(F.chip);
 const year=horizon.id==='year';
 const rows=useMemo(()=>areas.map((a,i)=>{const room=Math.max(120,sizes.rooms[i]??sizes.room),out:MRow[]=[],G=FT.gap;
  if(year){goalsIn(state,a.id).forEach(g=>{const n=goals.indexOf(g)+1,st=goalStatus(g,now),textW=room-32;
    const meta=st.late?`${st.done} of ${st.total} · past the deadline`:`${st.total?`${st.done} of ${st.total}`:'No steps yet'}${g.deadline?` · ${st.due.replace(/^By .* - /,'')}`:''}`;
    const lines=wrapEven(g.text,textW,mG.measure),metaLines=mS.measure(meta)<=textW?[meta]:meta.split(' · '),base=lines.length*FT.row+3;
    out.push({key:g.id,kind:'goal',horizon:0,lines,w:32+Math.max(...lines.map(mG.measure),...metaLines.map(mS.measure)),base,h:base+4+metaLines.length*16+G,g,n,meta:metaLines,late:st.late});
    // The next step hangs off the goal as a smaller twig; tapping it opens the step's popover, with "Do today".
    const nx=nextStep(g);if(nx){const tag=stepTag(state,nx,now),sl=wrapEven(`Next: ${nx.text}`,room-20,mSt.measure),b=sl.length*FT.stepRow+3;
     out.push({key:`${g.id}-next`,kind:'step',horizon:3,lines:sl,w:Math.max(...sl.map(mSt.measure),tag?mS.measure(tag):0),base:b,h:b+(tag?18:0)+G,g,st:nx,tag});}});
   if(!out.length){const t='+ Give it a goal';out.push({key:`${a.id}-stub`,kind:'add',horizon:0,lines:[t],w:mC.measure(t)+8,base:26,h:26+G});}}
  else{const vs=visionsAt(state,a.id,horizon.id),shown=vs.length>4?vs.slice(0,3):vs;
   shown.forEach(v=>{const lines=wrapEven(v.text,room,mV.measure),base=lines.length*FT.row+3;out.push({key:v.id,kind:'vision',horizon:0,lines,w:Math.max(...lines.map(mV.measure)),base,h:base+G,v});});
   if(vs.length>4){const t=`+${vs.length-3} more`;out.push({key:`${a.id}-more`,kind:'more',horizon:0,lines:[t],w:mC.measure(t)+4,base:24,h:24+G,count:vs.length-3});}
   // An area with nothing written for this horizon ends in a faint invitation, never a bare stub.
   if(!vs.length){const t='+ Add';out.push({key:`${a.id}-stub`,kind:'add',horizon:0,lines:[t],w:mC.measure(t)+10,base:26,h:26+G});}}
  return out;}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [state,goals,areas,now,horizon.id,sizes.rooms.join(),scale,mV.v,mG.v,mSt.v,mS.v,mC.v]);
 const L=useMemo(()=>mindLayout(rows.map((r,i)=>({rows:r.map(x=>({h:x.h,base:x.base,w:x.w,horizon:x.horizon})),minH:58,nameW:nameWs[i]})),opts),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rows,width,height,nameWs.join(),cloudW,scale]);
 const w0=scale==='l'?26:22;
 const shapes=useMemo(()=>({
  cloud:sk.curve(cloudPoints(L.cloud.cx,L.cloud.cy,L.cloud.w,L.cloud.h),{roughness:.7,strokeWidth:1.8,fill:'F',fillStyle:'solid',seed:seedOf('me-cloud')}),
  branch:L.branches.map((b,i)=>sk.polygon(taperedPoly(branchPoints(b),i===fi?w0+5:w0,i===fi?7:5.5),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.4,bowing:.3,seed:seedOf('mm'+areas[i]?.id)})),
  twig:L.branches.map((b,i)=>b.twigs.map((t,j)=>{const step=rows[i][j]?.kind==='step';return sk.polygon(taperedOutline(t.p0,t.c1,t.c2,t.p3,step?4.5:7,step?1.6:2.5,16),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.3,seed:seedOf('tw'+areas[i]?.id+j)});})),
  line:L.branches.map((b,i)=>b.twigs.map((t,j)=>{const r=rows[i][j];return r?.kind==='add'?null:sk.line(t.x,t.y,t.x+b.side*t.len,t.y,{roughness:.5,strokeWidth:r?.kind==='step'?1.2:1.8,seed:seedOf('ln'+r?.key)});})),
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[L,fi,w0,areas.map(a=>a.id).join()]);
 const twigPath=(t:{p0:Pt;c1:Pt;c2:Pt;p3:Pt})=>`M${t.p0[0].toFixed(1)} ${t.p0[1].toFixed(1)} C${t.c1[0].toFixed(1)} ${t.c1[1].toFixed(1)} ${t.c2[0].toFixed(1)} ${t.c2[1].toFixed(1)} ${t.p3[0].toFixed(1)} ${t.p3[1].toFixed(1)}`;
 const meSize=Math.round(Math.max(40,Math.min(scale==='l'?66:56,L.cloud.h*.36)));
 return <div ref={wrap} className={`mm scale-${scale} ${fi>=0?'has-focus':''} ${sheetOpen?'sheet-open':''}`} style={{height:L.height}}>
  <svg className="mm-svg" width={L.width} height={L.height} aria-hidden="true">
   {L.branches.map((b,i)=><g key={areas[i].id} className={`mm-area ${i===fi?'focused':''}`} style={{'--c':ink(i)} as React.CSSProperties}>
    <path className="mm-spine" d={spinePath(b)}/>
    {b.twigs.map((t,j)=><path key={j} className="mm-spine twig" d={twigPath(t)}/>)}
    <Rough className="mm-fill" shape={shapes.branch[i]}/>
    {b.twigs.map((t,j)=><g key={`${horizon.id}-${j}`} className={`mm-twig ${rows[i][j]?.kind??''}`}><Rough className="mm-fill" shape={shapes.twig[i][j]}/>
     {shapes.line[i][j]?<Rough className="mm-line" shape={shapes.line[i][j]}/>:<line className="mm-line-add" x1={t.x} y1={t.y} x2={t.x+b.side*t.len} y2={t.y}/>}</g>)}
   </g>)}
   <Rough className="mm-cloud" shape={shapes.cloud}/>
  </svg>
  <div className="mm-centre" style={{left:L.cloud.cx-L.cloud.w/2+26,top:L.cloud.cy-L.cloud.h/2+14,width:L.cloud.w-52,height:L.cloud.h-28,'--mm-me':`${meSize}px`} as React.CSSProperties}>
   <span className="mm-me">Me</span><span className="mm-when">{horizonPhrase(horizon)}</span>
   {L.cloud.h>=170&&<SkyLine state={state} mutate={mutate} className="mm-sky"/>}
  </div>
  {L.branches.map((b,i)=>{const a=areas[i],Icon=AREA_ICON[a.id]??AreaOther,n=b.name,nameH=Math.max(44,FT.nameSize+20),nameTop=n.y-7-nameH,iconX=n.x+b.side*(n.w/2)-b.side*12;
   return <Fragment key={a.id}>
   {/* The name is written level along its branch, just above the stroke. The whole name is the button. */}
   <button type="button" className={`mm-name ${i===fi?'focused':''}`} data-area={i} style={{left:n.x-n.w/2-10,top:nameTop,width:n.w+20,height:nameH,fontSize:FT.nameSize,'--c':ink(i)} as React.CSSProperties}
    aria-pressed={i===fi} aria-label={a.name} onClick={()=>onArea(a.id,b.side)}><span>{a.name.toUpperCase()}</span></button>
   <span className={`mm-icon ${i%2?'tilt-l':'tilt-r'}`} style={{left:iconX-13,top:n.y+9,'--c':ink(i)} as React.CSSProperties} aria-hidden="true"><Icon size={scale==='l'?30:26}/></span>
   {rows[i].map((r,j)=>{const t=b.twigs[j];if(!t)return null;const right=b.side===1,style={left:right?t.x+3:t.x-t.len+3,top:t.top,width:t.len-6,'--c':ink(i)} as React.CSSProperties,cls=`mm-row ${r.kind==='step'?'nextstep':r.kind} ${right?'side-r':'side-l'}`;
    if(r.kind==='goal'&&r.g)return <button key={r.key} type="button" className={`${cls} ${r.g.id===focusId?'current':''}`} style={style} onClick={()=>onGoal(r.g!,a.id,b.side)} aria-label={`Goal ${r.n}: ${r.g.text}. ${r.meta?.join(', ')}.`}>
     <span className="mm-goal"><span className={`hz-mini-pennant ${r.g.one?'one':''}`} aria-hidden="true">{r.n}</span><span className="mm-text">{r.lines.map((l,k)=><span key={k}>{l}</span>)}</span></span>
     <span className={`mm-meta ${r.late?'late':''}`}>{r.meta?.map((l,k)=><span key={k}>{l}</span>)}</span></button>;
    if(r.kind==='step'&&r.g&&r.st)return <button key={r.key} type="button" className={cls} style={style} data-step={r.st.id} onClick={e=>onStep(r.g!,r.st!,e.currentTarget)} aria-label={`Next step for goal ${r.n??goals.indexOf(r.g)+1}: ${r.st.text}.${r.tag?` ${r.tag}.`:''} Do today and more`}>
     <span className="mm-text">{r.lines.map((l,k)=><span key={k}>{l}</span>)}</span>{r.tag&&<span className={`mm-meta ${r.tag==='On today'?'on':''}`}>{r.tag}</span>}</button>;
    if(r.kind==='vision'&&r.v)return <button key={r.key} type="button" className={cls} style={style} onClick={e=>onVision(r.v!,e.currentTarget)} aria-label={`${a.name}, ${horizonPhrase(horizon)}: ${r.v.text}. Edit`}>
     <span className="mm-text">{r.lines.map((l,k)=><span key={k}>{l}</span>)}</span></button>;
    if(r.kind==='more')return <button key={r.key} type="button" className={cls} style={style} onClick={()=>onArea(a.id,b.side)} aria-label={`${plural(r.count??0,'more vision')} for ${a.name}. Show them all`}>{r.lines[0]}</button>;
    return <button key={r.key} type="button" className={cls} style={style} onClick={e=>year?onArea(a.id,b.side):onAdd(a.id,horizon.id,e.currentTarget)} aria-label={year?`Give ${a.name} a goal`:`Add a vision for ${a.name}, ${horizonPhrase(horizon)}`}>{r.lines[0]}</button>;})}
  </Fragment>;})}
 </div>;
}

// The phone's map: "Me" in the middle with this horizon, one short branch per area with its name and how many ideas
// it holds here. Below it, one row per area with this horizon's words. Tap either to open the area.
function PhoneMap({state,areas,goals,horizon,now,sheet,onArea,onSwipe}:{state:State;areas:LifeArea[];goals:PlanGoal[];horizon:LifeHorizon;now:string;sheet:string;onArea:(id:string)=>void;onSwipe:(by:number)=>void}){
 const wrap=useRef<HTMLDivElement>(null),w=useWidth(wrap,358),mN=useMeasure(F.miniName),fi=areas.findIndex(a=>a.id===sheet),year=horizon.id==='year';
 useSwipe(wrap,onSwipe);
 const items=(a:LifeArea)=>year?goalsIn(state,a.id).map(g=>({key:g.id,text:g.text,g})):visionsAt(state,a.id,horizon.id).map(v=>({key:v.id,text:v.text,g:undefined as PlanGoal|undefined}));
 const counts=areas.map(a=>items(a).length);
 const L=useMemo(()=>mindLayout(areas.map((a,i)=>({rows:[],minH:34,nameW:Math.ceil(mN.measure(a.name))+(counts[i]?24:2)})),{width:w,height:0,mode:'both',cloudW:Math.min(132,w*.36),branchLen:10,tail:2,nameGap:4,twig:0,stagger:0,gap:6,pad:4}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [areas,w,mN.v,counts.join()]);
 const shapes=useMemo(()=>({cloud:sk.curve(cloudPoints(L.cloud.cx,L.cloud.cy,L.cloud.w,L.cloud.h,7),{roughness:.7,strokeWidth:1.5,fill:'F',fillStyle:'solid',seed:seedOf('me-mini')}),
  branch:L.branches.map((b,i)=>sk.polygon(taperedPoly(branchPoints(b),i===fi?12:10,3),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.35,seed:seedOf('mm'+areas[i]?.id)})),
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[L,fi,areas.map(a=>a.id).join()]);
 return <div className="mm-phone">
  <div ref={wrap} className="mm-mini">
   <div className="mm-mini-stage" style={{height:L.height}}>
    <svg className="mm-svg" width={L.width} height={L.height} aria-hidden="true">
     {L.branches.map((b,i)=><g key={areas[i].id} className={`mm-area ${i===fi?'focused':''}`} style={{'--c':ink(i)} as React.CSSProperties}><path className="mm-spine" d={spinePath(b)}/><Rough className="mm-fill" shape={shapes.branch[i]}/></g>)}
     <Rough className="mm-cloud" shape={shapes.cloud}/>
    </svg>
    <span className="mm-mini-me" style={{left:L.cloud.cx-L.cloud.w/2,top:L.cloud.cy-L.cloud.h/2,width:L.cloud.w,height:L.cloud.h}} aria-hidden="true"><b>Me</b><small className="mm-when">{horizonPhrase(horizon)}</small></span>
    {L.branches.map((b,i)=><button key={areas[i].id} type="button" className={`mm-mini-name ${b.side===1?'side-r':'side-l'}`} style={{left:b.name.x-b.name.w/2-6,top:b.name.y-34,width:b.name.w+12,'--c':ink(i)} as React.CSSProperties}
     aria-pressed={i===fi} aria-label={`${areas[i].name}: ${plural(counts[i],year?'goal':'idea')} ${horizonPhrase(horizon)}. Open`} onClick={()=>onArea(areas[i].id)}>{areas[i].name}{counts[i]>0&&<small>{counts[i]}</small>}</button>)}
   </div>
  </div>
  <ul className="lm-prows">{areas.map((a,i)=>{const its=items(a);return <li key={a.id}><button type="button" className="lm-prow" style={{'--c':ink(i)} as React.CSSProperties} onClick={()=>onArea(a.id)}>
   <span className="lm-area-name">{a.name}</span>
   <span className="lm-prow-items">{its.length?its.map(x=><span key={x.key} className="lm-prow-item">{x.g&&<span className={`hz-mini-pennant ${x.g.one?'one':''}`} aria-hidden="true">{goals.indexOf(x.g)+1}</span>}<span>{x.text}{x.g&&<small className={goalStatus(x.g,now).late?'late':''}> · {goalStatus(x.g,now).late?'past the deadline':goalStatus(x.g,now).steps}</small>}</span></span>)
    :<span className="lm-prow-empty">{year?'No goal this year yet':`Nothing ${horizonPhrase(horizon)} yet - add one`}</span>}</span>
  </button></li>;})}</ul>
 </div>;
}

// One area across every horizon, in a sheet over the map (a bottom sheet on a phone). The map never moves or shrinks.
function AreaSheet({area,index,phone,from,onClose,children}:{area:LifeArea;index:number;phone:boolean;from:'left'|'right';onClose:()=>void;children:ReactNode}){
 const box=useRef<HTMLDivElement>(null),panel=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const back=document.activeElement as HTMLElement|null;panel.current?.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{if(document.querySelector('.hz-popover'))return;if(e.key==='Escape'){e.stopPropagation();close.current();return;}
   if(e.key!=='Tab'||!panel.current||!panel.current.contains(document.activeElement))return;const f=[...panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,[tabindex="0"]')];if(!f.length)return;
   const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}};
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);if(back&&document.contains(back))back.focus({preventScroll:true});};},[]);
 // Moving to another area keeps the sheet open and puts focus on its name.
 useEffect(()=>{panel.current?.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});panel.current?.scrollTo?.({top:0});},[area.id]);
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from('.lm-sheet',{...(phone?{yPercent:10}:{xPercent:from==='left'?-6:6}),opacity:0,duration:.24,ease:'enter',clearProps:'transform,opacity'});});return()=>mm.revert();},{scope:box});
 const hint=AREA_HINTS[area.id];
 return createPortal(<div ref={box} className={`lm-sheet-root ${phone?'is-phone':''}`}>
  {phone&&<button type="button" className="lm-sheet-scrim" aria-hidden="true" tabIndex={-1} onClick={onClose}/>}
  <aside ref={panel} className={`lm-sheet from-${from}`} role="dialog" aria-modal={phone?'true':'false'} aria-labelledby="lm-sheet-title" style={{'--c':ink(index)} as React.CSSProperties}>
   <header className="lm-sheet-head">
    <div><h2 id="lm-sheet-title" tabIndex={-1}>{area.name}</h2><p>{hint?`${hint}. `:''}Every horizon, from furthest to now.</p></div>
    <button type="button" className="lm-sheet-x" aria-label={`Close ${area.name}`} onClick={onClose}><X size={18}/></button>
   </header>
   {children}
  </aside>
 </div>,document.body);
}

interface LadderProps{state:State;area:LifeArea;index:number;goals:PlanGoal[];focusId:string;now:string;evening:boolean;
 onVision:(v:Vision,anchor:HTMLElement)=>void;onAdd:(when:VisionWhen,anchor:HTMLElement)=>void;onGoal:(g:PlanGoal)=>void;onStep:(g:PlanGoal,st:PlanStep,anchor:HTMLElement)=>void;
 onDoToday:(g:PlanGoal,st:PlanStep)=>void;onAddStep:(g:PlanGoal,anchor:HTMLElement)=>void;onPickArea:(g:PlanGoal,anchor:HTMLElement)=>void}
// One area, far to near: every vision horizon, then this year's goals and the next step of each, with "Do today".
function Ladder({state,area,index,goals,focusId,now,evening,onVision,onAdd,onGoal,onStep,onDoToday,onAddStep,onPickArea}:LadderProps){
 const mine=goalsIn(state,area.id);
 return <section className="lm-ladder" data-ladder={area.id} style={{'--c':ink(index)} as React.CSSProperties} aria-label={`${area.name}, every horizon`}>
  <ol className="lm-rungs">
   {visionHorizons(state).map(h=>{const vs=visionsAt(state,area.id,h.id);return <li key={h.id} className="lm-rung">
    <h3 className="lm-rung-title">{horizonTitle(h)}</h3>
    {vs.length>0&&<ul className="lm-visions">{vs.map(v=><li key={v.id}><button type="button" className="lm-vision" onClick={e=>onVision(v,e.currentTarget)} aria-label={`${v.text}. Edit`}>{v.text}</button></li>)}</ul>}
    <button type="button" className="text-button lm-add" data-add={h.id} onClick={e=>onAdd(h.id,e.currentTarget)}><span aria-hidden="true">+</span> {vs.length?'Add another':h.id==='40'?'Who are you at 40?':'Add a vision'}</button>
   </li>;})}
   <li className="lm-rung year">
    <h3 className="lm-rung-title">This year</h3>
    {mine.length===0&&<p className="lm-empty">No goals here yet. Give one of your ten this area below, or add one on the Horizon.</p>}
    {mine.map(g=>{const n=goals.indexOf(g)+1,st=goalStatus(g,now),next=nextStep(g),tag=next?stepTag(state,next,now):'',queued=tag==='On today'||tag==='Tomorrow';
     return <div key={g.id} className={`lm-goal ${g.id===focusId?'current':''}`}>
      <div className="lm-goal-top">
       <button type="button" className="lm-goal-text" aria-current={g.id===focusId?'true':undefined} onClick={()=>onGoal(g)}><span className={`hz-mini-pennant ${g.one?'one':''}`} aria-hidden="true">{n}</span><span>{g.text}</span></button>
       <button type="button" className="text-button lm-move" onClick={e=>onPickArea(g,e.currentTarget)} aria-label={`Move goal ${n} to another area`}>Move</button>
      </div>
      <p className="lm-goal-meta"><span>{st.steps}</span>{st.due&&<span className={st.late?'late':''}>{st.due}</span>}</p>
      {next?<div className="lm-next">
       <button type="button" className="lm-next-text" data-step={next.id} onClick={e=>onStep(g,next,e.currentTarget)} aria-label={`Next step for goal ${n}: ${next.text}.${tag?` ${tag}.`:''} More options`}>
        <span className="lm-next-kicker">Next</span><span>{next.text}</span>{tag&&!queued&&<span className="hz-tag">{tag}</span>}</button>
       {queued?<span className="lm-queued">{tag}</span>:<button type="button" className="button lm-do" onClick={()=>onDoToday(g,next)}>{evening?'Do tomorrow':'Do today'}</button>}
      </div>
      :g.steps.length?<p className="lm-empty">Every step done.</p>
      :<button type="button" className="text-button lm-add" onClick={e=>onAddStep(g,e.currentTarget)}><span aria-hidden="true">+</span> Add the first step</button>}
     </div>;})}
   </li>
  </ol>
 </section>;
}

function FirstPrompt({areas,horizon,onPick}:{areas:LifeArea[];horizon:LifeHorizon;onPick:(id:string,anchor:HTMLElement)=>void}){
 const at=horizon.id==='year'?'at 40':horizonPhrase(horizon);
 return <section className="lm-first">
  <h2>Who are you {at}?</h2>
  <p>Start with one area. Write it as if it’s already true: “I own my home.”</p>
  <div className="lm-chips">{areas.map((a,i)=><button key={a.id} type="button" className="lm-chip" style={{'--c':ink(i)} as React.CSSProperties} onClick={e=>onPick(a.id,e.currentTarget)}>{a.name}</button>)}</div>
 </section>;
}

// Goals without an area wait here. With an area open, one tap puts a goal in it.
function Tray({state,goals,area,onAssign,onPick}:{state:State;goals:PlanGoal[];area?:LifeArea;onAssign:(g:PlanGoal,area:string)=>void;onPick:(g:PlanGoal,anchor:HTMLElement)=>void}){
 const list=unassignedGoals(state);if(!list.length)return null;
 return <section className="lm-tray" aria-label="Goals with no area yet">
  <h3 className="lm-rung-title">No area yet</h3>
  <ul>{list.map(g=>{const n=goals.indexOf(g)+1;return <li key={g.id} className="lm-tray-row">
   <span className="lm-tray-text"><span className={`hz-mini-pennant ${g.one?'one':''}`} aria-hidden="true">{n}</span><span>{g.text}</span></span>
   <span className="lm-tray-actions">{area&&<button type="button" className="lm-chip small nodot" onClick={()=>onAssign(g,area.id)}>Add to {area.name}</button>}
    <button type="button" className="text-button" onClick={e=>onPick(g,e.currentTarget)} aria-label={`Pick an area for goal ${n}`}>{area?'Other':'Pick an area'}</button></span>
  </li>;})}</ul>
 </section>;
}

function AddVision({anchor,area,when,onAdd,onClose}:{anchor:Element|null;area:string;when?:LifeHorizon;onAdd:(t:string)=>void;onClose:()=>void}){
 const [text,setText]=useState(''),[added,setAdded]=useState(0),title=horizonTitle(when);
 return <Popover anchor={anchor} onClose={onClose} label={`${area}, ${title.toLowerCase()}`} className="lm-pop" width={360}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onAdd(v);setText('');setAdded(a=>a+1);}}>
   <label><span className="hz-pop-label">{area} <span className="lm-pop-when">{title}</span></span><input autoFocus value={text} maxLength={160} placeholder="I …" onChange={e=>setText(e.target.value)}/></label>
   <small>{added?`Added ${added}. Write another, or press Esc.`:'Present tense, as if it’s already true: “I own my home.”'}</small>
   <div className="hz-pop-buttons"><button type="button" className="text-button" onClick={onClose}>Done</button><button className="button" disabled={!text.trim()}>Add</button></div>
  </form>
 </Popover>;
}
function EditVision({anchor,vision,horizons,area,onSave,onRemove,onClose}:{anchor:Element|null;vision:Vision;horizons:LifeHorizon[];area:string;onSave:(t:string,w:VisionWhen)=>void;onRemove:()=>void;onClose:()=>void}){
 const [text,setText]=useState(vision.text),[when,setWhen]=useState<VisionWhen>(vision.when);
 return <Popover anchor={anchor} onClose={onClose} label={`Edit a vision for ${area}`} className="lm-pop" width={400}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();if(text.trim())onSave(text,when);}}>
   <label><span className="hz-pop-label">{area}</span><input autoFocus value={text} maxLength={160} onChange={e=>setText(e.target.value)}/></label>
   <div className="segmented lm-when" role="group" aria-label="When">{horizons.map(h=><button key={h.id} type="button" aria-pressed={when===h.id} className={when===h.id?'selected':''} onClick={()=>setWhen(h.id)}>{h.label}</button>)}</div>
   <div className="hz-pop-buttons"><button type="button" className="text-button lm-remove" onClick={onRemove}>Remove</button><span className="lm-spacer"/><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="button" disabled={!text.trim()}>Save</button></div>
  </form>
 </Popover>;
}
// Add a horizon of your own ("15 years", "At 50"), rename or remove it. The four defaults always stay.
function EditHorizons({anchor,horizons,onRename,onAdd,onRemove,onClose}:{anchor:Element|null;horizons:LifeHorizon[];onRename:(id:string,l:string)=>void;onAdd:(l:string)=>boolean;onRemove:(id:string)=>void;onClose:()=>void}){
 const [label,setLabel]=useState(''),[err,setErr]=useState(''),custom=horizons.filter(h=>!isDefaultHorizon(h.id));
 return <Popover anchor={anchor} onClose={onClose} label="Horizons" className="lm-pop" width={380}>
  <div className="hz-pop-form">
   <span className="hz-pop-label">Add a horizon</span>
   <form className="lm-area-add" onSubmit={e=>{e.preventDefault();const v=label.trim();if(!v)return;if(onAdd(v)){setLabel('');setErr('');onClose();}else setErr('That one is already there.');}}>
    <input aria-label="New horizon" autoFocus value={label} maxLength={24} placeholder="15 years, or At 50" onChange={e=>{setLabel(e.target.value);setErr('');}}/>
    <button className="button" disabled={!label.trim()}>Add</button>
   </form>
   <small>{err||'Years from now (“15 years”) or an age (“At 50”). They sort themselves in time order.'}</small>
   {custom.length>0&&<ul className="lm-area-edit">{custom.map(h=><li key={h.id}>
    <input aria-label={`Rename ${h.label}`} defaultValue={h.label} maxLength={24} onBlur={e=>{const v=e.target.value.trim();if(v&&v!==h.label)onRename(h.id,v);else e.target.value=h.label;}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}/>
    <button type="button" className="text-button lm-remove" onClick={()=>onRemove(h.id)} aria-label={`Remove ${h.label}`}>Remove</button>
   </li>)}</ul>}
  </div>
 </Popover>;
}
function EditAreas({anchor,areas,onRename,onAdd,onRemove,onClose}:{anchor:Element|null;areas:LifeArea[];onRename:(id:string,n:string)=>void;onAdd:(n:string)=>void;onRemove:(id:string)=>void;onClose:()=>void}){
 const [name,setName]=useState('');
 return <Popover anchor={anchor} onClose={onClose} label="Edit areas" className="lm-pop" width={380}>
  <div className="hz-pop-form">
   <span className="hz-pop-label">Areas of your life <span className="hz-count">{areas.length} of {AREA_MAX}</span></span>
   <ul className="lm-area-edit">{areas.map((a,i)=><li key={a.id} style={{'--c':ink(i)} as React.CSSProperties}>
    <input aria-label={`Rename ${a.name}`} defaultValue={a.name} maxLength={28} onBlur={e=>{const v=e.target.value.trim();if(v&&v!==a.name)onRename(a.id,v);else e.target.value=a.name;}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}/>
    <button type="button" className="text-button lm-remove" disabled={areas.length<=AREA_MIN} onClick={()=>onRemove(a.id)} aria-label={`Remove ${a.name}`}>Remove</button>
   </li>)}</ul>
   <form className="lm-area-add" onSubmit={e=>{e.preventDefault();const v=name.trim();if(v&&areas.length<AREA_MAX){onAdd(v);setName('');}}}>
    <input aria-label="New area" value={name} maxLength={28} placeholder="Add an area" disabled={areas.length>=AREA_MAX} onChange={e=>setName(e.target.value)}/>
    <button className="button" disabled={!name.trim()||areas.length>=AREA_MAX}>Add</button>
   </form>
   <small>{areas.length>=AREA_MAX?'That’s eight. Fold two together to add another.':areas.length<=AREA_MIN?'Five is the fewest. Rename one instead.':'Keep five to eight, so the map stays readable.'}</small>
  </div>
 </Popover>;
}
function PickArea({anchor,goal,gi,areas,current,onPick,onClose}:{anchor:Element|null;goal:PlanGoal;gi:number;areas:LifeArea[];current?:string;onPick:(a?:string)=>void;onClose:()=>void}){
 return <Popover anchor={anchor} onClose={onClose} label={`Pick an area for goal ${gi+1}`} className="lm-pop" width={340}>
  <div className="hz-pop-form">
   <span className="hz-pop-label">Which area is it in?</span>
   <p className="lm-pop-goal"><span className={`hz-mini-pennant ${goal.one?'one':''}`} aria-hidden="true">{gi+1}</span><span>{goal.text}</span></p>
   <div className="lm-chips">{areas.map((a,i)=><button key={a.id} type="button" className={`lm-chip ${current===a.id?'selected':''}`} aria-pressed={current===a.id} style={{'--c':ink(i)} as React.CSSProperties} onClick={()=>onPick(a.id)}>{a.name}</button>)}</div>
   {current&&<button type="button" className="text-button" onClick={()=>onPick(undefined)}>No area</button>}
  </div>
 </Popover>;
}
