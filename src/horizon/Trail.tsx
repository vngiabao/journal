// The trail: one path, never a tree. The next step is the stone at your feet; later steps climb toward the focused
// peak; done steps collapse into a small pile behind you. One foothill curve carries the path up into the ridge.
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type RefObject} from 'react';
import type {State,PlanGoal,PlanStep} from '../model';
import {Rough,sk,seedOf} from '../Sketch';
import {catmullRom,foldSteps,trailLayout,bez,type Pt} from './geometry';
import {stepTag,stepPlace,isLate} from '../plan';
import {Bond,type BondPose} from './shared';
import {Count} from '../Count';
import {ArrowRight,Plus} from '../icons';
import {gsap,motionOK} from './motion';

export interface TrailProps{state:State;goal:PlanGoal;gi:number;now:string;phone:boolean;maxOpen:number;expanded:boolean;onExpand:(v:boolean)=>void;
 peak:{x:number;y:number}|null;ridgeRef:RefObject<HTMLDivElement|null>;width:number;pet:boolean;bondPose:BondPose;evening:boolean;
 onStone:(anchor:HTMLElement,step:PlanStep)=>void;onDoToday:(step:PlanStep,anchor:HTMLElement|null)=>void;onAddStep:(anchor:HTMLElement)=>void}

export function Trail(p:TrailProps){
 const {state,goal:g,now,phone,maxOpen,expanded,peak,width,pet}=p;
 const svgRef=useRef<SVGSVGElement>(null),root=useRef<HTMLDivElement>(null),bond=useRef<HTMLSpanElement>(null);
 const open=g.steps.filter(x=>!x.done),doneCount=g.steps.length-open.length,max=maxOpen;
 const {shown,hidden}=foldSteps(open,max,expanded);
 const gutter=phone?96:Math.max(150,Math.min(260,width*.38)),gap=phone?54:maxOpen<5?54:58;
 const topPad=hidden>0||expanded&&open.length>max?106:70,bottom=open.length?118:70;
 const L=trailLayout({count:shown.length,gutter,gap,top:topPad,bottom,mid:phone?.5:.62});
 const [off,setOff]=useState<{x:number;y:number}|null>(null);
 useLayoutEffect(()=>{const a=p.ridgeRef.current?.getBoundingClientRect(),b=svgRef.current?.getBoundingClientRect();if(!a||!b)return;const o={x:a.left-b.left,y:a.top-b.top};setOff(x=>x&&Math.abs(x.x-o.x)<1&&Math.abs(x.y-o.y)<1?x:o);});
 const next=open[0],number=(st:PlanStep)=>g.steps.indexOf(st)+1;
 // The foothill: from the top of the trail up into the ridge, ending at the focused peak's foot.
 const connector=useMemo(()=>{if(phone||!peak||!off)return null;const a=L.topPoint,b:Pt=[peak.x+off.x,peak.y+off.y];const c1:Pt=[a[0],a[1]-Math.min(70,(a[1]-b[1])*.5)],c2:Pt=[b[0],b[1]+Math.min(80,(a[1]-b[1])*.55)];
  const pts=Array.from({length:7},(_,i)=>bez(a,c1,c2,b,i/6));return {d:`M${a[0]} ${a[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}`,pencil:sk.curve(pts,{roughness:.7,strokeWidth:1.3,seed:seedOf('foot'+g.id)})};},[phone,peak?.x,peak?.y,off?.x,off?.y,L.topPoint[0],L.topPoint[1],g.id]);
 const path=useMemo(()=>({d:catmullRom(L.path,.5),pencil:sk.curve(L.path,{roughness:.8,strokeWidth:1.3,seed:seedOf('trail'+g.id)})}),[L.path.map(q=>q.join()).join(),g.id]);
 const stones=useMemo(()=>shown.map((st,i)=>{const [x,y]=L.stones[i],r=i===0?28:22;return sk.circle(x,y,r*2-4,{roughness:1,strokeWidth:i===0?2:1.3,fill:'F',fillStyle:'solid',seed:seedOf(st.id)});}),[shown.map(s=>s.id).join(),L.stones.map(q=>q.join()).join()]);
 const pile=useMemo(()=>doneCount?[[-18,3,8],[0,-4,10],[17,4,7]].map(([dx,dy,d],k)=>sk.circle(L.head[0]+dx,L.head[1]+dy-6,d*2,{roughness:1.1,strokeWidth:1.1,fill:'F',fillStyle:'solid',seed:seedOf('pile'+k+g.id)})):[],[doneCount>0,L.head.join(),g.id]);
 // When the next stone changes (a step was done), Bond walks to the new one and the new next stone grows in.
 const lastBond=useRef<DOMRect|null>(null),lastNext=useRef(next?.id);
 useLayoutEffect(()=>{const el=bond.current,changed=lastNext.current!==next?.id;lastNext.current=next?.id;
  if(el&&changed&&lastBond.current){const now2=el.getBoundingClientRect(),dx=lastBond.current.left-now2.left,dy=lastBond.current.top-now2.top;
   if(motionOK()){if(Math.abs(dx)+Math.abs(dy)>2){el.classList.add('walking');gsap.fromTo(el,{x:dx,y:dy},{x:0,y:0,duration:.5,ease:'move',clearProps:'transform',onComplete:()=>el.classList.remove('walking')});}
    const s=root.current?.querySelector('.hz-stone.next');if(s)gsap.fromTo(s,{scale:.82},{scale:1,duration:.3,ease:'enter',clearProps:'transform'});}}
  lastBond.current=el?.getBoundingClientRect()??null;});
 // Nothing keeps animating after the trail goes away.
 useEffect(()=>()=>{const r=root.current;if(r)gsap.killTweensOf(r.querySelectorAll('.hz-trail-bond,.hz-stone'));},[]);
 const label=(st:PlanStep)=>{const tag=stepTag(state,st,now);return `Step ${number(st)} of ${g.steps.length}: ${st.text}.${tag?` ${tag}.`:''}${isLate(st,now)?' Late.':''}${st===next?' Next step.':''}`;};
 const onToday=next?stepPlace(state,next,now)==='today':false;
 return <div ref={root} className={`hz-trail ${phone?'is-phone':''}`} style={{height:L.height,'--gutter':`${gutter}px`} as React.CSSProperties}>
  <svg ref={svgRef} className="hz-trail-svg" width={Math.max(gutter,1)} height={L.height} aria-hidden="true">
   {connector&&<g className="hz-connector"><path className="hz-band" d={connector.d}/><Rough className="hz-pencil" shape={connector.pencil}/></g>}
   {(shown.length>0||doneCount>0)&&<g className="hz-trail-line"><path className="hz-band" d={path.d}/><Rough className="hz-pencil" shape={path.pencil}/></g>}
   {hidden>0&&<path className="hz-switchback" d={`M${L.topPoint[0]} 70 q-14 -6 0 -12 q14 -6 0 -12 q-14 -6 0 -12`}/>}
   {pile.map((s,k)=><Rough key={k} className="hz-pile" shape={s}/>)}
   {shown.map((st,i)=><g key={st.id} className={`hz-stone-art ${i===0?'next':''} ${isLate(st,now)?'late':''}`}><Rough className="hz-stone-ink" shape={stones[i]}/></g>)}
  </svg>
  <button type="button" className="hz-add-stone" style={{left:L.topPoint[0]-22,top:hidden>0?0:4}} onClick={e=>p.onAddStep(e.currentTarget)} aria-label="Add a step: what comes next?"><span className="hz-add-ring"><Plus size={16}/></span><span className="hz-add-text">What comes next?</span></button>
  {(hidden>0||expanded&&open.length>max)&&<button type="button" className="text-button hz-fold" style={{left:gutter,top:50}} onClick={()=>p.onExpand(!expanded)} aria-label={expanded?'Fold it back':`${hidden} more up the trail. Show the whole trail`}>{expanded?'Fold it back':`${hidden} more up the trail`}</button>}
  {shown.map((st,i)=>{const [x,y]=L.stones[i],r=i===0?28:22,tag=stepTag(state,st,now),late=isLate(st,now);
   return <div key={st.id} className={`hz-stone-row ${i===0?'next':''}`} style={{top:y}}>
    <button type="button" className={`hz-stone ${i===0?'next':''} ${late?'late':''}`} data-step={st.id} style={{left:x-r,top:-r,width:r*2,height:r*2}} aria-label={label(st)} onClick={e=>p.onStone(e.currentTarget,st)}
     onPointerDown={e=>{if(e.pointerType!=='touch')return;const t=e.currentTarget,id=window.setTimeout(()=>p.onStone(t,st),450);const clear=()=>{clearTimeout(id);t.removeEventListener('pointerup',clear);t.removeEventListener('pointerleave',clear);};t.addEventListener('pointerup',clear);t.addEventListener('pointerleave',clear);}}>
     <span className="hz-stone-no">{number(st)}</span></button>
    <span className="hz-stone-label" style={{left:gutter}} onClick={e=>{const b=(e.currentTarget.parentElement?.querySelector('.hz-stone') as HTMLElement|null);if(b)p.onStone(b,st);}}>
     <span className="hz-stone-text">{st.text}</span>
     {(tag||late)&&<span className="hz-tags">{tag&&<span className={`hz-tag ${tag==='On today'?'on':''}`}>{tag}</span>}{late&&<span className="hz-tag late">late</span>}</span>}
    </span>
    {i===0&&<div className="hz-next-actions" style={{left:gutter}}>{onToday?<span className="hz-on-today">On today’s list</span>:<button type="button" className="text-button hz-do-today" onClick={e=>p.onDoToday(st,e.currentTarget)}>{p.evening?'Do tomorrow':'Do today'} <ArrowRight size={14}/></button>}</div>}
   </div>;})}
  {!open.length&&g.steps.length===0&&<div className="hz-trail-empty" style={{left:gutter,top:44}}>
   <p>No trail yet. List every step it takes to get there - about 10 minutes.</p>
   <button type="button" className="button secondary" onClick={e=>p.onAddStep(e.currentTarget)}><Plus size={16}/>Add the first step</button></div>}
  {doneCount>0&&<p className="hz-behind" style={{left:L.head[0]+30,top:L.height-34}}><Count value={doneCount} duration={.5}/> behind you</p>}
  {pet&&phone&&<span ref={bond} className="hz-trail-bond" aria-hidden="true" style={next?{left:Math.max(0,L.stones[0][0]-28-70),top:L.stones[0][1]-50}:{left:Math.max(0,L.head[0]-96),top:L.height-82}}><Bond pose={!g.steps.length?'sniff':p.bondPose}/></span>}
 </div>;
}
