// Small pieces shared across Horizon's views: sizes, text measuring, the popover shell, the undo bar, Bond, and the sky line.
import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import type {State,PlanGoal,Goal} from '../model';
import type {Mutate} from '../GoalControls';
import {goalName} from '../Board';
import {gsap,whenMotionOK} from './motion';
import {parse,daysBetween} from '../dates';

export const SHORTCUT_SKIP='input,textarea,select,[contenteditable="true"]';
export const ss={get:(k:string)=>{try{return sessionStorage.getItem(k);}catch{return null;}},set:(k:string,v:string)=>{try{sessionStorage.setItem(k,v);}catch{/* private mode: lasts this visit */}}};

// Width of an element, kept current with a ResizeObserver.
// `key` re-attaches the observer when the measured element is swapped (e.g. switching views).
export function useWidth(ref:RefObject<HTMLElement|null>,fallback=0,key:unknown=0){
 const [w,setW]=useState(fallback);
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const now=el.getBoundingClientRect().width;if(now>0)setW(now);const ro=new ResizeObserver(es=>{const r=es[0]?.contentRect.width;if(r)setW(x=>Math.abs(x-r)>.5?r:x);});ro.observe(el);return()=>ro.disconnect();},[ref,key]);
 return w;
}
const mq=(q:string)=>({sub:(cb:()=>void)=>{const m=window.matchMedia(q);m.addEventListener('change',cb);return()=>m.removeEventListener('change',cb);},get:()=>window.matchMedia(q).matches});
const PHONE=mq('(max-width: 650px)'),SHORT=mq('(max-height: 820px)'),TALL=mq('(min-height: 980px)'),MID=mq('(min-height: 860px)');
export const usePhone=()=>useSyncExternalStore(PHONE.sub,PHONE.get,()=>false);
export const useShort=()=>useSyncExternalStore(SHORT.sub,SHORT.get,()=>false);
// How many open stones the trail shows before folding: fewer on short windows so the next stone stays above the fold.
export function useMaxOpen(){const tall=useSyncExternalStore(TALL.sub,TALL.get,()=>true),mid=useSyncExternalStore(MID.sub,MID.get,()=>true),short=useSyncExternalStore(SHORT.sub,SHORT.get,()=>false);return tall?6:mid?5:short?3:4;}

// Measures text with a canvas in the real web font, and re-measures once the fonts have loaded.
let canvas:HTMLCanvasElement|null=null;
export function useMeasure(font:string){
 const [v,setV]=useState(0);
 useEffect(()=>{let live=true;document.fonts?.ready.then(()=>{if(live)setV(x=>x+1);});return()=>{live=false;};},[]);
 const ctx=(canvas??=document.createElement('canvas')).getContext('2d');
 return {v,measure:(t:string)=>{if(!ctx)return t.length*7.5;ctx.font=font;return ctx.measureText(t).width;}};
}

// Board squares: "4.3 Get a job", tinted by ring like the board (outer, middle, centre four).
export const ringOf=(g:{row:number;col:number})=>Math.min(g.row-1,g.col-1,6-g.row,6-g.col);
export const RINGS=['Outer ring','Middle ring','Centre four'];
export const shortName=(n:string)=>{const words=n.split(/[,(]/)[0].trim().split(/\s+/);let out='';for(const w of words){if(out&&(out+' '+w).length>34)break;out=out?out+' '+w:w;}return out;};
export const squareLabel=(g:Goal,s:State)=>`${g.row}.${g.col} ${shortName(goalName(g,s))}`;
export const boardSquare=(s:State,id?:string)=>id?s.goals.find(g=>g.id===id):undefined;
export const isReached=(s:State,g:PlanGoal)=>!!g.reachedAt||boardSquare(s,g.boardGoal)?.status==='completed';
export const goalLabel=(g:PlanGoal,i:number,n:number,dueText:string)=>`Goal ${i+1}${g.one?', the one':''}: ${g.text}. ${g.steps.filter(x=>x.done).length} of ${g.steps.length} steps.${dueText?` ${dueText}`:''}`;

// A focus-trapped popover anchored to the element that opened it. It grows from the side nearest that element,
// closes on Esc or a click outside, and hands focus back where it came from.
export function Popover({anchor,onClose,label,children,className='',width=280}:{anchor:Element|null;onClose:()=>void;label:string;children:ReactNode;className?:string;width?:number}){
 const box=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 const [pos,setPos]=useState<{left:number;top:number;origin:string}|null>(null);
 useLayoutEffect(()=>{
  const place=()=>{const el=box.current;if(!el)return;const r=anchor?.getBoundingClientRect()??{left:innerWidth/2,right:innerWidth/2,top:innerHeight/3,bottom:innerHeight/3,width:0,height:0} as DOMRect;
   const h=el.offsetHeight,w=Math.min(width,innerWidth-24),below=r.bottom+8+h<=innerHeight-12||r.top-8-h<12;
   const left=Math.max(12,Math.min(innerWidth-w-12,r.left+r.width/2-w/2)),top=(below?r.bottom+8:r.top-8-h)+scrollY;
   const ox=Math.max(12,Math.min(w-12,r.left+r.width/2-left));setPos({left:left+scrollX,top,origin:`${ox}px ${below?'0%':'100%'}`});};
  place();window.addEventListener('resize',place);return()=>window.removeEventListener('resize',place);
 },[anchor,width]);
 useEffect(()=>{const back=document.activeElement as HTMLElement|null;
  const first=box.current?.querySelector<HTMLElement>('[autofocus],input,textarea,button:not(:disabled),select');first?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close.current();return;}
   if(e.key!=='Tab'||!box.current)return;const f=[...box.current.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,[tabindex="0"]')];if(!f.length)return;
   const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}};
  const down=(e:PointerEvent)=>{const t=e.target as Node;if(box.current?.contains(t)||anchor?.contains(t))return;close.current();};
  window.addEventListener('keydown',key,true);document.addEventListener('pointerdown',down,true);
  return()=>{window.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',down,true);if(back&&document.contains(back))back.focus({preventScroll:true});else (anchor as HTMLElement|null)?.focus?.({preventScroll:true});};
 },[]);
 useLayoutEffect(()=>{if(!pos||!box.current)return;const sheet=window.matchMedia('(max-width: 650px)').matches;
  const mm=whenMotionOK(()=>{gsap.fromTo(box.current,sheet?{opacity:0,yPercent:8}:{opacity:0,scale:.96},{opacity:1,scale:1,yPercent:0,duration:sheet?.22:.16,ease:'enter',clearProps:'opacity,transform'});});return()=>mm.revert();},[!!pos]);
 return createPortal(<div ref={box} className={`hz-popover ${className}`} role="dialog" aria-modal="true" aria-label={label}
  style={{left:pos?.left??-9999,top:pos?.top??0,width:Math.min(width,typeof window!=='undefined'?innerWidth-24:width),transformOrigin:pos?.origin}}>{children}</div>,document.body);
}

// "Removed. Undo" for six seconds after anything is removed.
export function UndoBar({text,onUndo,onDone}:{text:string;onUndo:()=>void;onDone:()=>void}){
 useEffect(()=>{const t=window.setTimeout(onDone,6000);return()=>clearTimeout(t);},[onDone]);
 return createPortal(<div className="hz-undo hz-rise" role="status"><span>{text}</span><button type="button" className="text-button" onClick={()=>{onUndo();onDone();}}>Undo</button></div>,document.body);
}

// Bond, the pocket dog, in a few still poses. Callers hide him when the pocket-pet choice is off.
export type BondPose='sit'|'sniff'|'tilt'|'walk'|'cheer'|'flag';
const FLAG_ART='/art/dog/bond-flag.webp'; // Bond beside a planted red pennant, for the reached moment.
export function Bond({pose,className='',style}:{pose:BondPose;className?:string;style?:React.CSSProperties}){
 const src=pose==='flag'?FLAG_ART:`/art/dog/bond-${pose==='walk'?'walk-a':pose}.webp`;
 return <span className={`hz-bond is-${pose} ${className}`} style={style} aria-hidden="true">
  {pose==='walk'?<span className="hz-bond-walk"><img src="/art/dog/bond-walk-a.webp" alt=""/><img src="/art/dog/bond-walk-b.webp" alt=""/></span>:<img src={src} alt=""/>}
 </span>;
}

// The vision, in one line above everything: the same sentence Today shows, so there is one source of truth.
export function SkyLine({state,mutate,className=''}:{state:State;mutate:Mutate;className?:string}){
 const text=state.settings.identity?.trim()??'',[editing,setEditing]=useState(false),[value,setValue]=useState(text);
 const save=()=>{const v=value.trim();if(v!==text)mutate(s=>{s.settings.identity=v;},'identity statement');setEditing(false);};
 if(editing)return <form className={`hz-sky editing ${className}`} onSubmit={e=>{e.preventDefault();save();}}>
  <label className="visually-hidden" htmlFor="hz-sky-input">Who you’re becoming, in one line</label>
  <input id="hz-sky-input" autoFocus value={value} maxLength={160} placeholder="Who are you becoming? Write one line." onChange={e=>setValue(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setValue(text);setEditing(false);}}}/>
 </form>;
 return <div className={`hz-sky ${className}`}>
  <button type="button" className={`hz-sky-text ${text?'':'empty'}`} onClick={()=>{setValue(text);setEditing(true);}} aria-label={text?`Your vision: ${text}. Edit`:'Write who you are becoming'}>{text||'Who are you becoming? Write one line.'}</button>
  <svg className="hz-sun" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4.5c8.4.3 15.6 7 15.2 15.6-.4 8.3-7.2 15.4-15.6 15.1C11.3 34.9 4.6 28 4.8 19.7 5 11.2 12 4.6 20.6 4.9" fill="none" strokeWidth="1.4" strokeLinecap="round"/></svg>
 </div>;
}

// Deadline wording from the spec: "By 1 Mar 2027 - 129 days left", "Due today", "12 days past the deadline - set a new one?"
export const dayMonthYear=(d:string)=>parse(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export function deadlineText(deadline:string|undefined,now:string){
 if(!deadline)return {text:'',late:false};const left=daysBetween(now,deadline);
 if(left===0)return {text:'Due today',late:false};
 if(left<0)return {text:`${-left} ${-left===1?'day':'days'} past the deadline - set a new one?`,late:true};
 return {text:`By ${dayMonthYear(deadline)} - ${left} ${left===1?'day':'days'} left`,late:false};
}
