// Life map: every part of the life you want, as one hand-drawn Buzan mind map. "Me" sits in a soft cloud; each area
// of life is a thick, tapering branch with its name written along it; its twigs hold this year's goals, then 5 years,
// 10 years and the person you are at 40, each a little further out. Tap an area to bring its whole ladder forward
// (at 40 down to today's next step). On a phone a small map sits above an accordion of the same areas.
import {Fragment,useEffect,useId,useLayoutEffect,useMemo,useRef,useState,type ComponentType,type RefObject} from 'react';
import './lifemap.css';
import type {State,PlanGoal,PlanStep,Vision,VisionWhen,LifeArea} from '../model';
import type {Mutate} from '../GoalControls';
import {Rough,sk,seedOf} from '../Sketch';
import {mindLayout,mindSizes,cloudPoints,branchPath,bezLength,taperedOutline,wrapText,bez,type Pt} from './geometry';
import {AreaCareer,AreaEducation,AreaHealth,AreaRelationship,AreaConnection,AreaOwnership,AreaMind,AreaOther} from '../icons';
import {SkyLine,Popover,UndoBar,ss,useWidth,usePhone,useMeasure,deadlineText} from './shared';
import {stepTag,stepToToday,nextStep} from '../plan';
import {addDays} from '../dates';
import {lifeAreas,lifeVisions,visionsAt,goalsIn,unassignedGoals,furthestVision,addVision,editVision,removeVision,restoreVision,addArea,renameArea,removeArea,restoreArea,setGoalArea,areaOf,
 AREA_HINTS,AREA_MIN,AREA_MAX,WHENS,WHEN_LABEL,WHEN_SHORT} from './life';
import {gsap,whenMotionOK,useGSAP,motionOK,CLEAR_DASH} from './motion';

// Eight clearly different inks (three mixed from tokens in lifemap.css). Red stays free to mean "past the deadline".
const INK=['var(--blue)','var(--violet)','var(--green)','var(--lm-plum)','var(--gold-text)','var(--lm-rust)','var(--lm-olive)','var(--ink-soft)'];
const AREA_KEY='reboot-life-area',ARRIVED_KEY='reboot-life-arrived';
// Canvas measuring uses the same families as the CSS tokens, so a font change in tokens.css carries over.
const tok=(name:string,fallback:string)=>{try{return getComputedStyle(document.documentElement).getPropertyValue(name).trim()||fallback;}catch{return fallback;}};
const SERIF=tok('--serif','"Cormorant Garamond", serif'),SANS=tok('--sans','"Source Sans 3", sans-serif'),HAND=tok('--hand','Caveat, cursive');
const F={vision:`500 17px ${SERIF}`,vision40:`650 17px ${SERIF}`,goal:`650 17px ${SERIF}`,name:`600 22px ${HAND}`,miniName:`600 19px ${HAND}`,small:`400 13px ${SANS}`,chip:`550 13px ${SANS}`};
// A small wheel (a 768px-tall window) sets its words one step smaller, so more of them fit in full.
const FS={vision:`500 15px ${SERIF}`,vision40:`650 15px ${SERIF}`,goal:`650 15px ${SERIF}`};
const LH={row:20},LHS={row:18};
const ink=(i:number)=>INK[i%INK.length];
const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
// One small drawing per area, in its ink, beside its branch (Buzan's doodles). Areas you add get a leaf.
const AREA_ICON:Record<string,ComponentType<{size?:number}>>={career:AreaCareer,education:AreaEducation,health:AreaHealth,relationship:AreaRelationship,connection:AreaConnection,ownership:AreaOwnership,mind:AreaMind};

type Pop={kind:'add';area:string;when:VisionWhen;anchor:HTMLElement|null}|{kind:'edit';id:string;anchor:HTMLElement|null}|{kind:'areas';anchor:HTMLElement|null}|{kind:'pick';goalId:string;anchor:HTMLElement|null};
type Undo={text:string;run:()=>void;key:number};

export function goalStatus(g:PlanGoal,now:string){const done=g.steps.filter(x=>x.done).length,total=g.steps.length,d=deadlineText(g.deadline,now);
 return {done,total,steps:total?`${done} of ${total} ${total===1?'step':'steps'}`:'No steps yet',due:d.text,late:d.late};}

export function LifeMap({state,mutate,goals,focusId,now,onFocus,onTwig,onAddStep}:{state:State;mutate:Mutate;goals:PlanGoal[];focusId:string;now:string;
 onFocus:(id:string)=>void;onTwig:(anchor:HTMLElement,step:PlanStep)=>void;onAddStep:(anchor:HTMLElement)=>void}){
 const phone=usePhone(),root=useRef<HTMLDivElement>(null),rootW=useWidth(root,1100,phone);
 const areas=lifeAreas(state),visions=lifeVisions(state),firstRun=visions.length===0;
 const [areaId,setAreaId]=useState(()=>ss.get(AREA_KEY)??'');
 const focusArea=areas.some(a=>a.id===areaId)?areaId:'';
 const setArea=(id:string)=>{setAreaId(id);ss.set(AREA_KEY,id);};
 const focusAfter=useRef<string|null>(null);
 const closeArea=()=>{focusAfter.current=`name:${areaId}`;setArea('');};
 const openFromList=(id:string)=>{focusAfter.current='ladder';setArea(id);};
 const [pop,setPop]=useState<Pop|null>(null),[undo,setUndo]=useState<Undo|null>(null),[pendingAdd,setPendingAdd]=useState<{area:string;when:VisionWhen}|null>(null);
 const evening=new Date().getHours()>=17;
 // The ladder sits beside the map only when the map still gets a two-sided spread (about 900px); otherwise it goes under it.
 const panelW=rootW>=1900?480:rootW>=1500?430:380,gap=32,side=!phone&&rootW-panelW-gap>=900,stacked=!phone&&!side,wheelW=side?rootW-panelW-gap:rootW;

 // Open the add popover once the ladder for that area is on screen, anchored to its "Add" button.
 useEffect(()=>{if(!pendingAdd)return;const el=root.current?.querySelector<HTMLElement>(`[data-ladder="${pendingAdd.area}"] [data-add="${pendingAdd.when}"]`);
  if(el){el.scrollIntoView({block:'nearest'});setPop({kind:'add',area:pendingAdd.area,when:pendingAdd.when,anchor:el});}setPendingAdd(null);},[pendingAdd]);
 // Esc steps back out of a focused area.
 useEffect(()=>{if(!focusArea||phone)return;const key=(e:KeyboardEvent)=>{if(e.key!=='Escape'||document.querySelector('.hz-popover'))return;const t=e.target instanceof Element?e.target:null;if(t?.closest('input,textarea'))return;closeArea();};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});

 const startAt=(area:string,when:VisionWhen)=>{setArea(area);setPendingAdd({area,when});};
 const doToday=(g:PlanGoal,st:PlanStep)=>{const day=evening?addDays(now,1):now;mutate(s=>{stepToToday(s,g.id,st.id,day);},'plan step to today');};
 const dropVision=(id:string)=>{let r:ReturnType<typeof removeVision>;mutate(s=>{r=removeVision(s,id);},'life remove vision');setPop(null);
  setUndo({text:'Removed. Undo',key:Date.now(),run:()=>{const x=r;if(x)mutate(s=>restoreVision(s,x.vision,x.index),'life restore vision');}});};
 const dropArea=(id:string)=>{let r:ReturnType<typeof removeArea>;mutate(s=>{r=removeArea(s,id);},'life remove area');if(focusArea===id)setArea('');
  setUndo({text:'Area removed. Undo',key:Date.now(),run:()=>{const x=r;if(x)mutate(s=>restoreArea(s,x),'life restore area');}});};
 const ladderProps=(a:LifeArea,i:number):LadderProps=>({state,area:a,index:i,goals,focusId,now,evening,
  onVision:(v,anchor)=>setPop({kind:'edit',id:v.id,anchor}),onAdd:(when,anchor)=>setPop({kind:'add',area:a.id,when,anchor}),
  onGoal:g=>onFocus(g.id),onStep:(g,st,anchor)=>{onFocus(g.id);onTwig(anchor,st);},onDoToday:doToday,onAddStep:(g,anchor)=>{onFocus(g.id);onAddStep(anchor);},
  onPickArea:(g,anchor)=>setPop({kind:'pick',goalId:g.id,anchor})});
 const tray=<Tray state={state} goals={goals} area={areas.find(a=>a.id===focusArea)} onAssign={(g,area)=>mutate(s=>setGoalArea(s,g.id,area),'life goal area')} onPick={(g,anchor)=>setPop({kind:'pick',goalId:g.id,anchor})}/>;

 useGSAP(()=>{const mm=whenMotionOK(()=>{
  if(ss.get(ARRIVED_KEY)){gsap.from(root.current,{opacity:0,duration:.2,ease:'enter',clearProps:'opacity'});return;}
  const q=(s:string)=>gsap.utils.toArray<Element>(s,root.current);
  // Marked as seen only once it has played (or been skipped), so a remount mid-way plays it again rather than never.
  const done=()=>{ss.set(ARRIVED_KEY,'1');root.current?.classList.remove('arriving');gsap.set(q('.mm-spine'),{clearProps:CLEAR_DASH});};root.current?.classList.add('arriving');
  const tl=gsap.timeline({defaults:{ease:'enter'},onComplete:done});
  // The branches grow out from "Me" (their centrelines draw), then the inked shapes fill in and the words arrive.
  tl.from(q('.mm-cloud, .mm-centre'),{opacity:0,duration:.35,clearProps:'opacity'},0)
   .from(q('.mm-spine:not(.twig)'),{drawSVG:'0%',duration:.55,ease:'pen',stagger:.05,clearProps:CLEAR_DASH},.1)
   .from(q('.mm-spine.twig'),{drawSVG:'0%',duration:.35,ease:'pen',stagger:.01,clearProps:CLEAR_DASH},.45)
   .from(q('.mm-fill, .mm-line, .mm-line-add, .mm-name'),{opacity:0,duration:.35,clearProps:'opacity'},.55)
   .from(q('.mm-row, .mm-icon, .mm-mini-name, .lm-acc'),{opacity:0,y:6,duration:.3,stagger:.015,clearProps:'opacity,transform'},.6)
   .from(q('.lm-panel > *'),{opacity:0,y:10,duration:.4,stagger:.05,clearProps:'opacity,transform'},.3);
  const skip=()=>tl.progress(1);window.addEventListener('pointerdown',skip,true);window.addEventListener('keydown',skip,true);
  return()=>{window.removeEventListener('pointerdown',skip,true);window.removeEventListener('keydown',skip,true);root.current?.classList.remove('arriving');};
 });return()=>mm.revert();},{scope:root,dependencies:[phone]});
 // Refocus: the panel's ladder rises in (quick, so it never slows you down). When the panel sits under the wheel,
 // it is brought into view so the change is never off-screen.
 const lastArea=useRef(focusArea);
 useLayoutEffect(()=>{if(lastArea.current===focusArea)return;lastArea.current=focusArea;if(phone)return;
  const r=root.current,next=focusAfter.current;focusAfter.current=null;
  if(next==='ladder')r?.querySelector<HTMLElement>('.lm-ladder h2')?.focus({preventScroll:true});
  else if(next?.startsWith('name:')){const i=areas.findIndex(a=>a.id===next.slice(5));[...(r?.querySelectorAll<HTMLElement>('.mm-name-btn')??[])].find(b=>b.dataset.area===String(i))?.focus({preventScroll:true});}
  if(stacked&&focusArea)r?.querySelector('.lm-panel')?.scrollIntoView({block:'nearest',behavior:motionOK()?'smooth':'auto'});
  const mm=whenMotionOK(()=>{gsap.from(gsap.utils.toArray<Element>('.lm-panel > *',root.current),{opacity:0,y:6,duration:.2,stagger:.03,ease:'enter',overwrite:'auto',clearProps:'opacity,transform'});});
  return()=>mm.revert();},[focusArea]);

 const popVision=pop?.kind==='edit'?visions.find(v=>v.id===pop.id):undefined,popGoal=pop?.kind==='pick'?goals.find(g=>g.id===pop.goalId):undefined;
 return <div ref={root} className={`lm ${phone?'is-phone':side?'is-side':'is-stacked'}`}>
  {phone?<PhoneLadder state={state} areas={areas} goals={goals} firstRun={firstRun} focusArea={focusArea} setArea={setArea} startAt={startAt} ladderProps={ladderProps} tray={tray} mutate={mutate} onAreas={anchor=>setPop({kind:'areas',anchor})}/>
  :<div className="lm-desk" style={{'--lm-panel':`${panelW}px`,'--lm-gap':`${gap}px`} as React.CSSProperties}>
   <MindMap state={state} mutate={mutate} areas={areas} goals={goals} focusArea={focusArea} focusId={focusId} now={now} width={wheelW} compact={stacked&&firstRun}
    onArea={id=>setArea(focusArea===id?'':id)} onGoal={(g,area)=>{setArea(area);onFocus(g.id);}} onVision={(v,anchor)=>{setArea(v.area);setPop({kind:'edit',id:v.id,anchor});}}
    onAdd={(area,when,anchor)=>setPop({kind:'add',area,when,anchor})}/>
   <aside className={`lm-panel ${panelW<400?'narrow':''}`} aria-label="Area detail">
    {focusArea?(()=>{const i=areas.findIndex(a=>a.id===focusArea);return <><Ladder {...ladderProps(areas[i],i)} onClose={closeArea}/>{tray}</>;})()
    :firstRun?<><FirstPrompt areas={areas} onPick={id=>startAt(id,'40')}/>{tray}</>
    :<><Overview state={state} areas={areas} goals={goals} now={now} onArea={openFromList} onAreas={anchor=>setPop({kind:'areas',anchor})}/>{tray}</>}
   </aside>
  </div>}
  {pop?.kind==='add'&&<AddVision anchor={pop.anchor} area={areas.find(a=>a.id===pop.area)?.name??''} when={pop.when} onClose={()=>setPop(null)} onAdd={t=>mutate(s=>{addVision(s,pop.area,pop.when,t);},'life add vision')}/>}
  {pop?.kind==='edit'&&popVision&&<EditVision anchor={pop.anchor} vision={popVision} area={areas.find(a=>a.id===popVision.area)?.name??''} onClose={()=>setPop(null)}
   onSave={(text,when)=>{mutate(s=>editVision(s,popVision.id,{text,when}),'life edit vision');setPop(null);}} onRemove={()=>dropVision(popVision.id)}/>}
  {pop?.kind==='areas'&&<EditAreas anchor={pop.anchor} areas={areas} onClose={()=>setPop(null)} onRename={(id,n)=>mutate(s=>renameArea(s,id,n),'life rename area')}
   onAdd={n=>mutate(s=>{addArea(s,n);},'life add area')} onRemove={id=>dropArea(id)}/>}
  {pop?.kind==='pick'&&popGoal&&<PickArea anchor={pop.anchor} goal={popGoal} gi={goals.indexOf(popGoal)} areas={areas} current={areaOf(state,popGoal)} onClose={()=>setPop(null)}
   onPick={area=>{mutate(s=>setGoalArea(s,popGoal.id,area),'life goal area');setPop(null);}}/>}
  {undo&&<UndoBar key={undo.key} text={undo.text} onUndo={undo.run} onDone={()=>setUndo(null)}/>}
 </div>;
}

// The map fills the window below it (html zoom included), so a big screen gets a big map, not empty paper.
function useFillHeight(ref:RefObject<HTMLElement|null>,min:number,max:number){
 const [h,setH]=useState(min);
 useLayoutEffect(()=>{const calc=()=>{const el=ref.current;if(!el)return;const z=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
   const top=el.getBoundingClientRect().top+scrollY,avail=(innerHeight-top)/z-28;setH(x=>{const v=Math.round(Math.max(min,Math.min(max,avail)));return Math.abs(v-x)>2?v:x;});};
  calc();window.addEventListener('resize',calc);return()=>window.removeEventListener('resize',calc);},[ref,min,max]);
 return h;
}

// One idea on the map: its words sit on their own short line at the end of a twig.
type MRow={key:string;kind:'vision'|'goal'|'more'|'add';horizon:number;kicker?:string;lines:string[];w:number;h:number;base:number;v?:Vision;g?:PlanGoal;n?:number;meta?:string[];late?:boolean;when?:VisionWhen;count?:number};
const KICK=14,ROW_GAP=8;
// Wraps to the fewest lines that fit, then evens them out, so a long idea never leaves one word alone on its last line.
function wrapEven(text:string,room:number,measure:(t:string)=>number){const first=wrapText(text,room,measure,99).lines;if(first.length<2)return first;
 let lo=Math.max(60,Math.ceil(measure(text)/first.length)),hi=room,best=first;
 while(lo<=hi){const mid=Math.floor((lo+hi)/2),w=wrapText(text,mid,measure,99).lines;if(w.length<=first.length){best=w;hi=mid-1;}else lo=mid+1;}
 return best;}

function MindMap({state,mutate,areas,goals,focusArea,focusId,now,width,onArea,onGoal,onVision,onAdd,compact}:{state:State;mutate:Mutate;areas:LifeArea[];goals:PlanGoal[];focusArea:string;focusId:string;now:string;width:number;
 onArea:(id:string)=>void;onGoal:(g:PlanGoal,area:string)=>void;onVision:(v:Vision,anchor:HTMLElement)=>void;onAdd:(area:string,when:VisionWhen,anchor:HTMLElement)=>void;compact?:boolean}){
 const uid=useId().replace(/:/g,''),wrap=useRef<HTMLDivElement>(null),fill=useFillHeight(wrap,440,1400),height=compact?Math.min(fill,460):fill;
 const sizes=mindSizes({width,height}),small=sizes.room<210,lh=small?LHS:LH,fi=areas.findIndex(a=>a.id===focusArea);
 const mV=useMeasure(small?FS.vision:F.vision),mV40=useMeasure(small?FS.vision40:F.vision40),mG=useMeasure(small?FS.goal:F.goal),mS=useMeasure(F.small),mC=useMeasure(F.chip),mName=useMeasure(F.name);
 const rows=useMemo(()=>areas.map((a,i)=>{const room=sizes.room,out:MRow[]=[];
  goalsIn(state,a.id).forEach((g,j)=>{const n=goals.indexOf(g)+1,st=goalStatus(g,now),k=j===0?KICK:0,textW=room-30;
   const meta=st.late?`${st.done} of ${st.total} · past the deadline`:`${st.total?`${st.done} of ${st.total}`:'No steps yet'}${g.deadline?` · ${st.due.replace(/^By .* - /,'')}`:''}`;
   const lines=wrapEven(g.text,textW,mG.measure),metaLines=mS.measure(meta)<=textW?[meta]:meta.split(' · '),base=k+lines.length*lh.row+3;
   out.push({key:g.id,kind:'goal',horizon:0,kicker:j===0?WHEN_SHORT.year:undefined,lines,w:30+Math.max(...lines.map(mG.measure),...metaLines.map(mS.measure)),base,h:base+6+metaLines.length*16+ROW_GAP,g,n,meta:metaLines,late:st.late});});
  (['5y','10y','40'] as VisionWhen[]).forEach((when,hi)=>{const h=hi+1,vs=visionsAt(state,a.id,when),shown=vs.length>2?vs.slice(0,2):vs,font=when==='40'?mV40:mV;
   shown.forEach((v,j)=>{const k=j===0?KICK:0,lines=wrapEven(v.text,room,font.measure),base=k+lines.length*lh.row+3;
    out.push({key:v.id,kind:'vision',horizon:h,kicker:j===0?WHEN_SHORT[when]:undefined,lines,w:Math.max(...lines.map(font.measure)),base,h:base+ROW_GAP,v});});
   if(vs.length>2){const t=`+${vs.length-2} more`;out.push({key:`${a.id}-${when}-more`,kind:'more',horizon:h,lines:[t],w:mC.measure(t)+4,base:20,h:20+ROW_GAP,count:vs.length-2,when});}
   if(i===fi){const t=`+ ${WHEN_LABEL[when]}`;out.push({key:`${a.id}-${when}-add`,kind:'add',horizon:h,lines:[t],w:mC.measure(t)+8,base:24,h:24+ROW_GAP,when});}});
  return out;}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [state,goals,areas,fi,now,sizes.room,small,mV.v,mV40.v,mG.v,mS.v,mC.v]);
 const L=useMemo(()=>mindLayout(rows.map(r=>({rows:r.map(x=>({h:x.h,base:x.base,w:x.w,horizon:x.horizon})),minH:44})),{width,height}),[rows,width,height]);
 const shapes=useMemo(()=>({
  cloud:sk.curve(cloudPoints(L.cloud.cx,L.cloud.cy,L.cloud.w,L.cloud.h),{roughness:.7,strokeWidth:1.6,fill:'F',fillStyle:'solid',seed:seedOf('me-cloud')}),
  branch:L.branches.map((b,i)=>sk.polygon(taperedOutline(b.p0,b.c1,b.c2,b.tip,i===fi?20:17,5,24),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.4,bowing:.3,seed:seedOf('mm'+areas[i]?.id)})),
  twig:L.branches.map((b,i)=>b.twigs.map((t,j)=>sk.polygon(taperedOutline(t.p0,t.c1,t.c2,t.p3,4.6,1.6,14),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.3,seed:seedOf('tw'+areas[i]?.id+j)}))),
  line:L.branches.map((b,i)=>b.twigs.map((t,j)=>rows[i][j]?.kind==='add'?null:sk.line(t.x,t.y,t.x+b.side*t.len,t.y,{roughness:.5,strokeWidth:rows[i][j]?.horizon===3?2.2:1.5,seed:seedOf('ln'+rows[i][j]?.key)}))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[L,fi,areas.map(a=>a.id).join()]);
 const dim=(i:number)=>fi>=0&&i!==fi;
 const spine=(p0:Pt,c1:Pt,c2:Pt,p3:Pt)=>`M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p3[0].toFixed(1)} ${p3[1].toFixed(1)}`;
 // Each area's name is written along its branch; its size follows the branch so it always fits in full.
 const names=useMemo(()=>{
  // One size for every area's name (a very long custom name is the only one that may step down, never below 15px).
  // The name runs along most of its branch, centred a little past the middle, written above the stroke.
  const NAME=small?18:20;
  const base=L.branches.map((b,i)=>{const len=bezLength(b.p0,b.c1,b.c2,b.tip),text=areas[i].name.toUpperCase(),w22=mName.measure(text)||text.length*12,size=Math.max(15,Math.min(NAME,22*(len*.86)/w22)),w=w22*size/22;
   const c=.55,half=Math.min(.45,w/2/Math.max(1,len)),pts:Pt[]=[];
   for(let k=0;k<=12;k++){const tt=c-half+(2*half)*k/12,a=bez(b.p0,b.c1,b.c2,b.tip,tt),a2=bez(b.p0,b.c1,b.c2,b.tip,Math.min(1,tt+.01));let dx=a2[0]-a[0],dy=a2[1]-a[1];if(b.side===-1){dx=-dx;dy=-dy;}const dl=Math.hypot(dx,dy)||1;
    pts.push([a[0]+dy/dl*(size*.75+8),a[1]-dx/dl*(size*.75+8)]);}
   return {text,size,w,offset:b.side===1?`${c*100}%`:`${(1-c)*100}%`,pts,mid:bez(b.p0,b.c1,b.c2,b.tip,c)};});
  // Each area's drawing sits just beside its own branch, at the first spot clear of every name, branch and twig.
  const samples=L.branches.map(b=>[...Array.from({length:25},(_,k)=>bez(b.p0,b.c1,b.c2,b.tip,k/24)),...b.twigs.flatMap(t=>Array.from({length:7},(_,k)=>bez(t.p0,t.c1,t.c2,t.p3,k/6)))]);
  const nameHit=(p:Pt)=>base.some(n=>n.pts.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<n.size*.6+16));
  const clear=(p:Pt,i:number)=>!nameHit(p)&&L.branches.every((_,j)=>samples[j].every((q,k)=>Math.hypot(q[0]-p[0],q[1]-p[1])>(j===i&&k<25?20:26)))
   &&Math.hypot(p[0]-L.cloud.cx,(p[1]-L.cloud.cy)*L.cloud.w/L.cloud.h)>L.cloud.w/2+18;
  const placed:Pt[]=[];
  return L.branches.map((b,i)=>{let spot:Pt|null=null;
   for(const tt of [.55,.4,.7,.3,.82])for(const sgn of [1,-1]){if(spot)break;const a=bez(b.p0,b.c1,b.c2,b.tip,tt),a2=bez(b.p0,b.c1,b.c2,b.tip,tt+.02),dx=a2[0]-a[0],dy=a2[1]-a[1],dl=Math.hypot(dx,dy)||1;let nx=-dy/dl,ny=dx/dl;if(ny<0){nx=-nx;ny=-ny;}
    const p:Pt=[a[0]+sgn*nx*26,a[1]+sgn*ny*26];if(clear(p,i)&&placed.every(q=>Math.hypot(q[0]-p[0],q[1]-p[1])>36)){spot=p;placed.push(p);}}
   return {...base[i],icon:spot};});},
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [L,areas,mName.v,fi,small]);
 const skyLen=Math.max(12,(state.settings.identity?.trim()||'Who are you becoming? Write one line.').length),skySize=Math.round(Math.max(14,Math.min(21,Math.sqrt((L.cloud.w-44)*(L.cloud.h-30)/(skyLen*.62)))));
 return <div ref={wrap} className={`mm ${fi>=0?'has-focus':''} ${small?'is-small':''}`} style={{height:L.height}} data-centre={`${L.cloud.cx} ${L.cloud.cy}`}>
  <svg className="mm-svg" width={L.width} height={L.height} aria-hidden="true">
   <defs>{L.branches.map((b,i)=><path key={i} id={`${uid}-n${i}`} d={branchPath(b)}/>)}</defs>
   {L.branches.map((b,i)=><g key={areas[i].id} className={`mm-area ${dim(i)?'dim':''} ${i===fi?'focused':''}`} style={{'--c':ink(i)} as React.CSSProperties}>
    <path className="mm-spine" d={spine(b.p0,b.c1,b.c2,b.tip)}/>
    {b.twigs.map((t,j)=><path key={j} className="mm-spine twig" d={spine(t.p0,t.c1,t.c2,t.p3)}/>)}
    <Rough className="mm-fill" shape={shapes.branch[i]}/>
    {b.twigs.map((t,j)=><g key={j} className={`mm-twig ${rows[i][j]?.kind??''}`}><Rough className="mm-fill" shape={shapes.twig[i][j]}/>
     {shapes.line[i][j]?<Rough className="mm-line" shape={shapes.line[i][j]}/>:<line className="mm-line-add" x1={t.x} y1={t.y} x2={t.x+b.side*t.len} y2={t.y}/>}</g>)}
    <text className="mm-name" dy={-(i===fi?13:11)} style={{fontSize:`${names[i].size}px`}}><textPath href={`#${uid}-n${i}`} startOffset={names[i].offset} textAnchor="middle">{names[i].text}</textPath></text>
   </g>)}
   <Rough className="mm-cloud" shape={shapes.cloud}/>
  </svg>
  <div className="lm-centre mm-centre" style={{left:L.cloud.cx-L.cloud.w/2+22,top:L.cloud.cy-L.cloud.h/2+14,width:L.cloud.w-44,height:L.cloud.h-28,'--lm-sky':`${skySize}px`} as React.CSSProperties}><SkyLine state={state} mutate={mutate} className="lm-sky"/></div>
  {L.branches.map((b,i)=>{const a=areas[i],Icon=AREA_ICON[a.id]??AreaOther,n=names[i];return <Fragment key={a.id}>
   <button type="button" className={`mm-name-btn ${dim(i)?'dim':''}`} data-area={i} style={{left:n.mid[0]-n.w/2-8,top:n.mid[1]-34,width:n.w+16}} aria-pressed={i===fi} onClick={()=>onArea(a.id)}
    aria-label={`${a.name}${i===fi?', shown in detail. Show every area':'. Show this area in detail'}`}/>
   {n.icon&&<span className={`mm-icon ${dim(i)?'dim':''}`} style={{left:n.icon[0]-13,top:n.icon[1]-13,'--c':ink(i)} as React.CSSProperties} aria-hidden="true"><Icon size={26}/></span>}
   {rows[i].map((r,j)=>{const t=b.twigs[j],right=b.side===1,style={left:right?t.x+3:t.x-t.len+3,top:t.top,width:t.len-6,'--c':ink(i)} as React.CSSProperties,cls=`mm-row ${r.kind} h${r.horizon} ${right?'side-r':'side-l'} ${dim(i)?'dim':''}`;
    const kicker=r.kicker&&<span className="mm-kicker">{r.kicker}</span>;
    if(r.kind==='goal'&&r.g)return <button key={r.key} type="button" className={`${cls} ${r.g.id===focusId?'current':''}`} style={style} onClick={()=>onGoal(r.g!,a.id)} aria-label={`Goal ${r.n}: ${r.g.text}. ${r.meta?.join(', ')}.`}>
     {kicker}<span className="mm-goal"><span className={`hz-mini-pennant ${r.g.one?'one':''}`} aria-hidden="true">{r.n}</span><span className="mm-text">{r.lines.map((l,k)=><span key={k}>{l}</span>)}</span></span>
     <span className={`mm-meta ${r.late?'late':''}`}>{r.meta?.map((l,k)=><span key={k}>{l}</span>)}</span></button>;
    if(r.kind==='vision'&&r.v)return <button key={r.key} type="button" className={cls} style={style} onClick={e=>onVision(r.v!,e.currentTarget)} aria-label={`${a.name}, ${WHEN_LABEL[r.v.when].toLowerCase()}: ${r.v.text}. Edit`}>
     {kicker}<span className="mm-text">{r.lines.map((l,k)=><span key={k}>{l}</span>)}</span></button>;
    if(r.kind==='more')return <button key={r.key} type="button" className={cls} style={style} onClick={()=>onArea(a.id)} aria-label={`${plural(r.count??0,'more vision')} for ${a.name}, ${WHEN_LABEL[r.when!].toLowerCase()}. Show them all`}>{r.lines[0]}</button>;
    return <button key={r.key} type="button" className={cls} style={style} onClick={e=>onAdd(a.id,r.when!,e.currentTarget)} aria-label={`Add a vision for ${a.name}, ${WHEN_LABEL[r.when!].toLowerCase()}`}>{r.lines[0]}</button>;})}
  </Fragment>;})}
 </div>;
}

interface LadderProps{state:State;area:LifeArea;index:number;goals:PlanGoal[];focusId:string;now:string;evening:boolean;onClose?:()=>void;
 onVision:(v:Vision,anchor:HTMLElement)=>void;onAdd:(when:VisionWhen,anchor:HTMLElement)=>void;onGoal:(g:PlanGoal)=>void;onStep:(g:PlanGoal,st:PlanStep,anchor:HTMLElement)=>void;
 onDoToday:(g:PlanGoal,st:PlanStep)=>void;onAddStep:(g:PlanGoal,anchor:HTMLElement)=>void;onPickArea:(g:PlanGoal,anchor:HTMLElement)=>void}
// One area, far to near: at 40, in 10 years, in 5 years, this year's goals, and the next step of each, with "Do today".
function Ladder({state,area,index,goals,focusId,now,evening,onClose,onVision,onAdd,onGoal,onStep,onDoToday,onAddStep,onPickArea}:LadderProps){
 const mine=goalsIn(state,area.id),hint=AREA_HINTS[area.id];
 return <section className="lm-ladder" data-ladder={area.id} style={{'--c':ink(index)} as React.CSSProperties} aria-label={`${area.name}, from 40 to today`}>
  {onClose&&<header className="lm-ladder-head">
   <div><h2 tabIndex={-1}>{area.name}</h2>{hint&&<p>{hint}</p>}</div>
   <button type="button" className="text-button lm-back" onClick={onClose}>All areas</button>
  </header>}
  <ol className="lm-rungs">
   {WHENS.map(w=>{const vs=visionsAt(state,area.id,w);return <li key={w} className="lm-rung">
    <h3 className="lm-rung-title">{WHEN_LABEL[w]}</h3>
    {vs.length>0&&<ul className="lm-visions">{vs.map(v=><li key={v.id}><button type="button" className="lm-vision" onClick={e=>onVision(v,e.currentTarget)} aria-label={`${v.text}. Edit`}>{v.text}</button></li>)}</ul>}
    <button type="button" className="text-button lm-add" data-add={w} onClick={e=>onAdd(w,e.currentTarget)}><span aria-hidden="true">+</span> {vs.length?'Add another':w==='40'?`Who are you at 40?`:'Add a vision'}</button>
   </li>;})}
   <li className="lm-rung year">
    <h3 className="lm-rung-title">This year</h3>
    {mine.length===0&&<p className="lm-empty">No goals here yet. Give one of your ten an area below, or add one on the Horizon.</p>}
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

// Every area at a glance, with what the wheel can't show: this year's progress and the next step.
function Overview({state,areas,goals,now,onArea,onAreas}:{state:State;areas:LifeArea[];goals:PlanGoal[];now:string;onArea:(id:string)=>void;onAreas:(anchor:HTMLElement)=>void}){
 return <section className="lm-overview">
  <header className="lm-ladder-head"><div><h2>Every area</h2><p>This year in each, and the next step. Tap one for its whole ladder.</p></div>
   <button type="button" className="text-button" onClick={e=>onAreas(e.currentTarget)}>Edit areas</button></header>
  <ul className="lm-area-list">{areas.map((a,i)=>{const gs=goalsIn(state,a.id),nv=lifeVisions(state).filter(v=>v.area===a.id).length;
   return <li key={a.id}><button type="button" className="lm-area-row" style={{'--c':ink(i)} as React.CSSProperties} onClick={()=>onArea(a.id)}>
    <span className="lm-area-top"><span className="lm-area-name">{a.name}</span><span className="lm-area-count">{plural(nv,'vision')} · {plural(gs.length,'goal')}</span></span>
    {gs.length?gs.slice(0,2).map(g=>{const n=goals.indexOf(g)+1,st=goalStatus(g,now),next=nextStep(g);return <span key={g.id} className="lm-area-goal">
     <span className={`hz-mini-pennant ${g.one?'one':''}`} aria-hidden="true">{n}</span>
     <span className="lm-area-next">{next?<><span className="lm-area-kicker">Next</span> {next.text}</>:g.steps.length?'Every step done':'No steps yet'}</span>
     <span className={`lm-area-prog ${st.late?'late':''}`}>{st.late?'Past the deadline':st.total?`${st.done} of ${st.total}`:''}</span></span>;})
    :<span className="lm-area-line empty">No goal this year yet</span>}
   </button></li>;})}</ul>
 </section>;
}

function FirstPrompt({areas,onPick}:{areas:LifeArea[];onPick:(id:string)=>void}){
 return <section className="lm-first">
  <h2>Who are you at 40?</h2>
  <p>Start with one area. Write it as if it’s already true: “I own my home.” Then work back to 10 years, 5 years and this year.</p>
  <div className="lm-chips">{areas.map((a,i)=><button key={a.id} type="button" className="lm-chip" style={{'--c':ink(i)} as React.CSSProperties} onClick={()=>onPick(a.id)}>{a.name}</button>)}</div>
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

function PhoneLadder({state,areas,goals,firstRun,focusArea,setArea,startAt,ladderProps,tray,mutate,onAreas}:{state:State;areas:LifeArea[];goals:PlanGoal[];firstRun:boolean;focusArea:string;setArea:(id:string)=>void;startAt:(a:string,w:VisionWhen)=>void;
 ladderProps:(a:LifeArea,i:number)=>LadderProps;tray:React.ReactNode;mutate:Mutate;onAreas:(anchor:HTMLElement)=>void}){
 const openArea=(id:string)=>{setArea(id);requestAnimationFrame(()=>document.querySelector(`[data-acc="${id}"]`)?.scrollIntoView({block:'start',behavior:motionOK()?'smooth':'auto'}));};
 return <div className="lm-phone">
  <SkyLine state={state} mutate={mutate}/>
  <MiniMap areas={areas} focusArea={focusArea} onArea={openArea}/>
  {firstRun&&<FirstPrompt areas={areas} onPick={id=>startAt(id,'40')}/>}
  <div className="lm-accordion">{areas.map((a,i)=>{const open=focusArea===a.id,nv=lifeVisions(state).filter(v=>v.area===a.id).length,ng=goalsIn(state,a.id).length,far=furthestVision(state,a.id);
   return <div key={a.id} data-acc={a.id} className={`lm-acc ${open?'open':''}`} style={{'--c':ink(i)} as React.CSSProperties}>
    <h2 className="lm-acc-h"><button type="button" aria-expanded={open} onClick={()=>setArea(open?'':a.id)}>
     <span className="lm-area-name">{a.name}</span>
     <span className={`lm-area-line ${far?'':'empty'}`}>{far?<>{far.when!=='40'&&<span className="lm-area-kicker">{WHEN_LABEL[far.when]}</span>} {far.text}</>:'Nothing written yet'}</span>
     <span className="lm-area-count">{plural(nv,'vision')} · {plural(ng,'goal')}</span>
    </button></h2>
    {open&&<Ladder {...ladderProps(a,i)}/>}
   </div>;})}</div>
  {tray}
  <button type="button" className="text-button lm-edit-areas" onClick={e=>onAreas(e.currentTarget)}>Edit areas</button>
 </div>;
}

// The phone's picture: the same mind map, small: "Me" in its cloud and one branch per area, each name on its own line.
// Tap a name to open that area below.
function MiniMap({areas,focusArea,onArea}:{areas:LifeArea[];focusArea:string;onArea:(id:string)=>void}){
 const wrap=useRef<HTMLDivElement>(null),w=useWidth(wrap,358),mN=useMeasure(F.miniName),fi=areas.findIndex(a=>a.id===focusArea);
 const texts=areas.map(a=>a.name.toUpperCase());
 const L=useMemo(()=>mindLayout(areas.map((_,i)=>({rows:[{h:38,base:28,w:Math.ceil(mN.measure(texts[i]))+6,horizon:0}],minH:38})),{width:w,height:0,mode:'right',cloudW:Math.min(120,w*.32),branchLen:Math.max(34,w*.1),twig:20,stagger:0,gap:6,pad:8}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [areas,w,mN.v]);
 const shapes=useMemo(()=>({cloud:sk.curve(cloudPoints(L.cloud.cx,L.cloud.cy,L.cloud.w,L.cloud.h,7),{roughness:.7,strokeWidth:1.4,fill:'F',fillStyle:'solid',seed:seedOf('me-mini')}),
  branch:L.branches.map((b,i)=>sk.polygon(taperedOutline(b.p0,b.c1,b.c2,b.tip,i===fi?11:9,3,18),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.35,seed:seedOf('mm'+areas[i]?.id)})),
  twig:L.branches.map((b,i)=>{const t=b.twigs[0];return sk.polygon(taperedOutline(t.p0,t.c1,t.c2,t.p3,3.2,1.4,10),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.3,seed:seedOf('mt'+areas[i]?.id)});}),
  line:L.branches.map((b,i)=>{const t=b.twigs[0];return sk.line(t.x,t.y,t.x+t.len,t.y,{roughness:.5,strokeWidth:1.5,seed:seedOf('ml'+areas[i]?.id)});}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[L,fi,areas.map(a=>a.id).join()]);
 return <div ref={wrap} className="mm-mini">
  <div className="mm-mini-stage" style={{height:L.height}}>
   <svg className="mm-svg" width={L.width} height={L.height} aria-hidden="true">
    {L.branches.map((b,i)=><g key={areas[i].id} className={`mm-area ${fi>=0&&i!==fi?'dim':''}`} style={{'--c':ink(i)} as React.CSSProperties}>
     <Rough className="mm-fill" shape={shapes.branch[i]}/><Rough className="mm-fill" shape={shapes.twig[i]}/><Rough className="mm-line" shape={shapes.line[i]}/></g>)}
    <Rough className="mm-cloud" shape={shapes.cloud}/>
   </svg>
   <span className="mm-mini-me" style={{left:L.cloud.cx-40,top:L.cloud.cy-15}} aria-hidden="true">Me</span>
   {L.branches.map((b,i)=>{const t=b.twigs[0];return <button key={areas[i].id} type="button" className={`mm-mini-name ${fi>=0&&i!==fi?'dim':''}`} style={{left:t.x+2,top:t.top,width:t.len-4,'--c':ink(i)} as React.CSSProperties}
    aria-pressed={i===fi} aria-label={`${areas[i].name}. Open below`} onClick={()=>onArea(areas[i].id)}>{texts[i]}</button>;})}
  </div>
 </div>;
}

function AddVision({anchor,area,when,onAdd,onClose}:{anchor:Element|null;area:string;when:VisionWhen;onAdd:(t:string)=>void;onClose:()=>void}){
 const [text,setText]=useState(''),[added,setAdded]=useState(0);
 return <Popover anchor={anchor} onClose={onClose} label={`${area}, ${WHEN_LABEL[when].toLowerCase()}`} className="lm-pop" width={360}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onAdd(v);setText('');setAdded(a=>a+1);}}>
   <label><span className="hz-pop-label">{area} <span className="lm-pop-when">{WHEN_LABEL[when]}</span></span><input autoFocus value={text} maxLength={160} placeholder="I …" onChange={e=>setText(e.target.value)}/></label>
   <small>{added?`Added ${added}. Write another, or press Esc.`:'Present tense, as if it’s already true: “I own my home.”'}</small>
   <div className="hz-pop-buttons"><button type="button" className="text-button" onClick={onClose}>Done</button><button className="button" disabled={!text.trim()}>Add</button></div>
  </form>
 </Popover>;
}
function EditVision({anchor,vision,area,onSave,onRemove,onClose}:{anchor:Element|null;vision:Vision;area:string;onSave:(t:string,w:VisionWhen)=>void;onRemove:()=>void;onClose:()=>void}){
 const [text,setText]=useState(vision.text),[when,setWhen]=useState<VisionWhen>(vision.when);
 return <Popover anchor={anchor} onClose={onClose} label={`Edit a vision for ${area}`} className="lm-pop" width={380}>
  <form className="hz-pop-form" onSubmit={e=>{e.preventDefault();if(text.trim())onSave(text,when);}}>
   <label><span className="hz-pop-label">{area}</span><input autoFocus value={text} maxLength={160} onChange={e=>setText(e.target.value)}/></label>
   <div className="segmented lm-when" role="group" aria-label="When">{WHENS.map(w=><button key={w} type="button" aria-pressed={when===w} className={when===w?'selected':''} onClick={()=>setWhen(w)}>{WHEN_SHORT[w]}</button>)}</div>
   <div className="hz-pop-buttons"><button type="button" className="text-button lm-remove" onClick={onRemove}>Remove</button><span className="lm-spacer"/><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="button" disabled={!text.trim()}>Save</button></div>
  </form>
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
   <small>{areas.length>=AREA_MAX?'That’s eight. Fold two together to add another.':areas.length<=AREA_MIN?'Five is the fewest. Rename one instead.':'Keep five to eight, so the wheel stays readable.'}</small>
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

