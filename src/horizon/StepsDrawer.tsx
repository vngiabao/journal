// "Edit the trail": every step as an ordered list. Drag to reorder, Alt+Up/Down to move, rename in place, remove.
// This is also the screen-reader-first path through a goal's steps.
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {PlanGoal} from '../model';
import type {Mutate} from '../GoalControls';
import {addStep,reorderStep,renameStep,toggleStep} from '../plan';
import {Check,ChevronUp,ChevronDown,Plus,X,Trash2} from '../icons';
import {gsap,whenMotionOK,useGSAP} from './motion';

export function StepsDrawer({goal:g,gi,mutate,onRemoveStep,onClose}:{goal:PlanGoal;gi:number;mutate:Mutate;onRemoveStep:(stepId:string)=>void;onClose:()=>void}){
 const box=useRef<HTMLDivElement>(null),panel=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 const [text,setText]=useState(''),[drag,setDrag]=useState<number|null>(null),[over,setOver]=useState<number|null>(null),[say,setSay]=useState('');
 useEffect(()=>{const back=document.activeElement as HTMLElement|null;panel.current?.querySelector<HTMLElement>('h2')?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();close.current();return;}
   if(e.key!=='Tab'||!panel.current)return;const f=[...panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),input,[tabindex="0"]')];if(!f.length)return;const a=f[0],z=f[f.length-1];
   if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}};
  window.addEventListener('keydown',key,true);document.body.classList.add('drawer-open');
  return()=>{window.removeEventListener('keydown',key,true);document.body.classList.remove('drawer-open');back?.focus?.({preventScroll:true});};},[]);
 useGSAP(()=>{const mm=whenMotionOK(()=>{const wide=window.matchMedia('(min-width: 721px)').matches;gsap.from('.hz-drawer',{...(wide?{xPercent:8}:{yPercent:12}),opacity:0,duration:.35,ease:'enter',clearProps:'transform,opacity'});gsap.from('.hz-scrim',{opacity:0,duration:.25,clearProps:'opacity'});});return()=>mm.revert();},{scope:box});
 const move=(from:number,to:number)=>{if(to<0||to>=g.steps.length)return;mutate(s=>reorderStep(s,g.id,from,to),'plan order');setSay(`Moved to position ${to+1} of ${g.steps.length}.`);
  window.setTimeout(()=>panel.current?.querySelector<HTMLInputElement>(`[data-row="${to}"] input`)?.focus(),0);};
 return createPortal(<div ref={box} className="hz-drawer-root">
  <button type="button" className="hz-scrim" aria-hidden="true" tabIndex={-1} onClick={onClose}/>
  <aside ref={panel} className="hz-drawer" role="dialog" aria-modal="true" aria-labelledby="hz-drawer-title">
   <header className="hz-drawer-head"><p className="hz-kicker">Goal {gi+1} · the trail</p><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></header>
   <h2 id="hz-drawer-title" tabIndex={-1}>{g.text}</h2>
   <p className="hz-drawer-help">List every step. Order them later. Drag a row, or press Alt and an arrow key, to move it.</p>
   <ol className="hz-steps-list">{g.steps.map((x,i)=><li key={x.id} data-row={i} className={`${x.done?'done':''} ${over===i&&drag!==null&&drag!==i?'drop':''}`} draggable onDragStart={e=>{setDrag(i);e.dataTransfer.effectAllowed='move';}} onDragOver={e=>{e.preventDefault();setOver(i);}} onDragEnd={()=>{setDrag(null);setOver(null);}} onDrop={e=>{e.preventDefault();if(drag!==null&&drag!==i)move(drag,i);setDrag(null);setOver(null);}}>
    <span className="hz-grip" aria-hidden="true">⋮⋮</span>
    <button type="button" className={`check-action ${x.done?'checked':''}`} aria-pressed={x.done} aria-label={`${x.done?'Done':'Mark done'}: ${x.text}`} onClick={()=>mutate(s=>toggleStep(s,g.id,x.id),'plan step')}><span className="check-box">{x.done&&<Check size={13}/>}</span></button>
    <span className="hz-row-no">{i+1}</span>
    <input aria-label={`Step ${i+1}`} defaultValue={x.text} maxLength={140} onBlur={e=>{const v=e.target.value.trim();if(v&&v!==x.text)mutate(s=>renameStep(s,g.id,x.id,v),'plan step text');}}
     onKeyDown={e=>{if(e.altKey&&e.key==='ArrowUp'){e.preventDefault();move(i,i-1);}else if(e.altKey&&e.key==='ArrowDown'){e.preventDefault();move(i,i+1);}else if(e.key==='Enter')(e.target as HTMLInputElement).blur();}}/>
    <span className="hz-row-tools">
     <button type="button" className="icon-button" aria-label={`Move “${x.text}” earlier`} disabled={i===0} onClick={()=>move(i,i-1)}><ChevronUp size={14}/></button>
     <button type="button" className="icon-button" aria-label={`Move “${x.text}” later`} disabled={i===g.steps.length-1} onClick={()=>move(i,i+1)}><ChevronDown size={14}/></button>
     <button type="button" className="icon-button danger" aria-label={`Remove “${x.text}”`} onClick={()=>onRemoveStep(x.id)}><Trash2 size={15}/></button>
    </span>
   </li>)}</ol>
   {!g.steps.length&&<p className="hz-empty">No trail yet. List every step it takes to get there - about 10 minutes.</p>}
   <form className="hz-add-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;mutate(s=>{addStep(s,g.id,v);},'plan add step');setText('');setSay(`Added: ${v}.`);}}>
    <Plus size={16}/><input aria-label="Add a step" value={text} maxLength={140} placeholder="One step, in a few words" onChange={e=>setText(e.target.value)}/><button className="button" disabled={!text.trim()}>Add</button></form>
   <p className="visually-hidden" role="status">{say}</p>
  </aside>
 </div>,document.body);
}
