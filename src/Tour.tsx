// A short guided tour of Today, like a game's first-run walkthrough: each stop spotlights one part of the screen
// with a card that says what it is for. It runs once by itself; "Take the tour" in Settings, "Show me around"
// in the sidebar, or the ? key replays it. Stops whose part is not on screen (Bond on a phone) are skipped.
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {gsap,motionOK} from './motion';
import {ArrowLeft,ArrowRight,X} from './icons';

export const TOUR_KEY='reboot-tour-v1';
export const tourSeen=()=>{try{return localStorage.getItem(TOUR_KEY)==='done';}catch{return true;}};
const markSeen=()=>{try{localStorage.setItem(TOUR_KEY,'done');}catch{/* private browsing: it may show again next visit */}};
export const startTour=()=>window.dispatchEvent(new Event('reboot-tour'));

type Stop={targets?:string[];title:string;body:string;optional?:boolean};
const STOPS:Stop[]=[
 {title:'Welcome to Reboot',body:'A one-minute tour of how a day works here. Everything stays private on this device.'},
 {targets:['.today-head .rh-statement'],title:'Who you’re becoming',body:'Your one sentence, with real counts underneath: promises kept, streaks, shots taken. Nothing here is estimated.'},
 {targets:['.frog-card','.frog-pick','.today-list .todo-add'],title:'Eat your frog first',body:'Pick the task you’d most like to put off. It goes to the top, and you do it first. Break it into small slices, or tap “Eat it now” for a focus timer.'},
 {targets:['.today-list .todo-add'],title:'The rest of today',body:'Add what else today needs. Tap the A–E chip to set a priority: A must, B should, C nice to do, D hand it off, E drop it.'},
 {targets:['.promises'],title:'Your promises',body:'The habits you’ve turned on. Tap Mark done each day. A gold note means today keeps a streak going; weekly ones show their count.'},
 {targets:['.checkin .mood-row','.checkin'],title:'How was today?',body:'One tap sets your mood and marks the day on your Journey line. Add one line for your journal, and one win or shot you took.'},
 {targets:['.tabbar','.sidebar nav'],title:'Four places',body:'Today is home. Journal is for writing. Progress holds your line and the review. The Board has all 36 goals from May.'},
 {targets:['.topbar-settings','.sidebar .nav-settings'],title:'Settings and reminders',body:'Set your frog reminders here, so your phone’s calendar nudges you each morning and evening. Bond and backups live here too.'},
 {targets:['.pocket-pet .pet-frame'],title:'This is Bond',body:'He follows your cursor and sprints wherever you click. He covers his eyes while you write. Tap him for a reminder of a real win.',optional:true},
 {title:'You’re all set',body:'Start with your frog. You can replay this tour anytime: press ?, use “Show me around” in the sidebar, or Settings → Take the tour.'},
];

const visible=(el:Element)=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden';};
const find=(s:Stop)=>s.targets?.map(q=>document.querySelector(q)).find((el):el is Element=>!!el&&visible(el))??null;

export function Tour({onClose}:{onClose:()=>void}){
 const stops=useRef(STOPS.filter(s=>!s.optional||find(s))).current;
 const [i,setI]=useState(0),[rect,setRect]=useState<DOMRect|null>(null),card=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 const stop=stops[i],last=i===stops.length-1;
 const finish=()=>{markSeen();close.current();};
 // Bring the stop's part of the screen into view, then keep the spotlight on it as the page moves.
 useLayoutEffect(()=>{const el=find(stop);if(!el){setRect(null);return;}
  el.scrollIntoView({block:el.getBoundingClientRect().height>innerHeight*.55?'start':'center',behavior:motionOK()?'smooth':'auto'});
  let raf=0;const measure=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>setRect(el.getBoundingClientRect()));};
  measure();const t=window.setTimeout(measure,450);window.addEventListener('scroll',measure,true);window.addEventListener('resize',measure);
  return()=>{cancelAnimationFrame(raf);clearTimeout(t);window.removeEventListener('scroll',measure,true);window.removeEventListener('resize',measure);};},[i]);
 useEffect(()=>{card.current?.focus();if(motionOK()&&card.current)gsap.fromTo(card.current,{opacity:0,y:8},{opacity:1,y:0,duration:.25,ease:'power2.out'});},[i]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')finish();else if(e.key==='ArrowRight'||e.key==='Enter'){e.preventDefault();if(last)finish();else setI(n=>n+1);}else if(e.key==='ArrowLeft'){e.preventDefault();setI(n=>Math.max(0,n-1));}};
  window.addEventListener('keydown',key);document.body.classList.add('touring');return()=>{window.removeEventListener('keydown',key);document.body.classList.remove('touring');};},[last]);

 // The card sits below the spotlight, or above it, or at the bottom of the screen when the part is tall.
 const pad=8,vw=innerWidth,vh=innerHeight,w=Math.min(380,vw-32),phone=vw<=650,bottomGap=phone?96:24;
 let style:React.CSSProperties={left:(vw-w)/2,width:w,top:vh/2-110};
 if(rect){const below=vh-rect.bottom,above=rect.top,left=Math.min(Math.max(16,rect.left+rect.width/2-w/2),vw-w-16);
  if(below>260)style={left,width:w,top:rect.bottom+pad+12};else if(above>260)style={left,width:w,bottom:vh-rect.top+pad+12};else style={left:(vw-w)/2,width:w,bottom:bottomGap};}
 return createPortal(<div className="tour-root">
  {rect?<div className="tour-spot" style={{top:rect.top-pad,left:rect.left-pad,width:rect.width+pad*2,height:rect.height+pad*2}}/>:<div className="tour-veil"/>}
  <div ref={card} className="tour-card" style={style} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body" tabIndex={-1}>
   <img className="tour-guide" src="/art/dog/bond-sit.webp" alt=""/>
   <button type="button" className="icon-button tour-close" aria-label="Skip the tour" onClick={finish}><X size={16}/></button>
   <p className="tour-step">{i+1} of {stops.length}</p>
   <h2 id="tour-title">{stop.title}</h2>
   <p id="tour-body">{stop.body}</p>
   <div className="tour-actions">
    <span className="tour-dots" aria-hidden="true">{stops.map((_,n)=><i key={n} className={n===i?'on':n<i?'past':''}/>)}</span>
    {i>0&&<button type="button" className="button secondary" onClick={()=>setI(i-1)}><ArrowLeft size={15}/>Back</button>}
    <button type="button" className="button" onClick={()=>last?finish():setI(i+1)}>{i===0?'Start':last?'Done':'Next'}{!last&&<ArrowRight size={15}/>}</button>
   </div>
   {i===0&&<button type="button" className="text-button tour-skip" onClick={finish}>Skip for now</button>}
  </div>
 </div>,document.body);
}

export function TourSetting(){
 return <section className="settings-section"><h2>Guide</h2><p className="muted">A one-minute walk through Today: your frog, tasks, promises, the check-in, and where everything lives. You can also press ? anywhere.</p><button type="button" className="button" onClick={startTour}>Take the tour</button></section>;
}
