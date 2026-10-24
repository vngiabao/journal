// Life map: every part of the life you want, as one hand-drawn wheel. Angle is the area of life, distance from the
// centre is time: this year's goals on the inner ring, then 5 years, 10 years and the person you are at 40.
// Tap an area to bring its whole ladder forward (at 40 down to today's next step). On a phone it becomes an accordion.
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type RefObject} from 'react';
import './lifemap.css';
import type {State,PlanGoal,PlanStep,Vision,VisionWhen,LifeArea} from '../model';
import type {Mutate} from '../GoalControls';
import {Rough,sk,seedOf} from '../Sketch';
import {lifeLayout,nodeSide,placeNodes,ellipsePoints,taperedOutline,wrapText,type Pt,type Box,type NodeIn} from './geometry';
import {SkyLine,Popover,UndoBar,ss,useWidth,usePhone,useMeasure,deadlineText} from './shared';
import {stepTag,stepToToday,nextStep} from '../plan';
import {addDays} from '../dates';
import {lifeAreas,lifeVisions,visionsAt,goalsIn,unassignedGoals,addVision,editVision,removeVision,restoreVision,addArea,renameArea,removeArea,restoreArea,setGoalArea,areaOf,
 AREA_HINTS,AREA_MIN,AREA_MAX,WHENS,WHEN_LABEL,WHEN_SHORT} from './life';
import {gsap,whenMotionOK,useGSAP,CLEAR_DASH} from './motion';

const INK=['var(--blue)','var(--violet)','var(--green)','var(--red)','var(--gold-text)','var(--blue-stage)','var(--violet-text)','var(--ink-soft)'];
const AREA_KEY='reboot-life-area',ARRIVED_KEY='reboot-life-arrived';
const RING_KEYS:(VisionWhen|'year')[]=['year','5y','10y','40'];
const F={vision:'500 17px "Cormorant Garamond"',goal:'650 17px "Cormorant Garamond"',name:'650 21px "Cormorant Garamond"',small:'400 13px "Source Sans 3"',chip:'550 13px "Source Sans 3"',num:'600 19px Caveat'};
const LH={row:20,meta:17,name:25};
const ink=(i:number)=>INK[i%INK.length];
const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;

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
 const [pop,setPop]=useState<Pop|null>(null),[undo,setUndo]=useState<Undo|null>(null),[pendingAdd,setPendingAdd]=useState<{area:string;when:VisionWhen}|null>(null);
 const evening=new Date().getHours()>=17;
 const side=!phone&&rootW>=1120,panelW=rootW>=1900?480:rootW>=1500?430:400,wheelW=side?rootW-panelW-32:rootW;

 // Open the add popover once the ladder for that area is on screen, anchored to its "Add" button.
 useEffect(()=>{if(!pendingAdd)return;const el=root.current?.querySelector<HTMLElement>(`[data-ladder="${pendingAdd.area}"] [data-add="${pendingAdd.when}"]`);
  if(el){el.scrollIntoView({block:'nearest'});setPop({kind:'add',area:pendingAdd.area,when:pendingAdd.when,anchor:el});}setPendingAdd(null);},[pendingAdd]);
 // Esc steps back out of a focused area.
 useEffect(()=>{if(!focusArea||phone)return;const key=(e:KeyboardEvent)=>{if(e.key!=='Escape'||document.querySelector('.hz-popover'))return;const t=e.target instanceof Element?e.target:null;if(t?.closest('input,textarea'))return;setArea('');};
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
  const q=(s:string)=>gsap.utils.toArray<Element>(s,root.current),c=root.current?.querySelector<HTMLElement>('.lm-wheel')?.dataset.centre??'0 0';
  // Marked as seen only once it has played (or been skipped), so a remount mid-way plays it again rather than never.
  const tl=gsap.timeline({defaults:{ease:'enter'},onComplete:()=>ss.set(ARRIVED_KEY,'1')});
  tl.from(q('.lm-ring path'),{drawSVG:'0%',duration:.7,ease:'pen',stagger:.06,clearProps:CLEAR_DASH},0)
   .from(q('.lm-branch'),{opacity:0,scale:.6,duration:.55,stagger:.04,svgOrigin:c,clearProps:'opacity,transform'},.1)
   .from(q('.lm-centre, .lm-ring-name'),{opacity:0,duration:.4,clearProps:'opacity'},.15)
   .from(q('.lm-node, .lm-acc'),{opacity:0,y:6,duration:.35,stagger:.02,clearProps:'opacity,transform'},.35)
   .from(q('.lm-panel > *'),{opacity:0,y:10,duration:.4,stagger:.05,clearProps:'opacity,transform'},.3);
  const skip=()=>tl.progress(1);window.addEventListener('pointerdown',skip,true);return()=>{window.removeEventListener('pointerdown',skip,true);};
 });return()=>mm.revert();},{scope:root,dependencies:[phone]});
 // Refocus: the panel's ladder comes in through a soft blur (quick, so it never slows you down).
 const lastArea=useRef(focusArea);
 useLayoutEffect(()=>{if(lastArea.current===focusArea)return;lastArea.current=focusArea;if(phone)return;
  const mm=whenMotionOK(()=>{gsap.from(gsap.utils.toArray<Element>('.lm-panel > *',root.current),{opacity:0,y:6,filter:'blur(3px)',duration:.2,stagger:.03,ease:'enter',overwrite:'auto',clearProps:'opacity,transform,filter'});});
  return()=>mm.revert();},[focusArea]);

 const popVision=pop?.kind==='edit'?visions.find(v=>v.id===pop.id):undefined,popGoal=pop?.kind==='pick'?goals.find(g=>g.id===pop.goalId):undefined;
 return <div ref={root} className={`lm ${phone?'is-phone':side?'is-side':'is-stacked'}`}>
  {phone?<PhoneLadder state={state} areas={areas} firstRun={firstRun} focusArea={focusArea} setArea={setArea} startAt={startAt} ladderProps={ladderProps} tray={tray} mutate={mutate} onAreas={anchor=>setPop({kind:'areas',anchor})}/>
  :<div className="lm-desk" style={{'--lm-panel':`${panelW}px`} as React.CSSProperties}>
   <Wheel state={state} mutate={mutate} areas={areas} goals={goals} focusArea={focusArea} focusId={focusId} now={now} width={wheelW}
    onArea={id=>setArea(focusArea===id?'':id)} onGoal={(g,area)=>{setArea(area);onFocus(g.id);}} onVision={(v,anchor)=>{setArea(v.area);setPop({kind:'edit',id:v.id,anchor});}}
    onAdd={(area,when,anchor)=>setPop({kind:'add',area,when,anchor})}/>
   <aside className="lm-panel" aria-label="Area detail">
    {focusArea?(()=>{const i=areas.findIndex(a=>a.id===focusArea);return <><Ladder {...ladderProps(areas[i],i)} onClose={()=>setArea('')}/>{tray}</>;})()
    :firstRun?<><FirstPrompt areas={areas} onPick={id=>startAt(id,'40')}/>{tray}</>
    :<><Overview state={state} areas={areas} onArea={setArea} onAreas={anchor=>setPop({kind:'areas',anchor})}/>{tray}</>}
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

// The wheel fills the window below it (html zoom included), so a big screen gets a big map, not empty paper.
function useFillHeight(ref:RefObject<HTMLElement|null>,min:number,max:number){
 const [h,setH]=useState(min);
 useLayoutEffect(()=>{const calc=()=>{const el=ref.current;if(!el)return;const z=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
   const top=el.getBoundingClientRect().top+scrollY,avail=(innerHeight-top)/z-28;setH(x=>{const v=Math.round(Math.max(min,Math.min(max,avail)));return Math.abs(v-x)>2?v:x;});};
  calc();window.addEventListener('resize',calc);return()=>window.removeEventListener('resize',calc);},[ref,min,max]);
 return h;
}

type Row={key:string;kind:'vision';v:Vision;lines:string[];w:number;h:number}|{key:string;kind:'goal';g:PlanGoal;n:number;lines:string[];meta:string;late:boolean;numW:number;w:number;h:number};
interface Variant{w:number;h:number;k:number;compact:boolean;mw:number;tiny?:boolean}
interface NodeSpec{key:string;area:number;ring:number;anchor:Pt;side:NodeIn['side'];namesBy:Map<number,{lines:string[];w:number;h:number}|undefined>;rowsBy:Map<number,Row[]>;count:number;chip:string;chipW:number;variants:Variant[];gap:number}

function Wheel({state,mutate,areas,goals,focusArea,focusId,now,width,onArea,onGoal,onVision,onAdd}:{state:State;mutate:Mutate;areas:LifeArea[];goals:PlanGoal[];focusArea:string;focusId:string;now:string;width:number;
 onArea:(id:string)=>void;onGoal:(g:PlanGoal,area:string)=>void;onVision:(v:Vision,anchor:HTMLElement)=>void;onAdd:(area:string,when:VisionWhen,anchor:HTMLElement)=>void}){
 const wrap=useRef<HTMLDivElement>(null),height=useFillHeight(wrap,600,1240);
 const mV=useMeasure(F.vision),mG=useMeasure(F.goal),mN=useMeasure(F.name),mS=useMeasure(F.small),mC=useMeasure(F.chip),mNum=useMeasure(F.num);
 const geo=useMemo(()=>lifeLayout({areas:areas.length,width,height,padX:width>=1100?236:206,padTop:140}),[areas.length,width,height]);
 const big=geo.rx>420,maxIn=big?212:184,maxOut=big?244:216,fi=areas.findIndex(a=>a.id===focusArea);
 const ringNames=useMemo(()=>RING_KEYS.map((k,r)=>{const t=WHEN_SHORT[k],w=Math.ceil(mS.measure(t))+10;return {t,w,x:geo.cx-w/2,y:geo.cy+geo.rings[r].ry+3};}),[geo,mS.v]);
 const layout=useMemo(()=>{
  const specs:NodeSpec[]=[];
  areas.forEach((a,i)=>{const b=geo.branches[i];RING_KEYS.forEach((k,r)=>{const outer=r===3,focused=i===fi,full=outer?maxOut:maxIn;
   const goalsHere=k==='year'?goalsIn(state,a.id):[],visionsHere=k==='year'?[]:visionsAt(state,a.id,k),m=goalsHere.length+visionsHere.length;
   if(!m&&!outer)return;
   // Rows are wrapped at the full width and at a narrower one, so a crowded sector can take a taller, slimmer label before folding.
   const rowsAt=(maxW:number):Row[]=>k==='year'?goalsHere.map(g=>{const n=goals.indexOf(g)+1,numW=Math.ceil(mNum.measure(String(n)))+7,lines=wrapText(g.text,maxW-numW,mG.measure,99).lines,st=goalStatus(g,now);
     const meta=st.late?`${st.done} of ${st.total} · past the deadline`:`${st.total?`${st.done} of ${st.total}`:'No steps yet'}${g.deadline?` · ${st.due.replace(/^By .* - /,'')}`:''}`;
     return {key:g.id,kind:'goal',g,n,numW,lines,meta,late:st.late,w:numW+Math.max(...lines.map(mG.measure),mS.measure(meta)),h:lines.length*LH.row+LH.meta+10};})
    :visionsHere.map(v=>{const lines=wrapText(v.text,maxW,mV.measure,99).lines;return {key:v.id,kind:'vision',v,lines,w:Math.max(...lines.map(mV.measure)),h:lines.length*LH.row+10};});
   const nameAt=(maxW:number)=>{if(!outer)return undefined;const lines=wrapText(a.name,maxW,mN.measure,3).lines;return {lines,w:Math.max(...lines.map(mN.measure)),h:lines.length*LH.name+4};};
   const widths=[full,Math.round(full*.68)],rowsBy=new Map(widths.map(w=>[w,rowsAt(w)])),namesBy=new Map(widths.map(w=>[w,nameAt(w)]));
   const chip=k==='year'?plural(m,'goal'):plural(m,'vision'),chipW=Math.ceil(mC.measure(chip))+22,cap=k==='year'?2:outer?2:3;
   const variants:Variant[]=[];
   for(let n=Math.min(m,cap);n>=1;n--)for(const mw of widths){const rows=rowsBy.get(mw)!,name=namesBy.get(mw),more=m-n,moreW=more?mC.measure(`+${more} more`)+22:0,shown=rows.slice(0,n);
    variants.push({k:n,mw,compact:false,w:Math.ceil(Math.max(name?.w??0,moreW,...shown.map(x=>x.w)))+4,h:(name?.h??0)+shown.reduce((s2,x)=>s2+x.h,0)+(more?30:0)});}
   const name0=namesBy.get(full);
   variants.push({k:0,mw:full,compact:true,w:Math.ceil(Math.max(name0?.w??0,m?chipW:0))+4,h:(name0?.h??0)+(m?32:0)});
   // Last resort inside the wheel: just "+2" at the ring, so nothing is ever silently missing.
   if(!outer&&m)variants.push({k:0,mw:full,compact:true,tiny:true,w:Math.ceil(mC.measure(`+${m}`))+26,h:32});
   specs.push({key:`${a.id}-${k}`,area:i,ring:r,anchor:b.cross[r],side:nodeSide(b.cos,b.sin,outer),namesBy,rowsBy,count:m,chip,chipW,variants,gap:focused&&r>0?30:outer?24:16});});});
  // Order of importance: the focused area, then every area's name and "at 40", then this year's goals, then 10 and 5 years.
  const rank=(s:NodeSpec)=>(s.area===fi?0:10)+[3,4,2,1][s.ring];
  specs.sort((x,y)=>rank(x)-rank(y)||x.area-y.area);
  const dot=(p:Pt,r:number):Box=>({l:p[0]-r,r:p[0]+r,t:p[1]-r,b:p[1]+r});
  const obstacles:Box[]=[{l:geo.cx-geo.centre.w/2,r:geo.cx+geo.centre.w/2,t:geo.cy-geo.centre.h/2,b:geo.cy+geo.centre.h/2},...ringNames.map(n=>({l:n.x,r:n.x+n.w,t:n.y,b:n.y+18})),
   ...geo.branches.flatMap((b,i)=>b.cross.map((p,r)=>dot(p,i===fi&&r>0?16:5)))];
  // A label that cannot fit even folded is left off the wheel; its area's name then carries "+N more" (the panel has them all).
  const lane=(s:NodeSpec):Box|undefined=>{if(s.side==='up'||s.side==='down')return undefined;const [x,y]=s.anchor,l=s.side==='right'?x+s.gap:x-s.gap-84;return {l,r:l+84,t:y-11,b:y+11};};
  const placed=placeNodes(specs.map(s=>({key:s.key,anchor:s.anchor,side:s.side,gap:s.gap,lane:lane(s),alt:s.ring<3?(s.side==='right'?'left':'right'):undefined,altFrom:Math.abs(geo.branches[s.area].cos)<.5?0:s.variants.findIndex(v=>v.compact),variants:s.variants})),{width:geo.width,height:geo.height,obstacles});
  const hidden=new Map<number,number>();placed.forEach((o,j)=>{const s=specs[j];if(o.overlap&&s.ring!==3)hidden.set(s.area,(hidden.get(s.area)??0)+Math.max(1,s.count));});
  // What didn't fit is counted on a small "+N more here" chip under the area's name, when there is room for it.
  const kept=specs.map((s,j)=>({spec:s,out:placed[j]})).filter(x=>!x.out.overlap||x.spec.ring===3);
  const chipsIn=[...hidden].map(([area,n])=>{const o=kept.find(x=>x.spec.area===area&&x.spec.ring===3)?.out;if(!o)return null;const t=`+${n} more here`;
   return {area,n,t,node:{key:`more-${area}`,anchor:[(o.box.l+o.box.r)/2,o.box.b] as Pt,side:'down' as const,gap:2,variants:[{w:Math.ceil(mC.measure(t))+26,h:28}]}};}).filter(x=>!!x);
  const chips=placeNodes(chipsIn.map(c=>c.node),{width:geo.width,height:geo.height,obstacles:[...obstacles,...kept.map(x=>x.out.box)]}).map((o,k)=>({...chipsIn[k],box:o.box,ok:!o.overlap})).filter(c=>c.ok);
  return {nodes:kept,chips};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[geo,state,goals,areas,fi,now,mV.v,mG.v,mN.v,mC.v,mNum.v,ringNames,maxIn,maxOut]);
 const shapes=useMemo(()=>({
  rings:geo.rings.map((r,k)=>sk.curve(ellipsePoints(geo.cx,geo.cy,r.rx,r.ry,k),{roughness:.5,strokeWidth:1,seed:seedOf('ring'+k)})),
  branches:geo.branches.map((b,i)=>sk.polygon(taperedOutline(b.p0,b.c1,b.c2,b.tip,i===fi?17:13,2.4,22),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.45,bowing:.4,seed:seedOf('life'+areas[i]?.id)})),
  centre:(()=>{const {w,h}=geo.centre;const pts:Pt[]=Array.from({length:21},(_,i)=>{const a=i/18*Math.PI*2-.4;return [geo.cx+Math.cos(a)*w/2*(1+(i%3)*.015),geo.cy+Math.sin(a)*h/2*(1+(i%2)*.02)];});return sk.curve(pts,{roughness:.9,strokeWidth:1.6,fill:'F',fillStyle:'solid',seed:seedOf('life-centre')});})(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[geo,fi,areas.map(a=>a.id).join()]);
 const dim=(i:number)=>fi>=0&&i!==fi;
 return <div ref={wrap} className={`lm-wheel ${fi>=0?'has-focus':''}`} style={{height:geo.height}} data-centre={`${geo.cx} ${geo.cy}`}>
  <svg className="lm-svg" width={geo.width} height={geo.height} aria-hidden="true">
   {shapes.rings.map((r,k)=><g key={k} className="lm-ring"><Rough className="lm-ring-line" shape={r}/></g>)}
   {geo.branches.map((b,i)=><g key={areas[i].id} className={`lm-branch ${dim(i)?'dim':''} ${i===fi?'focused':''}`} style={{'--c':ink(i)} as React.CSSProperties}><Rough className="lm-branch-shape" shape={shapes.branches[i]}/>
    {b.cross.map((p,r)=><circle key={r} className="lm-dot" cx={p[0]} cy={p[1]} r={r===0?4:4.5}/>)}</g>)}
   <Rough className="lm-centre-cloud" shape={shapes.centre}/>
  </svg>
  <div className="lm-centre" style={{left:geo.cx-geo.centre.w/2+16,top:geo.cy-geo.centre.h/2+10,width:geo.centre.w-32,height:geo.centre.h-20}}><SkyLine state={state} mutate={mutate} className="lm-sky"/></div>
  {ringNames.map(n=><span key={n.t} className="lm-ring-name" style={{left:n.x,top:n.y,width:n.w}}>{n.t}</span>)}
  {layout.nodes.map(({spec:s,out})=>{const v=s.variants[out.variant],a=areas[s.area],name=s.namesBy.get(v.mw),shown=v.compact?[]:(s.rowsBy.get(v.mw)??[]).slice(0,v.k),more=s.count-shown.length;
   return <div key={s.key} className={`lm-node side-${out.side} ring-${s.ring} ${dim(s.area)?'dim':''} ${s.area===fi?'focused':''}`} style={{left:out.box.l,top:out.box.t,width:out.box.r-out.box.l,'--c':ink(s.area)} as React.CSSProperties}>
    {name&&<button type="button" className="lm-name" aria-pressed={s.area===fi} onClick={()=>onArea(a.id)} aria-label={`${a.name}${s.area===fi?', shown in detail. Show every area':'. Show this area in detail'}`}>{name.lines.map((l,j)=><span key={j}>{l}</span>)}</button>}
    {shown.map(row=>row.kind==='vision'
     ?<button key={row.key} type="button" className="lm-row" onClick={e=>onVision(row.v,e.currentTarget)} aria-label={`${a.name}, ${WHEN_LABEL[row.v.when].toLowerCase()}: ${row.v.text}. Edit`}>{row.lines.map((l,j)=><span key={j}>{l}</span>)}</button>
     :<button key={row.key} type="button" className={`lm-row goal ${row.g.id===focusId?'current':''}`} style={{'--num':`${row.numW}px`} as React.CSSProperties} onClick={()=>onGoal(row.g,a.id)}
       aria-label={`Goal ${row.n}: ${row.g.text}. ${row.meta}.`}><b aria-hidden="true">{row.n}</b><span className="lm-row-text">{row.lines.map((l,j)=><span key={j}>{l}</span>)}</span><span className={`lm-row-meta ${row.late?'late':''}`}>{row.meta}</span></button>)}
    {(more>0)&&<button type="button" className="lm-more" onClick={()=>onArea(a.id)} aria-label={`${s.chip} in ${a.name} ${WHEN_SHORT[RING_KEYS[s.ring]].toLowerCase()}. Show them all`}>{v.tiny?`+${s.count}`:v.compact?s.chip:`+${more} more`}</button>}
   </div>;})}
  {layout.chips.map(c=><button key={c.node.key} type="button" className={`lm-more lm-more-here ${dim(c.area)?'dim':''}`} style={{left:c.box.l,top:c.box.t+2,'--c':ink(c.area)} as React.CSSProperties} onClick={()=>onArea(areas[c.area].id)}
   aria-label={`${plural(c.n,'more line')} in ${areas[c.area].name}. Show them all`}>{c.t}</button>)}
  {fi>=0&&geo.branches[fi].cross.slice(1).map((p,r)=>{const when=RING_KEYS[r+1] as VisionWhen;return <button key={when} type="button" className="lm-plus" style={{left:p[0]-22,top:p[1]-22,'--c':ink(fi)} as React.CSSProperties}
   aria-label={`Add a vision for ${areas[fi].name}, ${WHEN_LABEL[when].toLowerCase()}`} onClick={e=>onAdd(areas[fi].id,when,e.currentTarget)}><span aria-hidden="true">+</span></button>;})}
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
   <div><h2>{area.name}</h2>{hint&&<p>{hint}</p>}</div>
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
       <button type="button" className="lm-goal-text" aria-current={g.id===focusId?'true':undefined} onClick={()=>onGoal(g)}><b aria-hidden="true">{n}</b><span>{g.text}</span></button>
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

function Overview({state,areas,onArea,onAreas}:{state:State;areas:LifeArea[];onArea:(id:string)=>void;onAreas:(anchor:HTMLElement)=>void}){
 return <section className="lm-overview">
  <header className="lm-ladder-head"><div><h2>Every area</h2><p>Tap one to see it from 40 down to today.</p></div>
   <button type="button" className="text-button" onClick={e=>onAreas(e.currentTarget)}>Edit areas</button></header>
  <ul className="lm-area-list">{areas.map((a,i)=>{const at40=visionsAt(state,a.id,'40')[0],nv=lifeVisions(state).filter(v=>v.area===a.id).length,ng=goalsIn(state,a.id).length;
   return <li key={a.id}><button type="button" className="lm-area-row" style={{'--c':ink(i)} as React.CSSProperties} onClick={()=>onArea(a.id)}>
    <span className="lm-area-name">{a.name}</span>
    <span className={`lm-area-line ${at40?'':'empty'}`}>{at40?at40.text:'Nothing at 40 yet'}</span>
    <span className="lm-area-count">{plural(nv,'vision')} · {plural(ng,'goal')}</span>
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
   <span className="lm-tray-text"><b aria-hidden="true">{n}</b>{g.text}</span>
   <span className="lm-tray-actions">{area&&<button type="button" className="lm-chip small nodot" onClick={()=>onAssign(g,area.id)}>Add to {area.name}</button>}
    <button type="button" className="text-button" onClick={e=>onPick(g,e.currentTarget)} aria-label={`Pick an area for goal ${n}`}>{area?'Other':'Pick an area'}</button></span>
  </li>;})}</ul>
 </section>;
}

function PhoneLadder({state,areas,firstRun,focusArea,setArea,startAt,ladderProps,tray,mutate,onAreas}:{state:State;areas:LifeArea[];firstRun:boolean;focusArea:string;setArea:(id:string)=>void;startAt:(a:string,w:VisionWhen)=>void;
 ladderProps:(a:LifeArea,i:number)=>LadderProps;tray:React.ReactNode;mutate:Mutate;onAreas:(anchor:HTMLElement)=>void}){
 return <div className="lm-phone">
  <SkyLine state={state} mutate={mutate}/>
  {firstRun&&<FirstPrompt areas={areas} onPick={id=>startAt(id,'40')}/>}
  {tray}
  <div className="lm-accordion">{areas.map((a,i)=>{const open=focusArea===a.id,nv=lifeVisions(state).filter(v=>v.area===a.id).length,ng=goalsIn(state,a.id).length,at40=visionsAt(state,a.id,'40')[0];
   return <div key={a.id} className={`lm-acc ${open?'open':''}`} style={{'--c':ink(i)} as React.CSSProperties}>
    <h2 className="lm-acc-h"><button type="button" aria-expanded={open} onClick={()=>setArea(open?'':a.id)}>
     <span className="lm-area-name">{a.name}</span>
     <span className={`lm-area-line ${at40?'':'empty'}`}>{at40?at40.text:'Nothing at 40 yet'}</span>
     <span className="lm-area-count">{plural(nv,'vision')} · {plural(ng,'goal')}</span>
    </button></h2>
    {open&&<Ladder {...ladderProps(a,i)}/>}
   </div>;})}</div>
  <button type="button" className="text-button lm-edit-areas" onClick={e=>onAreas(e.currentTarget)}>Edit areas</button>
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
   <p className="lm-pop-goal"><b>{gi+1}</b> {goal.text}</p>
   <div className="lm-chips">{areas.map((a,i)=><button key={a.id} type="button" className={`lm-chip ${current===a.id?'selected':''}`} aria-pressed={current===a.id} style={{'--c':ink(i)} as React.CSSProperties} onClick={()=>onPick(a.id)}>{a.name}</button>)}</div>
   {current&&<button type="button" className="text-button" onClick={()=>onPick(undefined)}>No area</button>}
  </div>
 </Popover>;
}

