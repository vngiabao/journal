// The skyline: one peak per goal, in your order. The one is the tallest; shading rises inside each peak as its steps
// get done. The SVG is decoration; every peak is a real button laid over it.
import {useId,useLayoutEffect,useMemo,useRef} from 'react';
import {gsap,whenMotionOK} from './motion';
import type {State,PlanGoal} from '../model';
import {Rough,sk,seedOf} from '../Sketch';
import {catmullRom,hillPolygon,hatchTop,layoutLabels,type Band,type Ridge as RidgeT} from './geometry';
import {useMeasure,isReached,goalLabel,deadlineText} from './shared';
import {Check,Plus} from '../icons';

export function Ridge({state,goals,ridge,band,width,focusId,phone,now,hatchDur=.6,onFocus,onAdd}:{state:State;goals:PlanGoal[];ridge:RidgeT;band:Band;width:number;focusId:string;phone:boolean;now:string;hatchDur?:number;onFocus:(id:string)=>void;onAdd:(anchor:HTMLElement)=>void}){
 const uid=useId().replace(/:/g,''),btns=useRef<(HTMLButtonElement|null)[]>([]);
 const {v,measure}=useMeasure('500 16px "Cormorant Garamond"');
 const labels=useMemo(()=>phone||!width?[]:layoutLabels(ridge.peaks.map(p=>({x:p.x,bottom:p.summit-46,text:goals[p.index].text,priority:p.one?1:0})),{maxWidth:Math.min(190,1.8*ridge.slot),lineHeight:19,rowStep:40,gap:10,bandWidth:width,measure,
  obstacles:[...ridge.peaks.map(p=>({l:p.x-2,r:p.x+30,t:p.summit-46,b:p.summit})),...ridge.peaks.filter(p=>p.one).map(p=>({l:p.x+12,r:p.x+80,t:p.summit-6,b:p.summit+18})),...(ridge.add?[{l:ridge.add.x-50,r:ridge.add.x+50,t:ridge.add.summit-74,b:ridge.add.summit}]:[])]}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [phone,width,ridge,goals.map(g=>g.text).join('\n'),v]);
 const W=Math.max(1,width),H=band.height;
 const shapes=useMemo(()=>({
  line:sk.curve(ridge.line,{roughness:1.2,strokeWidth:1.6,seed:seedOf('ridge'+goals.length)}),
  hatch:ridge.peaks.map(p=>sk.polygon(hillPolygon(p.hill,p.base),{stroke:'none',fill:'F',fillStyle:'hachure',hachureGap:5,hachureAngle:-41,fillWeight:1.1,roughness:1,seed:seedOf('hatch'+goals[p.index].id)})),
  one:ridge.peaks.filter(p=>p.one).map(p=>sk.curve(p.hill,{roughness:.9,strokeWidth:2,seed:seedOf('one'+goals[p.index].id)}))[0],
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[ridge,goals.map(g=>g.id).join()]);
 // When a step is done the shading rises inside its peak (0.6 s by pointer, 0.2 s from the keyboard).
 const svg=useRef<SVGSVGElement>(null),tops=useRef(new Map<string,number>());
 useLayoutEffect(()=>{const prev=tops.current,next=new Map<string,number>();
  svg.current?.querySelectorAll<SVGRectElement>('.hz-hatch-clip').forEach(r=>{const id=r.dataset.goal!,y=Number(r.dataset.final),was=prev.get(id);next.set(id,y);
   if(was!==undefined&&Math.abs(was-y)>.5)whenMotionOK(()=>{gsap.fromTo(r,{attr:{y:was,height:band.base-was+2}},{attr:{y,height:band.base-y+2},duration:hatchDur,ease:'enter',overwrite:'auto'});});});
  tops.current=next;});
 // A flag planted while you watch: the pennant rises and the red seal is pressed on.
 const reachedIds=goals.filter(g=>isReached(state,g)).map(g=>g.id).join(),seen=useRef<string|null>(null);
 useLayoutEffect(()=>{const before=seen.current;seen.current=reachedIds;if(before===null)return;const old=new Set(before.split(','));
  for(const id of reachedIds.split(',').filter(x=>x&&!old.has(x))){const btn=svg.current?.parentElement?.querySelector(`.hz-peak[data-goal="${id}"]`);const wax=btn?.querySelector('.hz-wax'),pen=btn?.querySelector('.hz-pennant');if(!wax)continue;
   if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){gsap.fromTo(wax,{opacity:0},{opacity:1,duration:.15,clearProps:'opacity'});continue;}
   if(pen)gsap.fromTo(pen,{y:18,opacity:.4},{y:0,opacity:1,duration:.5,ease:'enter',clearProps:'opacity,transform'});
   gsap.fromTo(wax,{scale:2.4,rotation:-30,opacity:0},{scale:1,rotation:-8,opacity:1,duration:.42,delay:.2,ease:'stamp',clearProps:'opacity,transform'});}
 },[reachedIds]);
 const move=(i:number,by:number)=>{const j=(i+by+goals.length)%goals.length;btns.current[j]?.focus();onFocus(goals[j].id);};
 return <div className={`hz-ridge ${phone?'is-phone':''}`} style={{height:H}}>
  <svg ref={svg} className="hz-ridge-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
   <defs>{ridge.peaks.map(p=>{const g=goals[p.index],st=g.steps,done=st.filter(x=>x.done).length,top=isReached(state,g)?p.summit-2:hatchTop(p,done,st.length);
    return <clipPath key={g.id} id={`${uid}-c${p.index}`}><rect className="hz-hatch-clip" data-goal={g.id} data-final={top} x={p.left} y={top} width={p.right-p.left} height={Math.max(0,p.base-top)+2}/></clipPath>;})}</defs>
   {ridge.peaks.map(p=><path key={goals[p.index].id} className={`hz-hill ${p.one?'one':''} ${goals[p.index].id===focusId?'focused':''}`} d={catmullRom(hillPolygon(p.hill,p.base),.35)+' Z'}/>)}
   {ridge.peaks.map(p=><g key={goals[p.index].id} clipPath={`url(#${uid}-c${p.index})`}><Rough className="hz-hatch" shape={shapes.hatch[p.index]}/></g>)}
   {ridge.add&&<path className="hz-add-hill" d={catmullRom(ridge.add.hill,.4)}/>}
   <Rough className="hz-ridge-line" shape={shapes.line}/>
   {shapes.one&&<Rough className="hz-one-outline" shape={shapes.one}/>}
   <line className="hz-ground" x1={0} x2={W} y1={band.base+.5} y2={band.base+.5}/>
  </svg>
  {ridge.peaks.map(p=>{const g=goals[p.index],lab=labels[p.index],focused=g.id===focusId,reached=isReached(state,g),slotLeft=p.left,due=deadlineText(g.deadline,now).text;
   const top=Math.min(lab?lab.top-4:p.summit-40,p.summit-40);
   return <button key={g.id} ref={el=>{btns.current[p.index]=el;}} type="button" className={`hz-peak ${focused?'focused':''} ${p.one?'one':''} ${reached?'reached':''}`} data-goal={g.id}
    style={{left:slotLeft,top,width:p.right-slotLeft,height:H-top}} tabIndex={focused?0:-1} aria-pressed={focused}
    aria-label={`${goalLabel(g,p.index,goals.length,due?due+'.':'')}${reached?' Reached.':''}`} title={lab?.truncated?g.text:undefined}
    onClick={()=>onFocus(g.id)} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();move(p.index,1);}else if(e.key==='ArrowLeft'){e.preventDefault();move(p.index,-1);}}}>
    {lab&&<span className="hz-label" style={{left:lab.left-slotLeft,top:lab.top-top,width:lab.width+2}}>{lab.lines.map((l,k)=><span key={k}>{l}</span>)}</span>}
    <span className="hz-pennant" style={{left:p.x-slotLeft,top:p.summit-top}}><svg viewBox="0 0 32 22" aria-hidden="true"><path d="M1.5 1.5 H29 L22.5 10.5 L29 19.5 H1.5 Z"/></svg><b>{p.index+1}</b></span>
    {p.one&&!phone&&<span className="hz-seal" style={{left:p.x-slotLeft+16,top:p.summit-top+6}}>The one</span>}
    {reached&&<span className="hz-wax" style={{left:p.x-slotLeft-36,top:p.summit-top+2}}><Check size={14} weight="bold"/></span>}
   </button>;})}
  {ridge.add&&<button type="button" className="hz-peak hz-add" style={{left:ridge.add.x-ridge.slot/2,top:ridge.add.summit-(phone?34:74),width:ridge.slot,height:H-ridge.add.summit+(phone?34:74)}} onClick={e=>onAdd(e.currentTarget)} aria-label={`Add a goal. ${goals.length} of 10`}>
   <span className="hz-pennant add" style={{left:ridge.slot/2,top:phone?34:74}}><svg viewBox="0 0 32 22" aria-hidden="true"><path d="M1.5 1.5 H29 L22.5 10.5 L29 19.5 H1.5 Z"/></svg><b><Plus size={14}/></b></span>
   {!phone&&<span className="hz-add-label">Add a goal<small>{goals.length} of 10</small></span>}
  </button>}
  {goals.length>=10&&!phone&&<p className="hz-ten">That’s ten.</p>}
 </div>;
}
