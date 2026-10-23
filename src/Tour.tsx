// A short guided tour of Today, like a game's first-run walkthrough: each stop spotlights one part of the screen
// with a card that says what it is for. It runs once by itself; "Take the tour" in Settings, "Show me around"
// in the sidebar, or the ? key replays it. Stops whose part is not on screen (Bond on a phone) are skipped.
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {gsap,motionOK} from './motion';
import {ArrowLeft,ArrowRight,X} from './icons';

// One tour per page. Each runs the first time you open its page; ? or "Show me around" replays the one you're on.
export type TourId='today'|'journal'|'progress'|'review'|'board';
export const TOUR_FOR_PAGE:Record<string,TourId>={Today:'today',Journal:'journal',Journey:'progress',Review:'review','Reboot Board':'board'};
export const TOUR_NAMES:Record<TourId,string>={today:'Today',journal:'Journal and reviews',progress:'Your line',review:'Weekly and monthly review',board:'Reboot Board'};
const keyOf=(id:TourId)=>id==='today'?'reboot-tour-v1':`reboot-tour-${id}`;
export const TOUR_KEYS=(['today','journal','progress','review','board'] as TourId[]).map(keyOf);
export const tourSeen=(id:TourId='today')=>{try{return localStorage.getItem(keyOf(id))==='done';}catch{return true;}};
const markSeen=(id:TourId)=>{try{localStorage.setItem(keyOf(id),'done');}catch{/* private browsing: it may show again next visit */}};
// With no id, the tour for whatever page is open.
export const startTour=(id?:TourId)=>window.dispatchEvent(new CustomEvent('reboot-tour',{detail:id}));

type Stop={targets?:string[];title:string;body:string;optional?:boolean};
const TOURS:Record<TourId,Stop[]>={
 today:[
  {title:'Welcome to Reboot',body:'A one-minute tour of how a day works here. Everything stays private on this device.'},
  {targets:['.routine'],title:'Today’s routine',body:'The few things worth doing every day, in order. Each ticks itself off when you do it, and “Show me” takes you there. Weekly and monthly reviews join it when they’re due.'},
  {targets:['.today-head .rh-statement'],title:'Who you’re becoming',body:'Your one sentence, with real counts underneath: promises kept, streaks, shots taken. Nothing here is estimated.'},
  {targets:['.frog-card','.frog-pick','.today-list .todo-add'],title:'Eat your frog first',body:'Pick the task you’d most like to put off. It goes to the top, and you do it first. Break it into small slices, or tap “Eat it now” for a focus timer.'},
  {targets:['.today-list .todo-add'],title:'The rest of today',body:'Add what else today needs. Tap the A–E chip to set a priority: A must, B should, C nice to do, D hand it off, E drop it. The list sorts itself A to E.'},
  {targets:['.promises'],title:'Your promises',body:'The habits you’ve turned on. Tap Mark done each day. A gold note means today keeps a streak going; weekly ones show their count.'},
  {targets:['.checkin .mood-row','.checkin'],title:'How was today?',body:'One tap sets your mood and marks the day on your Journey line. Add one line for your journal, and one win or shot you took.'},
  {targets:['.tabbar','.sidebar nav'],title:'Four places',body:'Today is home. Journal is for writing, including weekly and monthly reviews. Progress holds your line and the review. The Board has all 36 goals from May.'},
  {targets:['.topbar-settings','.sidebar .nav-settings'],title:'Settings and reminders',body:'Set your frog reminders here, so your phone’s calendar nudges you each morning and evening. Bond and backups live here too.'},
  {targets:['.pocket-pet .pet-frame'],title:'This is Bond',body:'He follows your cursor and sprints wherever you click. He covers his eyes while you write. Tap him for a reminder of a real win.',optional:true},
  {title:'You’re all set',body:'Start with your routine. Each page has its own short tour the first time you open it. Replay any of them with ?, “Show me around”, or Settings → Guide.'},
 ],
 journal:[
  {title:'Your journal',body:'A private book, one page a day. Here’s how it works.'},
  {targets:['.date-strip .week-row','.date-strip'],title:'Pick a day',body:'This week runs across the top. A dot shows a day you wrote, in that day’s mood colour. Tap the month name to see the whole month.'},
  {targets:['.room-tabs'],title:'Daily, weekly, monthly',body:'Daily is today’s page. Weekly review and Monthly review are a page for the whole week or month, with their own questions: what improved, what didn’t, what you’ll change.',optional:true},
  {targets:['.verso .mood-picker','.verso'],title:'How it felt, and a nudge',body:'Mark your mood, and tap a question if you need somewhere to start. Your mood also marks the day on your Journey line.'},
  {targets:['.recto .writing-area','.recto'],title:'Just write',body:'Write it the way you would to a friend. It saves as you type, and writing anything counts toward “Write a journal”.'},
  {targets:['.past-pages'],title:'Past pages',body:'Every entry, newest first. Search them, or filter by mood.'},
 ],
 progress:[
  {title:'Your line',body:'How your days have moved you: doubt, small wins, restarts, breakthroughs. It is uneven on purpose.'},
  {targets:['.progress-tabs'],title:'Line and review',body:'Two views of your progress. This one is your line; Review has your weekly and monthly numbers.'},
  {targets:['.chart-frame'],title:'Mark a moment',body:'Tap in today’s column to add a moment: higher for a step forward, lower for a setback. Drag a dot to adjust it. Your check-in on Today marks it too.'},
  {targets:['.composer'],title:'Say what happened',body:'Pick how it moved you, add a line and an optional label like “Small win” or “Restart”.',optional:true},
  {targets:['.journey-log'],title:'Your journey log',body:'Everything you’ve marked, newest first. Rereading it on a hard day is the point.',optional:true},
 ],
 review:[
  {title:'Weekly and monthly review',body:'A calm look back, using only what you actually recorded. None of it is a score.'},
  {targets:['#main .board-topline .segmented'],title:'Week, month or year',body:'Switch the period. Everything below follows it.'},
  {targets:['#main .board-topline .button'],title:'Write the review',body:'Opens a journal page for this week or month with three questions: what improved, what didn’t, what you’ll change.'},
  {targets:['.review-summary'],title:'The numbers',body:'Promises kept, misses, shots taken, targets reached, and days on your line, for the period you picked.'},
  {targets:['.period-comparison'],title:'Compared with last time',body:'The same window of the previous period, side by side.',optional:true},
 ],
 board:[
  {title:'Reboot Board',body:'Your 36 commitments from May, as a bingo card.'},
  {targets:['.board-tally'],title:'Where you stand',body:'Stamped, in motion and waiting, plus the square closest to its stamp.'},
  {targets:['.bingo-card'],title:'The card',body:'Tints show the rings: outer is easier, the centre four hardest. Active squares fill with ink as they progress; finished ones get a seal. Tap any square to open it.'},
  {targets:['#main .board-topline .segmented'],title:'Board, list, week',body:'List shows every goal with its numbers. Week is a grid of this week’s days for your habits.'},
  {targets:['.filters'],title:'Find and filter',body:'Search by name, or filter by status and type.',optional:true},
 ],
};

const visible=(el:Element)=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden';};
const find=(s:Stop)=>s.targets?.map(q=>document.querySelector(q)).find((el):el is Element=>!!el&&visible(el))??null;

export function Tour({which,onClose}:{which:TourId;onClose:()=>void}){
 const stops=useRef(TOURS[which].filter(s=>!s.optional||find(s))).current;
 const [i,setI]=useState(0),[rect,setRect]=useState<DOMRect|null>(null),card=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 const stop=stops[i],last=i===stops.length-1;
 const finish=()=>{markSeen(which);close.current();};
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

