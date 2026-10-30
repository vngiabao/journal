// Bond on his trail: the strip at the top of Today, and the whole trail with the keepsakes when you tap it.
import {useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore,type RefObject} from 'react';
import type {State} from '../model';
import type {Mutate} from '../GoalControls';
import {gsap,useGSAP,whenMotionOK,motionOK} from '../motion';
import {petChoice} from '../Pet';
import {Rough,sk,seedOf} from '../Sketch';
import {addDays,label,weekStart} from '../dates';
import {journey,bondLine,dayLine,trailPose,keepsake,milestoneDue,milestoneKey,markCelebrated,type Journey} from './journey';
import {stripLayout,fullLayout} from './trail';
import {bondArt,celebrateMilestone,greet} from './celebrate';

const subscribePets=(cb:()=>void)=>{window.addEventListener('reboot-pet',cb);window.addEventListener('storage',cb);return()=>{window.removeEventListener('reboot-pet',cb);window.removeEventListener('storage',cb);};};
// The person's own choice, not whether the pocket pet fits this screen: on a phone Bond still hops in the strip.
const usePetsOn=()=>useSyncExternalStore(subscribePets,()=>petChoice()!=='off',()=>true);

function useSize(ref:RefObject<HTMLElement|null>){
 const [s,setS]=useState({w:0,h:0});
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const read=()=>{const r=el.getBoundingClientRect();setS(p=>p.w===Math.round(r.width)&&p.h===Math.round(r.height)?p:{w:Math.round(r.width),h:Math.round(r.height)});};
  read();const ro=new ResizeObserver(read);ro.observe(el);return()=>ro.disconnect();},[]);
 return s;
}

const WALKED='reboot-bond-walked';
const walkedToday=(now:string)=>{try{return sessionStorage.getItem(WALKED)===now;}catch{return true;}};
const markWalked=(now:string)=>{try{sessionStorage.setItem(WALKED,now);}catch{/* storage blocked: he just won't walk again */}};

// Bond himself. While walking he swaps between two frames, like a flip book.
function BondFigure({pose,walking,className}:{pose:string;walking:boolean;className:string}){
 if(walking)return <span className={`${className} bond-walking`}><img src={bondArt('walk-a')} alt=""/><img src={bondArt('walk-b')} alt=""/></span>;
 return <span className={className}><img src={bondArt(pose)} alt=""/></span>;
}

// This week, Monday to Sunday: a filled stone for each day you showed up. Missed days are just empty, never marked.
function WeekStones({j,now,letters=false}:{j:Journey;now:string;letters?:boolean}){
 const ws=weekStart(now),d=letters?26:18,gap=letters?18:8,w=7*d+6*gap+4;
 return <span className={`bond-week ${letters?'big':''}`} role="img" aria-label={`${j.weekCount} of 7 days this week`}>
  <svg width={w} height={d+4} viewBox={`0 0 ${w} ${d+4}`} aria-hidden="true">
   {j.week.map((on,i)=>{const date=addDays(ws,i),cx=2+d/2+i*(d+gap),isToday=date===now,future=date>now;
    return <Rough key={i} className={`rk-bw ${on?'on':future?'future':'off'} ${isToday?'today':''}`} shape={sk.circle(cx,d/2+2,d-2,{seed:seedOf(`wk${i}`),roughness:.9,strokeWidth:1.6,...(on?{fill:'x',fillStyle:'solid'}:{})})}/>;})}
  </svg>
  {letters&&<span className="bond-week-letters" aria-hidden="true">{['M','T','W','T','F','S','S'].map((l,i)=><span key={i} style={{width:d,marginRight:i<6?gap:0}}>{l}</span>)}</span>}
 </span>;
}

function Flag({x,y,state,tall=56}:{x:number;y:number;state:'earned'|'next'|'later';tall?:number}){
 const top=y-tall,seed=seedOf(`flag${x|0}`);
 return <g className={`bond-flag-mark ${state}`}>
  <Rough className="rk-bf-pole" shape={sk.line(x,y+2,x,top,{seed,roughness:.8,strokeWidth:2.2})}/>
  <Rough className="rk-bf-cloth" shape={sk.polygon([[x,top],[x+30,top+8],[x,top+17]],{seed:seed+1,roughness:.9,strokeWidth:1.5,...(state==='later'?{}:{fill:'x',fillStyle:'solid'})})}/>
 </g>;
}

// The strip: words on the left, one stretch of trail on the right, Bond on it, the next flag ahead.
function Strip({state,mutate,now}:{state:State;mutate:Mutate;now:string}){
 const j=useMemo(()=>journey(state,now),[state,now]);
 const pets=usePetsOn(),root=useRef<HTMLDivElement>(null),trailRef=useRef<HTMLSpanElement>(null),bondRef=useRef<HTMLSpanElement>(null),sheet=useRef<HTMLDialogElement>(null);
 const {w,h}=useSize(trailRef),L=useMemo(()=>w?stripLayout(j,w,h||124):null,[j,w,h]);
 const hour=new Date().getHours(),pose=trailPose(j),shownPose=pets?pose:pose==='walk-a'?'sit':pose;
 // In the flag pose Bond holds the flag himself, his pole standing where the drawn one would.
 const spot=L?(shownPose==='flag'?{x:L.flag.x-32,y:L.flag.y}:L.bond):null;
 // Bond walks one stone forward the first time you see the strip after showing up today (once a visit), or right as you finish.
 const [walk,setWalk]=useState<{from:number;id:number}|null>(()=>j.today&&!walkedToday(now)&&motionOK()&&pets?{from:j.total-1,id:1}:null);
 const seen=useRef(j.total);
 useEffect(()=>{if(j.total>seen.current&&j.today&&motionOK()&&pets)setWalk({from:seen.current,id:Date.now()});seen.current=j.total;},[j.total]);

 // A milestone reached today is celebrated once, and remembered.
 useEffect(()=>{const n=milestoneDue(state,now);if(!n)return;mutate(s=>markCelebrated(s,milestoneKey(n)),'bond milestone');celebrateMilestone(n,now);},[state,now]);
 // Back after a few days away: the pocket pet says hello, once that day.
 useEffect(()=>{if(j.today||!j.total||j.sinceLast===null||j.sinceLast<2||state.bond?.lastGreeted===now)return;
  const t=window.setTimeout(()=>{if(greet('Bond missed you. Welcome back.'))mutate(s=>{(s.bond??(s.bond={})).lastGreeted=now;},'bond greeting');},900);return()=>clearTimeout(t);},[j.today,j.sinceLast,now]);

 useGSAP(()=>{
  if(!L)return;
  whenMotionOK(()=>{gsap.from('.bs-words > *',{opacity:0,y:8,duration:.3,ease:'enter',stagger:.05,clearProps:'opacity,transform'});});
 },{scope:root,dependencies:[!!L]});
 useGSAP(()=>{
  if(!L||!walk||!bondRef.current)return;
  markWalked(now);
  const dx=L.bondAt(walk.from).x-spot!.x;
  if(Math.abs(dx)<1){setWalk(null);return;}
  gsap.fromTo(bondRef.current,{x:dx},{x:0,duration:Math.min(1.6,.5+Math.abs(dx)/160),ease:'move',delay:.25,onComplete:()=>{setWalk(null);
   const el=bondRef.current;if(el&&j.milestoneToday)gsap.timeline().to(el,{y:-14,duration:.2,ease:'power2.out',yoyo:true,repeat:1}).to(el,{y:0,duration:.35,ease:'elastic.out(1,.4)'});}});
 },{scope:root,dependencies:[walk?.id,!!L]});

 const open=()=>{const d=sheet.current;if(!d)return;d.showModal();if(motionOK())gsap.fromTo(d,{opacity:0,y:24},{opacity:1,y:0,duration:.3,ease:'enter',clearProps:'opacity,transform'});};
 const line=bondLine(j,hour),flagState=j.milestoneToday?'earned':'next';

 return <div ref={root} className="bond-strip-wrap">
  <button type="button" className={`bond-strip ${j.today?'is-today':''} ${j.milestoneToday?'is-milestone':''}`} onClick={open} aria-haspopup="dialog" aria-label={`${dayLine(j)}. ${j.weekCount} of 7 this week. ${line} Open Bond’s trail.`}>
   <span className="bs-words" aria-hidden="true">
    <span className="bs-day">{dayLine(j)}</span>
    <span className="bs-week-row"><WeekStones j={j} now={now}/><span className="bs-week-text">{j.weekCount} of 7 this week</span></span>
    <span className="bs-line">{line}</span>
   </span>
   <span ref={trailRef} className="bs-trail" aria-hidden="true">
    {L&&<>
     <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Rough className="rk-bt-path" shape={sk.curve(L.path.map(p=>[p.x,p.y]),{seed:seedOf('bond-strip'),roughness:1.1,strokeWidth:3})}/>
      <Rough className="rk-bt-walked" shape={L.bond.x>L.x0+2&&sk.curve(L.path.filter(p=>p.x<=L.bond.x).map(p=>[p.x,p.y]),{seed:seedOf('bond-walked'),roughness:1,strokeWidth:3.6})}/>
      {L.stones.map((s,i)=><Rough key={i} className={`rk-bt-stone ${s.done?'done':'ahead'}`} shape={sk.circle(s.x,s.y,s.start?19:15,{seed:seedOf(`st${i}`),roughness:1,strokeWidth:1.6,fill:'x',fillStyle:'solid'})}/>)}
      {shownPose!=='flag'&&<Flag x={L.flag.x} y={L.flag.y} state={flagState}/>}
     </svg>
     <span className="bs-flag-label" style={{left:L.flag.x+36,top:Math.max(4,L.flag.y-64)}}>
      <b>{j.next} days</b><span>{j.milestoneToday?'reached today':`${j.toNext} to go`}</span>
     </span>
     <span ref={bondRef} className="bs-bond-pos" style={{left:spot!.x,top:spot!.y}}>
      <BondFigure pose={shownPose} walking={!!walk} className={`bs-bond pose-${shownPose}`}/>
     </span>
    </>}
   </span>
   <span className="bs-open" aria-hidden="true">See the trail</span>
  </button>
  <dialog ref={sheet} className="bond-sheet" aria-label="Bond’s trail" onClick={e=>{if(e.target===sheet.current)sheet.current.close();}}>
   <div className="bond-sheet-in">
    <button type="button" className="bond-sheet-close" onClick={()=>sheet.current?.close()}>Close</button>
    <Full j={j} now={now}/>
   </div>
  </dialog>
 </div>;
}

// A keepsake: a little postage stamp with Bond on it, earned at a milestone.
export function Stamp({n,date}:{n:number;date?:string}){
 const k=keepsake(n);
 return <div className="bond-stamp" style={{['--tilt' as string]:`${(n*37%7)-3}deg`}}><div className="bond-stamp-in">
  <img className="bond-stamp-dog" src={bondArt(k.pose)} alt=""/>
  <b className="bond-stamp-n">{n}</b><span className="bond-stamp-name">{k.name}</span>
  {date&&<span className="bond-stamp-date">{label(date,{month:'short',day:'numeric'})}</span>}
 </div></div>;
}

// The whole trail: every flag so far, the next two ahead, Bond where you are, and the keepsakes collected.
function Full({j,now}:{j:Journey;now:string}){
 const pets=usePetsOn(),box=useRef<HTMLDivElement>(null),{w}=useSize(box),L=useMemo(()=>w?fullLayout(j,w):null,[j,w]);
 const pose=trailPose(j),shownPose=pose==='walk-a'?'walk-a':pose;
 const first=j.days[0];
 return <section className="bond-full" aria-label="Bond’s trail">
  <header className="bf-head">
   <h2>Bond’s trail</h2>
   <p className="bf-sum">{j.total?<>{j.total} {j.total===1?'day':'days'} showing up{first?<> since {label(first,{month:'long',day:'numeric'})}</>:null}.</>:<>Every day you finish the morning or evening check-in, Bond takes a step.</>}</p>
   <div className="bf-week"><WeekStones j={j} now={now} letters/><span>{j.weekCount} of 7 this week</span></div>
  </header>
  <div ref={box} className="bf-trail" style={{height:L?.height??260}}>
   {L&&<>
    <svg width={w} height={L.height} viewBox={`0 0 ${w} ${L.height}`} aria-hidden="true">
     <Rough className="rk-bt-path" shape={sk.curve(L.path.map(p=>[p.x,p.y]),{seed:seedOf('bond-full'),roughness:1.1,strokeWidth:2.6})}/>
     {L.stones.map((s,i)=><Rough key={i} className={`rk-bt-stone ${s.done?'done':'ahead'}`} shape={sk.circle(s.x,s.y,13,{seed:seedOf(`fs${i}`),roughness:1,strokeWidth:1.5,fill:'x',fillStyle:'solid'})}/>)}
     {L.flags.map(f=>f.state==='start'
      ?<Rough key={f.k} className="rk-bt-stone done" shape={sk.circle(f.x,f.y,16,{seed:7,roughness:1,strokeWidth:1.6,fill:'x',fillStyle:'solid'})}/>
      :<Flag key={f.k} x={f.x} y={f.y} state={f.state} tall={48}/>)}
    </svg>
    {L.flags.map(f=><span key={f.k} className={`bf-flag-label ${f.state}`} style={{left:f.x,top:f.y+14}}>
     {f.state==='start'?<><b>Start</b>{first&&<span>{label(first,{month:'short',day:'numeric'})}</span>}</>
      :<><b>{f.n} days</b><span>{f.state==='earned'?label(j.days[f.n-1],{month:'short',day:'numeric'}):f.state==='next'?`${j.toNext} to go`:'later'}</span></>}
    </span>)}
    <span className={`bf-bond-pos ${L.face<0?'face-left':''}`} style={{left:L.bond.x,top:L.bond.y}}><BondFigure pose={pets?shownPose:shownPose==='walk-a'?'sit':shownPose} walking={false} className="bf-bond"/></span>
   </>}
  </div>
  <div className="bf-keepsakes">
   <h3>Keepsakes</h3>
   <div className="bf-stamps">
    {j.earned.map(e=><Stamp key={e.n} n={e.n} date={e.date}/>)}
    {!j.milestoneToday&&<div className="bond-stamp-next"><b>{j.next}</b><span>days</span><em>{j.earned.length?`${j.toNext} to go`:`Your first keepsake comes at ${j.next} days.`}</em></div>}
   </div>
  </div>
 </section>;
}

export function BondJourney({state,mutate,now,size='strip'}:{state:State;mutate:Mutate;now:string;size?:'strip'|'full'}){
 const j=useMemo(()=>journey(state,now),[state,now]);
 if(size==='full')return <Full j={j} now={now}/>;
 return <Strip state={state} mutate={mutate} now={now}/>;
}
