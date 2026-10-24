// Map: every goal at once, drawn as an organic mind map. Who you're becoming sits in the middle; each goal is a thick,
// tapered branch; only the focused goal opens into twigs (its next steps). Everything else rests at 35%.
import {useMemo,useRef} from 'react';
import type {State,PlanGoal,PlanStep} from '../model';
import type {Mutate} from '../GoalControls';
import {Rough,sk,seedOf} from '../Sketch';
import {mapLayout,taperedOutline,bez,type Pt} from './geometry';
import {SkyLine,useWidth,isReached,deadlineText} from './shared';
import {stepTag} from '../plan';
import {gsap,whenMotionOK,useGSAP} from './motion';

const INK=['var(--blue)','var(--green)','var(--violet)','var(--gold-text)','var(--red)','var(--blue-stage)','var(--violet-text)','var(--ink-soft)','var(--green)','var(--blue-deep)'];
const MAX_TWIGS=7;

export function MapView({state,mutate,goals,focusId,now,onFocus,onTwig,onMore,onAddStep}:{state:State;mutate:Mutate;goals:PlanGoal[];focusId:string;now:string;
 onFocus:(id:string)=>void;onTwig:(anchor:HTMLElement,step:PlanStep)=>void;onMore:()=>void;onAddStep:(anchor:HTMLElement)=>void}){
 const wrap=useRef<HTMLDivElement>(null),width=useWidth(wrap,900);
 const fi=Math.max(0,goals.findIndex(g=>g.id===focusId)),focus=goals[fi],oneIndex=goals.findIndex(g=>g.one);
 const open=focus?focus.steps.filter(x=>!x.done):[],twigItems:({step:PlanStep}|{more:number}|{add:true})[]=!focus?[]:!focus.steps.length?[{add:true}]
  :open.length>MAX_TWIGS?[...open.slice(0,MAX_TWIGS-1).map(step=>({step})),{more:open.length-(MAX_TWIGS-1)}]:open.map(step=>({step}));
 const L=useMemo(()=>mapLayout({n:goals.length,focus:fi,twigs:twigItems.length,width,oneIndex}),[goals.length,fi,twigItems.length,width,oneIndex]);
 const shapes=useMemo(()=>({
  branches:L.branches.map(b=>{const g=goals[b.index];return sk.polygon(taperedOutline(b.p0,b.c1,b.c2,b.tip,b.w0,2.6,20),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.45,bowing:.4,seed:seedOf('br'+g.id)});}),
  veins:L.branches.map(b=>sk.curve(Array.from({length:6},(_,i)=>bez(b.p0,b.c1,b.c2,b.tip,i/5)),{roughness:.6,strokeWidth:1,seed:seedOf('vein'+goals[b.index].id)})),
  twigs:L.twigs.map((t,j)=>sk.polygon(taperedOutline(t.p0,t.c1,t.c2,t.tip,4.2,1.2,12),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.4,seed:seedOf('tw'+j+(focus?.id??''))})),
  trunk:L.mode==='stack'&&L.branches.length?sk.polygon(taperedOutline([L.branches[0].p0[0],0],[L.branches[0].p0[0]+3,40],[L.branches[0].p0[0]-2,L.branches[L.branches.length-1].p0[1]*.6],[L.branches[0].p0[0],L.branches[L.branches.length-1].p0[1]+4],12,5,16),{stroke:'none',fill:'F',fillStyle:'solid',roughness:.4,seed:seedOf('trunk')}):null,
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[L,goals.map(g=>g.id).join(),focus?.id]);
 const cloud=useMemo(()=>{if(L.mode!=='both')return null;const {x,y,w,h}=L.centre;const pts:Pt[]=Array.from({length:21},(_,i)=>{const a=i/18*Math.PI*2-.4;return [x+Math.cos(a)*w/2*(1+(i%3)*.015),y+Math.sin(a)*h/2*(1+(i%2)*.02)];});return sk.curve(pts,{roughness:.9,strokeWidth:1.6,fill:'F',fillStyle:'solid',seed:seedOf('centre')});},[L]);
 // Branches grow out from the middle on arrival; twigs sprout whenever the focus changes.
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from('.hz-branch',{opacity:0,scale:.55,duration:.6,ease:'enter',stagger:.05,svgOrigin:(_i:number,el:Element)=>(el as SVGGElement).dataset.origin??'0 0',clearProps:'opacity,transform'});
  gsap.from('.hz-map-label',{opacity:0,y:6,duration:.4,ease:'enter',stagger:.04,delay:.2,clearProps:'opacity,transform'});});return()=>mm.revert();},{scope:wrap,dependencies:[L.mode]});
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from('.hz-twig',{opacity:0,scale:.4,duration:.35,ease:'enter',stagger:.03,svgOrigin:(_i:number,el:Element)=>(el as SVGGElement).dataset.origin??'0 0',clearProps:'opacity,transform'});
  gsap.from('.hz-twig-label',{opacity:0,x:-6,duration:.3,ease:'enter',stagger:.03,delay:.08,clearProps:'opacity,transform'});});return()=>mm.revert();},{scope:wrap,dependencies:[focus?.id,twigItems.length],revertOnUpdate:true});
 return <div ref={wrap} className={`hz-map mode-${L.mode}`}>
  {L.mode==='stack'&&<SkyLine state={state} mutate={mutate} className="hz-map-sky"/>}
  <div className="hz-map-stage" style={{height:L.height}}>
   <svg className="hz-map-svg" width={L.width} height={L.height} aria-hidden="true">
    {shapes.trunk&&<g className="hz-trunk"><Rough className="hz-branch-shape" shape={shapes.trunk}/></g>}
    {L.branches.map((b,k)=>{const g=goals[b.index];return <g key={g.id} className={`hz-branch ${b.index===fi?'focused':'dim'}`} data-origin={`${b.p0[0]} ${b.p0[1]}`} style={{'--c':INK[b.index%INK.length]} as React.CSSProperties}>
     <Rough className="hz-branch-shape" shape={shapes.branches[k]}/><Rough className="hz-branch-vein" shape={shapes.veins[k]}/></g>;})}
    {L.twigs.map((t,j)=><g key={j} className="hz-twig" data-origin={`${t.p0[0]} ${t.p0[1]}`} style={{'--c':INK[fi%INK.length]} as React.CSSProperties}><Rough className="hz-branch-shape" shape={shapes.twigs[j]}/></g>)}
    {cloud&&<Rough className="hz-centre" shape={cloud}/>}
   </svg>
   {L.mode==='both'&&<div className="hz-map-centre" style={{left:L.centre.x-L.centre.w/2+14,top:L.centre.y-L.centre.h/2+8,width:L.centre.w-28,height:L.centre.h-16}}><SkyLine state={state} mutate={mutate} className="in-map"/></div>}
   {L.branches.map(b=>{const g=goals[b.index],done=g.steps.filter(x=>x.done).length,openN=g.steps.length-done,focused=b.index===fi,reached=isReached(state,g),due=deadlineText(g.deadline,now).text;
    const right=b.side===1;
    return <button key={g.id} type="button" className={`hz-map-label ${focused?'focused':'dim'} ${right?'to-right':'to-left'} ${L.mode==='stack'?'':'hug-tip'} ${b.label.below?'below':''}`} style={{left:right?b.label.x:b.tip[0]-6,top:b.label.below?b.label.y+2:b.label.y-50,width:b.label.width+6,'--c':INK[b.index%INK.length]} as React.CSSProperties}
     aria-pressed={focused} aria-label={`Goal ${b.index+1}${g.one?', the one':''}: ${g.text}. ${done} of ${g.steps.length} steps.${due?` ${due}.`:''}${reached?' Reached.':''}${focused?'':' Focus this goal.'}`} title={g.text}
     onClick={()=>onFocus(g.id)}>
     <span className="hz-map-text"><b>{b.index+1}</b> {g.text}</span>
     {g.one&&<span className="hz-seal static small">The one</span>}
     {!focused&&openN>0&&<span className="hz-fold-count" aria-hidden="true">{openN}</span>}
    </button>;})}
   {L.twigs.map((t,j)=>{const it=twigItems[j],right=t.label.align==='left';const style={left:right?t.label.x:t.label.x,top:t.label.y-22,width:t.label.width} as React.CSSProperties;
    if('more' in it)return <button key="more" type="button" className={`hz-twig-label more ${right?'to-right':'to-left'}`} style={style} onClick={onMore}>+{it.more} more</button>;
    if('add' in it)return <button key="add" type="button" className={`hz-twig-label add ${right?'to-right':'to-left'}`} style={style} onClick={e=>onAddStep(e.currentTarget)}>Add the first step</button>;
    const st=it.step,n=focus.steps.indexOf(st)+1,tag=stepTag(state,st,now);
    return <button key={st.id} type="button" data-step={st.id} className={`hz-twig-label ${j===0?'next':''} ${right?'to-right':'to-left'}`} style={style} aria-label={`Step ${n} of ${focus.steps.length}: ${st.text}.${tag?` ${tag}.`:''}${j===0?' Next step.':''}`} onClick={e=>onTwig(e.currentTarget,st)}>
     <span className="hz-twig-text">{st.text}</span>{tag&&L.mode==='stack'&&<span className={`hz-tag ${tag==='On today'?'on':''}`}>{tag}</span>}</button>;})}
  </div>
 </div>;
}
