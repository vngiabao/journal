import {useRef,useState} from 'react';
import {Plus,Trophy,Target,Lightbulb,X} from './icons';
import type {State,ProofKind} from './model';
import {uid} from './model';
import type {Mutate} from './GoalControls';
import {label} from './dates';
import {proofCounts,recallProof} from './engine';
import {Count} from './Count';
import {gsap,useGSAP,whenMotionOK} from './motion';

export const PROOF_KINDS:{kind:ProofKind;name:string;plural:string;prompt:string;Icon:typeof Trophy}[]=[
 {kind:'win',name:'Win',plural:'Wins',prompt:'Something that went right',Icon:Trophy},
 {kind:'attempt',name:'Shot taken',plural:'Shots taken',prompt:'Something brave you tried',Icon:Target},
 {kind:'lesson',name:'Lesson',plural:'Lessons',prompt:'What a setback taught you',Icon:Lightbulb},
];
export const proofName=(k:ProofKind)=>PROOF_KINDS.find(p=>p.kind===k)!.name;

export function ProofQuickAdd({state,mutate,date,compact=false}:{state:State;mutate:Mutate;date:string;compact?:boolean}){
 const [kind,setKind]=useState<ProofKind>('win'),[text,setText]=useState(''),[added,setAdded]=useState('');
 const meta=PROOF_KINDS.find(p=>p.kind===kind)!,todays=state.proofs.filter(p=>p.date===date);
 const box=useRef<HTMLDivElement>(null),seen=useRef({date,n:todays.length});
 // A proof you just wrote drops into the list, so you see it land.
 useGSAP(()=>{const prev=seen.current;seen.current={date,n:todays.length};if(prev.date!==date||todays.length<=prev.n)return;
  const mm=whenMotionOK(()=>{gsap.from('.proof-list > li:last-child',{opacity:0,y:-10,scale:.97,duration:.45,ease:'back.out(2)',clearProps:'opacity,transform'});gsap.from('.proof-added',{opacity:0,y:6,duration:.3,ease:'power2.out'});});return()=>mm.revert();},{dependencies:[todays.length,date],scope:box});
 function add(e:React.FormEvent){e.preventDefault();const t=text.trim();if(!t)return;mutate(s=>{s.proofs.push({id:uid(),date,kind,text:t,createdAt:new Date().toISOString()});},`proof ${date}`);setText('');setAdded(meta.name);}
 return <div ref={box} className={`proof-add ${compact?'compact':''}`}>
  <div className="proof-kinds" role="radiogroup" aria-label="Kind of proof">{PROOF_KINDS.map(({kind:k,name,Icon})=><button type="button" role="radio" aria-checked={kind===k} key={k} className={kind===k?'selected':''} onClick={()=>setKind(k)}><Icon size={14} strokeWidth={1.7}/>{name}</button>)}</div>
  <form onSubmit={add}><input aria-label={`Add a ${meta.name.toLowerCase()}`} value={text} onChange={e=>{setText(e.target.value);setAdded('');}} placeholder={meta.prompt}/><button className="button" disabled={!text.trim()}><Plus size={15}/>Add</button></form>
  {added&&<p className="proof-added" role="status">{added} saved to your proof file.</p>}
  {!compact&&todays.length>0&&<ul className="proof-list">{todays.map(p=><ProofItem key={p.id} p={p} mutate={mutate}/>)}</ul>}
 </div>;
}

function ProofItem({p,mutate,showDate=false}:{p:State['proofs'][number];mutate:Mutate;showDate?:boolean}){
 return <li className={`proof-item ${p.kind}`}><span className="proof-kind">{proofName(p.kind)}</span><span className="proof-text">{p.text}</span>{showDate&&<time>{label(p.date,{month:'short',day:'numeric',year:'numeric'})}</time>}<button className="icon-button" aria-label={`Remove “${p.text}”`} onClick={()=>mutate(s=>{s.proofs=s.proofs.filter(x=>x.id!==p.id);},`remove proof ${p.id}`)}><X size={14}/></button></li>;
}

export function ProofRecall({state,now}:{state:State;now:string}){
 const p=recallProof(state.proofs,now);
 if(!p)return <div className="recall empty"><h3>Your proof file</h3><p>Confidence is built from evidence. Each time you win, take a shot, or learn something the hard way, write it down. On days like this one, it will be here to remind you.</p></div>;
 return <figure className="recall letter"><span className="envelope-seal" aria-hidden="true"/><figcaption className="dateline">{label(p.date,{month:'short',day:'numeric',year:'numeric'}).toUpperCase()} <span>From past you</span></figcaption><blockquote>{p.text}</blockquote><span className={`proof-kind ${p.kind}`}>{proofName(p.kind)}</span></figure>;
}

export function ProofFile({state,mutate}:{state:State;mutate:Mutate}){
 const [filter,setFilter]=useState<ProofKind|'all'>('all'),counts=proofCounts(state.proofs);
 const list=state.proofs.filter(p=>filter==='all'||p.kind===filter).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
 return <section className="proof-file review-section">
  <div className="section-title"><div><h2>Your proof file</h2><p>Evidence that you are moving, written by you. Shots taken count whatever the outcome.</p></div></div>
  <div className="proof-tally">{PROOF_KINDS.map(({kind,plural})=><button key={kind} className={filter===kind?'selected':''} onClick={()=>setFilter(filter===kind?'all':kind)}><strong><Count value={counts[kind]}/></strong><span>{plural}</span></button>)}</div>
  {list.length?<ul className="proof-list" data-stagger>{list.map(p=><ProofItem key={p.id} p={p} mutate={mutate} showDate/>)}</ul>:<p className="empty-inline">{state.proofs.length?'Nothing of this kind yet.':'No proof recorded yet. Add your first one from Today or the journal.'}</p>}
 </section>;
}
