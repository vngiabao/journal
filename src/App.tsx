import {useEffect,useRef,useState} from 'react';
import {Sun,LayoutGrid,TrendingUp,BookOpen,ChartNoAxesCombined,SettingsIcon,Check,Menu,X,ShieldCheck} from './icons';
import type {State} from './model';
import {uid} from './model';
import {loadState,saveState} from './storage';
import {today} from './dates';
import {completionRecords} from './engine';
import {Board} from './Board';
import type {Mutate} from './GoalControls';
import {Journey} from './Journey';
import {Journal} from './Journal';
import {Review} from './Review';
import {Settings} from './Settings';
import {Today} from './Today';
import {Chibi,type ChibiPose} from './Art';

const nav=[['Today',Sun],['Reboot Board',LayoutGrid],['Journey',TrendingUp],['Journal',BookOpen],['Review',ChartNoAxesCombined]] as const;
const PAGES=new Set<string>([...nav.map(n=>n[0]),'Settings']);
const pageFromHash=()=>{try{const p=decodeURIComponent(location.hash.slice(1));return PAGES.has(p)?p:'Today';}catch{return 'Today';}};
// Consecutive edits to the same thing (typing a journal entry) merge into one history record.
const COALESCE_MS=90_000;

export default function App(){
 const [state,setState]=useState<State|null>(null),[page,setPage]=useState(pageFromHash),[error,setError]=useState(''),[saved,setSaved]=useState('Loading private data…'),[mobile,setMobile]=useState(false),[,setClock]=useState(0),[cheer,setCheer]=useState<{pose:ChibiPose;text:string;key:number}|null>(null);
 const stateRef=useRef<State|null>(null),pendingWrite=useRef<State|null>(null),writing=useRef(false);
 useEffect(()=>{
  loadState().then(s=>{stateRef.current=s;setState(s);if(!s.settings.onboarded&&!location.hash)setPage('Reboot Board');setSaved('Saved on this device');}).catch(()=>setError('Private data could not be opened. Check browser storage permissions and reload.'));
  const interval=setInterval(()=>setClock(Date.now()),30000),hash=()=>{if(location.hash==='#main')return;setPage(pageFromHash());setMobile(false);};
  window.addEventListener('hashchange',hash);return()=>{clearInterval(interval);window.removeEventListener('hashchange',hash);};
 },[]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(writing.current||pendingWrite.current){e.preventDefault();}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);

 // Only the newest state is written; intermediate keystrokes never queue up full database writes.
 async function flush(){if(writing.current)return;writing.current=true;while(pendingWrite.current){const s=pendingWrite.current;pendingWrite.current=null;try{await saveState(s);}catch{setSaved('Not saved');setError('Storage write failed. Export a JSON backup from Settings before closing this page.');}}writing.current=false;setSaved(v=>v==='Not saved'?v:'Saved on this device');}
 function persist(next:State){stateRef.current=next;setState(next);setSaved('Saving…');pendingWrite.current=next;void flush();}
 const mutate:Mutate=(fn,entity='record update')=>{
  const previous=stateRef.current;if(!previous)return;const next=structuredClone(previous);fn(next);
  const changes=(a:State,b:State)=>({goals:a.goals.filter(x=>JSON.stringify(x)!==JSON.stringify(b.goals.find(y=>y.id===x.id))),logs:a.logs.filter(x=>JSON.stringify(x)!==JSON.stringify(b.logs.find(y=>y.id===x.id))),journey:a.journey.filter(x=>JSON.stringify(x)!==JSON.stringify(b.journey.find(y=>y.date===x.date))),journals:a.journals.filter(x=>JSON.stringify(x)!==JSON.stringify(b.journals.find(y=>y.date===x.date&&y.kind===x.kind))),proofs:a.proofs.filter(x=>JSON.stringify(x)!==JSON.stringify(b.proofs.find(y=>y.id===x.id))),settings:a.settings});
  const last=next.edits.at(-1),at=new Date();
  if(last&&last.entity===entity&&at.getTime()-new Date(last.at).getTime()<COALESCE_MS){last.after=changes(next,previous);last.at=at.toISOString();}
  else next.edits.push({id:uid(),at:at.toISOString(),entity,before:changes(previous,next),after:changes(next,previous)});
  next.achievements.push(...completionRecords(next,today(next.settings.timezone)));persist(next);
  celebrate(previous,next);
 };
 // A small chibi Bao pops up when a promise is kept today, and celebrates when a goal is completed.
 const cheerTimer=useRef(0);
 function celebrate(a:State,b:State){
  const day=today(b.settings.timezone);
  const finished=b.goals.some(g=>g.status==='completed'&&a.goals.find(x=>x.id===g.id)?.status!=='completed')||b.achievements.length>a.achievements.length;
  const kept=b.logs.some(l=>l.date===day&&l.state==='success'&&a.logs.find(x=>x.id===l.id)?.state!=='success');
  if(!finished&&!kept)return;
  setCheer(finished?{pose:'bingo',text:'Goal complete! That’s a stamp on the board.',key:Date.now()}:{pose:'check',text:'Kept. One more promise on the record.',key:Date.now()});
  clearTimeout(cheerTimer.current);cheerTimer.current=window.setTimeout(()=>setCheer(null),finished?3200:2200);
 }
 function go(p:string){setPage(p);location.hash=p;setMobile(false);window.scrollTo({top:0,behavior:'instant'});}

 if(!state)return <div className="loading-state"><h1>Project Reboot<span className="title-period">.</span></h1><p>{error||'Opening your private board…'}</p></div>;
 const now=today(state.settings.timezone);
 return <div className="app">
  <a href="#main" className="skip">Skip to content</a>
  <aside className={`sidebar ${mobile?'open':''}`} aria-label="Sidebar">
   <button className="brand" onClick={()=>go('Today')}><svg viewBox="0 0 32 30" aria-hidden="true"><path d="M2 27 L8 16 L13 20 L18 8 L23 12 L30 2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/><path d="M23.5 2 H30 V8.5" fill="none" stroke="var(--metal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span>Project<br/><b>Reboot</b></span></button>
   <p className="sidebar-caption">Make room for who you’re becoming.</p>
   <Chibi pose="avatar" className="sidebar-chibi"/>
   <nav aria-label="Main navigation">{nav.map(([name,Icon])=><button key={name} className={page===name?'current':''} onClick={()=>go(name)} aria-current={page===name?'page':undefined}><Icon size={18} strokeWidth={1.5}/>{name}</button>)}</nav>
   <div className="sidebar-bottom"><p>Progress isn’t linear.<br/><em>Keep showing up.</em></p><span className={saved==='Not saved'?'error sidebar-status':'sidebar-status'} role="status"><Check size={13}/>{saved}</span><button className={page==='Settings'?'current':''} onClick={()=>go('Settings')} aria-current={page==='Settings'?'page':undefined}><SettingsIcon size={17} strokeWidth={1.5}/>Settings & data</button><span className="sidebar-private"><ShieldCheck size={14}/>Private on this device</span></div>
  </aside>
  {cheer&&<div key={cheer.key} className={`chibi-toast is-${cheer.pose}`} role="status"><Chibi pose={cheer.pose}/><p>{cheer.text}</p></div>}
  {mobile&&<button className="scrim" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
  <div className="main-shell">
   <header className="topbar"><button className="icon-button mobile-menu" aria-label={mobile?'Close navigation':'Open navigation'} aria-expanded={mobile} onClick={()=>setMobile(!mobile)}>{mobile?<X size={20}/>:<Menu size={20}/>}</button><span className="crumb"><span className="crumb-prefix">Personal workspace <span className="top-divider">/</span> </span><strong>{page}</strong></span><div className="topbar-end"><span className={saved==='Not saved'?'error saved-status':'saved-status'} aria-hidden="true"><Check size={13}/><span>{saved==='Saved on this device'?'Saved':saved}</span></span></div></header>
   <main id="main" key={page} className="page-enter">
    {error&&<div className="error-banner" role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
    {page==='Reboot Board'?<Board state={state} mutate={mutate} now={now}/>
    :page==='Journey'?<><div className="page-heading scene-hero" style={{['--scene' as string]:'url(/art/scene-journey.webp)'}}><h1>The journey<span className="title-period">.</span></h1><p>Doubt, burnout, small wins, restarts, breakthroughs. The line is uneven on purpose.</p></div><Journey state={state} mutate={mutate} now={now}/></>
    :page==='Journal'?<Journal state={state} mutate={mutate} now={now}/>
    :page==='Review'?<Review state={state} mutate={mutate} now={now}/>
    :page==='Settings'?<Settings state={state} mutate={mutate} replace={persist} now={now}/>
    :<Today state={state} mutate={mutate} now={now} go={go}/>}
    <footer className="page-footer"><span>Project Reboot</span><span>A personal commitment. An ongoing story.</span></footer>
   </main>
  </div>
 </div>;
}
