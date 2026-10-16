import {useEffect,useLayoutEffect,useRef,useState} from 'react';
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
import {PocketPets,usePocketPets} from './Pet';
import {burst,inkStamp,installHoverPhysics} from './delight';
import {gsap,useGSAP,motionOK,whenMotionOK,SplitText,Flip,ScrollTrigger} from './motion';

const nav=[['Today',Sun],['Reboot Board',LayoutGrid],['Journey',TrendingUp],['Journal',BookOpen],['Review',ChartNoAxesCombined]] as const;
const PAGES=new Set<string>([...nav.map(n=>n[0]),'Settings']);
const pageFromHash=()=>{try{const p=decodeURIComponent(location.hash.slice(1));return PAGES.has(p)?p:'Today';}catch{return 'Today';}};
// Consecutive edits to the same thing (typing a journal entry) merge into one history record.
const COALESCE_MS=90_000;

export default function App(){
 const [state,setState]=useState<State|null>(null),[page,setPage]=useState(pageFromHash),[error,setError]=useState(''),[saved,setSaved]=useState('Loading private data…'),[mobile,setMobile]=useState(false),[,setClock]=useState(0),[cheer,setCheer]=useState<{pose:ChibiPose;text:string;key:number}|null>(null);
 const stateRef=useRef<State|null>(null),pendingWrite=useRef<State|null>(null),writing=useRef(false);
 const petChoice=usePocketPets(),pet=petChoice!=='off',lastPress=useRef({x:0,y:0,at:0});
 useEffect(()=>installHoverPhysics(),[]);
 useEffect(()=>{const press=(e:PointerEvent)=>{lastPress.current={x:e.clientX,y:e.clientY,at:Date.now()};};document.addEventListener('pointerdown',press,{passive:true});return()=>document.removeEventListener('pointerdown',press);},[]);
 // A small secret: type "reboot" anywhere outside a text box.
 useEffect(()=>{let typed='';const key=(e:KeyboardEvent)=>{const t=e.target instanceof Element?e.target:null;if(t?.closest('input,textarea,select,[contenteditable="true"]')||e.key.length!==1)return;typed=(typed+e.key.toLowerCase()).slice(-6);
  if(typed!=='reboot')return;typed='';setCheer({pose:'bingo',text:'Reboot complete. New day, same promise. Let’s go.',key:Date.now()});burst(window.innerWidth/2,window.innerHeight*.45,64);
  if(motionOK())gsap.fromTo('.brand svg path',{drawSVG:'0%'},{drawSVG:'100%',duration:.8,ease:'pen',stagger:.25});};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const mainRef=useRef<HTMLElement>(null),navInk=useRef<ReturnType<typeof Flip.getState>|null>(null),loaded=!!state;
 // The current-page marker in the sidebar slides to its new place instead of jumping.
 useLayoutEffect(()=>{const from=navInk.current;navInk.current=null;if(from&&motionOK())Flip.from(from,{targets:'.nav-ink',duration:.5,ease:'power3.inOut'});},[page]);
 // Every page arrives the same way: the title rises word by word, what is on screen settles in,
 // and everything further down waits until you scroll to it. Today has its own opening, so it only gets the scroll part.
 useGSAP(()=>{const root=mainRef.current;if(!root)return;let ro:ResizeObserver|undefined,raf=0;
  const mm=whenMotionOK(()=>{
   const kids=[...root.children].filter(el=>!el.matches('.page-footer,.error-banner,.page-heading,.reboot-hero,[data-own-motion]')) as HTMLElement[];
   const fold=window.innerHeight*.94,above=kids.filter(el=>el.getBoundingClientRect().top<fold),below=kids.filter(el=>!above.includes(el));
   const inner=(els:Element[])=>els.flatMap(el=>[...el.querySelectorAll('[data-stagger]')].flatMap(l=>[...l.children].slice(0,14)));
   const grow=(els:Element[])=>els.flatMap(el=>[...el.querySelectorAll('[data-grow]')]);
   if(page!=='Today'){
    const tl=gsap.timeline({defaults:{ease:'power3.out'}}),head=root.querySelector(':scope > .page-heading');
    const h1=head?.querySelector('h1'),lede=head?.querySelector(':scope > p'),split=h1?SplitText.create(h1,{type:'words',mask:'words'}):null;
    if(split)tl.from(split.words,{yPercent:110,duration:.7,stagger:.06},0);
    const dot=h1?.querySelector('.title-period');if(dot)tl.from(dot,{scale:0,duration:.5,ease:'back.out(4)'},.45);
    if(lede)tl.from(lede,{opacity:0,y:10,duration:.5},.25);
    if(above.length)tl.from(above,{opacity:0,y:22,duration:.6,stagger:.08,clearProps:'opacity,transform'},.3);
    const items=inner(above);if(items.length)tl.from(items,{opacity:0,y:10,duration:.4,stagger:.03,clearProps:'opacity,transform'},.55);
    const bars=grow(above);if(bars.length)tl.from(bars,{scaleX:0,transformOrigin:'0 50%',duration:.8,stagger:.05,clearProps:'transform'},.6);
    if(split)tl.add(()=>split.revert());
   }
   if(!below.length)return;
   gsap.set(below,{opacity:0,y:28});let pending=below.length;
   ScrollTrigger.batch(below,{start:'top 96%',once:true,onEnter:batch=>{pending-=batch.length;
    gsap.to(batch,{opacity:1,y:0,duration:.7,ease:'power3.out',stagger:.1,overwrite:true,clearProps:'opacity,transform'});
    const items=inner(batch);if(items.length)gsap.from(items,{opacity:0,y:12,duration:.45,stagger:.035,delay:.2,ease:'power2.out',clearProps:'opacity,transform'});
    const bars=grow(batch);if(bars.length)gsap.from(bars,{scaleX:0,transformOrigin:'0 50%',duration:.8,stagger:.05,delay:.3,ease:'power3.out',clearProps:'transform'});
    if(pending<=0)ro?.disconnect();}});
   // Content that grows or shrinks (a journal entry, an opened goal) moves what is below it; keep the triggers honest.
   ro=new ResizeObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>ScrollTrigger.refresh());});ro.observe(root);
  });
  return()=>{cancelAnimationFrame(raf);ro?.disconnect();mm.revert();};
 },{dependencies:[page,loaded],revertOnUpdate:true});
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
  const p=lastPress.current;if(Date.now()-p.at<1500)inkStamp(p.x,p.y,finished?'Done':'Kept');
  setCheer(finished?{pose:'bingo',text:'Goal complete! That’s a stamp on the board.',key:Date.now()}:{pose:'check',text:'Kept. One more promise on the record.',key:Date.now()});
  clearTimeout(cheerTimer.current);
 }
 function go(p:string){navInk.current=Flip.getState('.nav-ink');setPage(p);location.hash=p;setMobile(false);window.scrollTo({top:0,behavior:'instant'});}

 if(!state)return <div className="loading-state"><h1>Project Reboot<span className="title-period">.</span></h1><p>{error||'Opening your private board…'}</p></div>;
 const now=today(state.settings.timezone);
 return <div className={`app ${pet?'has-pet':''}`}>
  <a href="#main" className="skip">Skip to content</a>
  <aside className={`sidebar ${mobile?'open':''}`} aria-label="Sidebar">
   <button className="brand" onClick={()=>go('Today')} onMouseEnter={e=>{if(motionOK())gsap.fromTo(e.currentTarget.querySelectorAll('path'),{drawSVG:'0%'},{drawSVG:'100%',duration:.7,ease:'pen',stagger:.2,overwrite:true});}}><svg viewBox="0 0 32 30" aria-hidden="true"><path d="M2 27 L8 16 L13 20 L18 8 L23 12 L30 2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/><path d="M23.5 2 H30 V8.5" fill="none" stroke="var(--metal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span>Project<br/><b>Reboot</b></span></button>
   <p className="sidebar-caption">Make room for who you’re becoming.</p>
   <Chibi pose="avatar" className="sidebar-chibi"/>
   <nav aria-label="Main navigation">{nav.map(([name,Icon])=><button key={name} className={page===name?'current':''} onClick={()=>go(name)} aria-current={page===name?'page':undefined}>{page===name&&<span className="nav-ink" data-flip-id="nav-ink" aria-hidden="true"/>}<Icon size={18} strokeWidth={1.5}/>{name}</button>)}</nav>
   <div className="sidebar-bottom"><p>Progress isn’t linear.<br/><em>Keep showing up.</em></p><span className={saved==='Not saved'?'error sidebar-status':'sidebar-status'} role="status"><Check size={13}/>{saved}</span><button className={page==='Settings'?'current':''} onClick={()=>go('Settings')} aria-current={page==='Settings'?'page':undefined}><SettingsIcon size={17} strokeWidth={1.5}/>Settings & data</button><span className="sidebar-private"><ShieldCheck size={14}/>Private on this device</span></div>
  </aside>
  {pet&&<PocketPets choice={petChoice} state={state} now={now} cheer={cheer} onCheerDone={()=>setCheer(null)}/>}
  {cheer&&!pet&&<CheerToast key={cheer.key} pose={cheer.pose} text={cheer.text} onDone={()=>setCheer(null)}/>}
  {mobile&&<button className="scrim" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
  <div className="main-shell">
   <header className="topbar"><button className="icon-button mobile-menu" aria-label={mobile?'Close navigation':'Open navigation'} aria-expanded={mobile} onClick={()=>setMobile(!mobile)}>{mobile?<X size={20}/>:<Menu size={20}/>}</button><span className="crumb"><span className="crumb-prefix">Personal workspace <span className="top-divider">/</span> </span><strong>{page}</strong></span><div className="topbar-end"><span className={saved==='Not saved'?'error saved-status':'saved-status'} aria-hidden="true"><Check size={13}/><span>{saved==='Saved on this device'?'Saved':saved}</span></span></div></header>
   <main id="main" key={page} ref={mainRef} className={page==='Today'?'page-enter':undefined}>
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

// Chibi Bao drops in with a squash and stretch, hops once, holds, then slips away.
function CheerToast({pose,text,onDone}:{pose:ChibiPose;text:string;onDone:()=>void}){
 const el=useRef<HTMLDivElement>(null),big=pose==='bingo';
 useGSAP(()=>{const img='.chibi',bubble='p';
  if(!motionOK()){gsap.timeline({onComplete:onDone}).from(el.current,{opacity:0,duration:.15}).to(el.current,{opacity:0,duration:.2,delay:big?2.8:1.8});return;}
  gsap.timeline({onComplete:onDone})
   .from(img,{y:140,scaleY:1.25,scaleX:.8,transformOrigin:'50% 100%',duration:.45,ease:'power3.out'})
   .to(img,{scaleY:.82,scaleX:1.14,duration:.12,ease:'power1.out'})
   .to(img,{scaleY:1,scaleX:1,duration:.5,ease:'elastic.out(1,.35)'})
   .from(bubble,{opacity:0,x:16,scale:.9,transformOrigin:'100% 100%',duration:.35,ease:'back.out(2)'},'-=.55')
   .to(img,{y:big?-26:-14,duration:.22,ease:'power2.out',yoyo:true,repeat:big?3:1},'-=.1')
   .to(el.current,{y:30,opacity:0,duration:.35,ease:'power2.in',delay:big?1.6:.9});
 },{scope:el});
 return <div ref={el} className={`chibi-toast is-${pose}`} role="status"><Chibi pose={pose}/><p>{text}</p></div>;
}
