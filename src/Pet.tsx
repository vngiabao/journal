// Pocket Bond: a chibi of Bond, who lives on the bottom edge of the page on a computer.
// He walks after your cursor, sprints to wherever you click and sniffs the spot, covers his eyes while you write,
// tilts his head while you type, jumps for the promises you keep, and lies down, then curls up asleep, when you step away.
// He never blocks anything: he ignores the pointer, and taps on him are found by position instead.
import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {ChibiPose} from './Art';
import {gsap} from './motion';
import type {State} from './model';
import {promisesKept} from './engine';
import {label} from './dates';
import {burst,inkDrop,isInteractive} from './delight';
import {FLAGS,markFlag} from './flags';

export type Cheer={pose:ChibiPose;text:string;key:number};
export type Dog='bond';
type Choice='bond'|'off';
type Frame='sit'|'walk'|'run'|'cover'|'peek'|'tilt'|'sniff'|'jump'|'cheer'|'lie'|'sleep';
type Mood='follow'|'think'|'private'|'peek'|'rest'|'sleep'|'talk'|'cheer'|'sniff';
// Which drawing each mood uses while standing still. Walking and running are handled by movement.
const STILL:Record<Mood,Frame>={follow:'sit',think:'tilt',private:'cover',peek:'peek',rest:'lie',sleep:'sleep',talk:'jump',cheer:'jump',sniff:'sniff'};
const FRAMES=['sit','walk-a','walk-b','run','cover','peek','tilt','sniff','jump','cheer','lie','sleep'];
const art=(dog:Dog,f:string)=>`/art/dog/${dog}-${f}.webp`;
const KEY='reboot-pocket-pet',ROOMY='(hover:hover) and (pointer:fine) and (min-width: 1000px)',QUIET='(prefers-reduced-motion: reduce)',W=84;
const REST_AFTER=45_000,SLEEP_AFTER=150_000;
// He is a layer of delight, never in the way. He keeps out of the places where you read or write: the ritual card,
// the frog card, the list and training cards, the board (its card, tiles and tables), the sidebar, the Bond strip, any
// field, and any words, buttons or pictures along the bottom edge. If there is no room left on the floor, he steps out
// of view until there is. While a Bond milestone is on screen he waits off stage, so there is only ever one Bond cheering.
const FIELDS='input:not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable="true"]';
const AVOID=`.ritual-card,.frog-card,.today-list,.training,.bingo-card,.goal-tile,.table-scroll,.daily-ticks,.promises,.today-quote,.ritual-note,.bond-line,.sidebar,.bond-strip,${FIELDS}`;
// His speech bubble must not sit over a field, the sidebar, the cards he walks around (it rides higher than he does),
// or any words, controls or pictures.
const BUBBLE_AVOID=`.ritual-card,.frog-card,.sidebar,.bond-strip,${FIELDS}`;
// A card reaching into the bottom BAND px pushes him aside. Words, controls and pictures count when they are level
// with him (his 88px drawing, ears to paw prints): from BODY_TOP px above the bottom edge down to BODY_BOTTOM px above it.
const BAND=100,BODY_TOP=92,BODY_BOTTOM=4,GAP=6;
export type Span=[number,number];
export type Box={left:number;right:number;top:number;bottom:number;width:number;height:number};
const overlaps=(a:Box,b:Box)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
// Anything you read or press: a control, a picture, or an element with its own words.
const PRESSABLE='button,a[href],input,textarea,select,label,[role=button],img,svg,canvas,video';
// The stretches of floor (left edge x, from lo to hi) where he can stand without covering a card or any words.
// Pure geometry, so it is tested on its own: a card cuts out wherever his 84px frame would overlap it, words cut
// out where his frame would come within GAP px of them (room for a squash or a hover lift).
export function freeSpans(lo:number,hi:number,vh:number,cards:Box[],words:Box[]):Span[]{
 let spans:Span[]=hi>=lo?[[lo,hi]]:[];
 const cut=(a:number,b:number)=>{spans=spans.flatMap(([s,e]):Span[]=>e<=a||s>=b?[[s,e]]:[...(s<a?[[s,a] as Span]:[]),...(e>b?[[b,e] as Span]:[])]);};
 for(const r of cards)if(r.width&&r.height&&r.bottom>vh-BAND&&r.top<vh)cut(r.left-W,r.right);
 for(const r of words)if(r.width&&r.height&&r.bottom>vh-BODY_TOP&&r.top<vh-BODY_BOTTOM)cut(r.left-W-GAP,r.right+GAP);
 return spans;
}
// The words, controls and pictures inside a strip of the window: the line boxes of each element's own text, and whole
// controls and pictures. Reads only. It walks the page from the top and skips any block that lies wholly outside the
// strip, so it touches only the few elements near it. Elements matching `skip` are left out with all they hold.
function wordsIn(top:number,bottom:number,left:number,right:number,skip:string):Box[]{
 const words:Box[]=[],range=document.createRange();
 const visit=(el:Element)=>{
  if(el.matches(skip))return;
  const r=el.getBoundingClientRect(),area=r.width>0&&r.height>0;
  // Zero-size boxes such as display:contents wrappers are walked through; tiny screen-reader-only boxes are skipped.
  if(area&&(r.bottom<=top||r.top>=bottom||r.right<=left||r.left>=right||(r.width<=1&&r.height<=1)))return;
  if(el.matches(PRESSABLE)){if(area)words.push(r);return;}
  for(const n of el.childNodes){
   if(n.nodeType===3){if(n.textContent?.trim()){range.selectNodeContents(n);for(const q of range.getClientRects())words.push(q);}}
   else if(n.nodeType===1)visit(n as Element);}
 };
 visit(document.body);
 return words;
}
// Reads the page once and returns his floor. Reads only, no writes, so the layout is computed at most once.
function readFloor():{lo:number;spots:Span[]}{
 const vh=innerHeight,vw=innerWidth,side=document.querySelector('.sidebar')?.getBoundingClientRect(),lo=(side?.right??0)+12;
 if(document.querySelector('.bond-moment'))return {lo,spots:[]};
 const cards=[...document.querySelectorAll(AVOID)].map(el=>el.getBoundingClientRect());
 const words=wordsIn(vh-BODY_TOP,vh-BODY_BOTTOM,lo-W-GAP,vw,`.pocket-pet,.paw-print,${AVOID}`);
 return {lo,spots:freeSpans(lo,vw-W-16,vh,cards,words)};
}
// Page changes that cannot move anything he avoids: his own nodes, and the decorative layers (paw prints, ink drops,
// confetti) that delight.ts and pawPrint add straight to the body, all aria-hidden.
function decorative(n:Node|null){
 let el=n instanceof Element?n:n?.parentElement??null;if(!el)return true;if(el.closest('.pocket-pet'))return true;
 while(el.parentElement&&el.parentElement!==document.body)el=el.parentElement;
 return el.getAttribute('aria-hidden')==='true';
}
export function onlyDecorative(records:MutationRecord[]){
 return records.every(r=>r.type==='childList'&&r.target===document.body?[...r.addedNodes,...r.removedNodes].every(n=>n instanceof Element&&(n.matches('.pocket-pet,.paw-print')||n.getAttribute('aria-hidden')==='true')):decorative(r.target));
}
const nearest=(spans:Span[],x:number)=>{let best:number|null=null;for(const [s,e] of spans){const c=Math.min(e,Math.max(s,x));if(best===null||Math.abs(c-x)<Math.abs(best-x))best=c;}return best;};

let remembered:Choice|null=null;
export function petChoice():Choice{if(remembered)return remembered;try{const v=localStorage.getItem(KEY);if(v==='off'||(!v&&localStorage.getItem('reboot-pocket-bao')==='off'))return 'off';}catch{/* storage blocked */}return 'bond';}
export function setPetChoice(v:Choice){remembered=v;try{localStorage.setItem(KEY,v);}catch{/* private browsing: the choice lasts for this visit */}window.dispatchEvent(new Event('reboot-pet'));}
function subscribe(cb:()=>void){const a=window.matchMedia(ROOMY),b=window.matchMedia(QUIET);a.addEventListener('change',cb);b.addEventListener('change',cb);window.addEventListener('reboot-pet',cb);window.addEventListener('storage',cb);
 return()=>{a.removeEventListener('change',cb);b.removeEventListener('change',cb);window.removeEventListener('reboot-pet',cb);window.removeEventListener('storage',cb);};}
// The dogs come out only where there is room for them: a mouse, a wide screen, and motion welcome.
const roomy=()=>window.matchMedia(ROOMY).matches&&!window.matchMedia(QUIET).matches;
export const usePocketPets=()=>useSyncExternalStore(subscribe,()=>roomy()?petChoice():'off',()=>'off' as Choice);

// What a dog "says" when you tap it: something true about you, from your own records.
function evidence(state:State,now:string){
 const proofs=state.proofs,kept=promisesKept(state,now);
 if(proofs.length&&(Math.random()<.7||!kept)){const p=proofs[Math.floor(Math.random()*proofs.length)],t=p.text.length>90?p.text.slice(0,88).trimEnd()+'…':p.text;
  return `${label(p.date,{month:'short',day:'numeric'})}: “${t}” ${p.kind==='win'?'You did that.':p.kind==='attempt'?'You took that shot.':'You learned that.'}`;}
 if(kept)return `${kept} ${kept===1?'promise':'promises'} kept so far. That’s not luck, that’s you.`;
 const lines=['Start small. One promise today is enough.','Write down one win, however small. I’ll guard it.','Tap a square on the board. We begin there.'];
 return lines[Math.floor(Math.random()*lines.length)];
}

function pawPrint(cx:number,face:number,upper:boolean){
 const p=document.createElement('i');p.className='paw-print';p.setAttribute('aria-hidden','true');
 p.style.left=`${cx}px`;p.style.bottom=`${upper?13:6}px`;p.style.transform=`rotate(${face*90}deg)`;document.body.appendChild(p);
 // From the stylesheet's .32 to nothing, given explicitly so GSAP never has to read the style back.
 gsap.fromTo(p,{opacity:.32},{opacity:0,duration:1.5,delay:.6,ease:'enter',onComplete:()=>p.remove()});
}

type Pos={x:number;face:number};
function PocketDog({dog,state,now,cheer,onCheerDone,lead,pos,speaks}:{dog:Dog;state:State;now:string;cheer:Cheer|null;onCheerDone?:()=>void;lead?:{current:Pos};pos:{current:Pos};speaks:boolean}){
 const root=useRef<HTMLDivElement>(null),hop=useRef<HTMLDivElement>(null);
 const [mood,setMoodState]=useState<Mood>('follow'),[move,setMove]=useState<'still'|'walk'|'run'>('still'),[bubble,setBubble]=useState<{text:string;key:number;side:'l'|'r'}|null>(null);
 // He starts out of view and steps in once the first look at the page has found him room.
 const live=useRef({target:window.innerWidth-W-48-(lead?90:0),running:false,px:null as number|null,lastActive:performance.now(),mood:'follow' as Mood,trail:0,upper:false,away:true,spots:[] as Span[],lo:0});
 const [away,setAway]=useState(true);
 const timers=useRef({bubble:0,mood:0}),latest=useRef({state,now,onCheerDone});latest.current={state,now,onCheerDone};
 const api=useRef({setMood:(_m:Mood)=>{},say:(_t:string,_ms?:number)=>{},jump:(_h?:number,_n?:number)=>{},lookNow:():boolean=>false});
 api.current.setMood=m=>{live.current.mood=m;setMoodState(m);};
 api.current.say=(text,ms=2600)=>{if(!speaks||live.current.away)return;clearTimeout(timers.current.bubble);setBubble({text,key:Date.now(),side:pos.current.x+W/2>window.innerWidth*.6?'r':'l'});timers.current.bubble=window.setTimeout(()=>setBubble(null),ms);};
 api.current.jump=(h=16,n=1)=>{const el=hop.current;if(!el)return;gsap.timeline({overwrite:true,delay:lead?.12:0})
  .to(el,{scaleY:.84,scaleX:1.12,duration:.1,ease:'power1.out',transformOrigin:'50% 100%'})
  .to(el,{y:-h,scaleY:1.08,scaleX:.94,duration:.2,ease:'power2.out',yoyo:true,repeat:n*2-1})
  .to(el,{y:0,scaleY:1,scaleX:1,duration:.4,ease:'elastic.out(1,.4)'});};

 // Preload every frame so pose changes never flash.
 useEffect(()=>{for(const f of FRAMES){const i=new Image();i.src=art(dog,f);}},[dog]);

 useEffect(()=>{
  const el=root.current!,L=live.current,P=pos.current,a=api.current,setX=gsap.quickSetter(el,'x','px');
  const clampX=(v:number)=>gsap.utils.clamp(L.lo,window.innerWidth-W-16,v);
  const free=()=>L.mood==='follow'||L.mood==='think';
  const canMove=()=>L.running?L.mood!=='private':free();
  const touring=()=>document.body.classList.contains('touring');
  const settle=(m:Mood,after:number)=>{clearTimeout(timers.current.mood);timers.current.mood=window.setTimeout(()=>a.setMood(m),after);};
  const wake=()=>{const was=L.mood;a.setMood('follow');look(0);if(was==='sleep'){a.jump(10);a.say('Oh! You’re back.',1800);}};
  let shown:'still'|'walk'|'run'='still';
  const show=(m:'still'|'walk'|'run')=>{if(m!==shown){shown=m;setMove(m);}};
  // Where on the floor is he allowed to be? Worked out only when the page changes (a scroll, a resize, cards coming
  // and going), never in the frame loop. The answer is applied here; the frame loop below only writes.
  const place=({lo,spots}:{lo:number;spots:Span[]})=>{
   L.lo=lo;L.spots=spots;const here=nearest(spots,P.x),gone=here===null;
   if(gone!==L.away){L.away=gone;setAway(gone);if(gone)setBubble(null);
    // Back in view (or arriving): he steps in where there is room rather than walking across what he avoids.
    else{P.x=here!;L.target=nearest(spots,L.target)??here!;L.running=false;}}
   // His spot got covered: he trots to the nearest room. A hair's breadth is simply corrected.
   else if(!gone&&Math.abs(here-P.x)>2){L.target=here;L.running=true;}else if(!gone)P.x=here;};
  // Looking is skipped while nobody would see the answer: he is resting or asleep, the tab is hidden, the tour holds
  // him still, or motion is reduced (then he isn't shown at all). Waking up or coming back looks again straight away.
  const reduced=window.matchMedia(QUIET);
  const due=()=>!document.hidden&&L.mood!=='rest'&&L.mood!=='sleep'&&!reduced.matches&&!touring();
  const ric=(cb:()=>void):{idle?:number;timer?:number}=>typeof window.requestIdleCallback==='function'?{idle:window.requestIdleCallback(cb,{timeout:250})}:{timer:window.setTimeout(cb,1)};
  let wait=0,first=0,again=0,job:{idle?:number;timer?:number}|null=null;
  const run=()=>{job=null;first=0;if(due())place(readFloor());};
  // Debounced: a burst of changes (a scroll, typing into the list) gives one look ~200ms after it ends, and at least
  // one look every 600ms while it goes on. The read itself waits for an idle moment.
  function look(delay=200){
   clearTimeout(wait);if(!due()||job)return;const t=performance.now();if(!first)first=t;
   wait=window.setTimeout(()=>{job=ric(run);},Math.max(0,Math.min(delay,first+600-t)));}
  // Cards rise in and settle after they are added, so a change also earns a second look once things have settled.
  const changed=()=>{look();clearTimeout(again);again=window.setTimeout(()=>look(0),800);};
  const mo=new MutationObserver(records=>{if(!onlyDecorative(records))changed();});
  mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden','open']});
  const ro=new ResizeObserver(()=>changed());ro.observe(document.body);
  const scroll=()=>look();
  const visible=()=>{if(!document.hidden)look(0);};
  let lastX=NaN;
  const tick=(_t:number,dt:number)=>{
   // A follower trots a step behind the lead dog instead of chasing the pointer.
   if(lead&&!L.running&&free())L.target=lead.current.x-lead.current.face*78;
   // He stays put while the guided tour is open, so its spotlight can find him.
   // While he is out of view he waits where he is; he is placed on free floor when he steps back in.
   if(touring()||L.away){if(shown!=='still'){L.running=false;show('still');}}
   else{
    // He stays on his own stretch of floor: never walks across a card to reach the cursor.
    const span=L.spots.find(([s,e])=>P.x>=s-1&&P.x<=e+1);
    if(span)L.target=Math.min(span[1],Math.max(span[0],L.target));
    const dx=clampX(L.target)-P.x;
    if(canMove()&&Math.abs(dx)>(lead?6:2)){const step=Math.sign(dx)*Math.min(Math.abs(dx),(L.running?6.5:3.4)*dt/16.67);P.x+=step;L.trail+=Math.abs(step);
     show(L.running?'run':'walk');const f=Math.sign(dx);if(f!==P.face){P.face=f;el.dataset.face=f>0?'r':'l';}
     // Paw prints only land on his own floor: never on a card, words or a control he crosses to reach room.
     if(L.running&&L.trail>36){L.trail=0;L.upper=!L.upper;if(span&&P.x>=span[0]-1&&P.x<=span[1]+1)pawPrint(P.x+W/2+(L.upper?6:-6),P.face,L.upper);}}
    // Arrived (or already there): a sprint always ends here, so a run that was too short to take a step never leaves
    // him deaf to the cursor.
    else{const ran=L.running&&shown!=='still';L.running=false;if(shown!=='still'){show('still');
     // Arriving somewhere you tapped: a good sniff first.
     if(ran&&free()){a.setMood('sniff');settle('follow',1300);}
     // Then back to your cursor, which he ignored while he ran.
     if(ran)heel();}}}
   // Writes only, and only when he has moved.
   if(P.x!==lastX){lastX=P.x;setX(P.x);}};
  // Taps on him are found by position, so the pointer is only measured against him near the bottom edge.
  const hit=(x:number,y:number)=>{if(L.away||y<window.innerHeight-150)return false;const r=el.querySelector('.pet-frame')?.getBoundingClientRect();return !!r&&x>=r.left+8&&x<=r.right-8&&y>=r.top+10&&y<=r.bottom;};
  let hovering=false;
  // He keeps walking toward your cursor wherever it is, and stops just beside it rather than underneath.
  function heel(){if(lead||L.px===null||L.mood==='private')return;const side=L.px>P.x+W/2?-1:1;L.target=L.px+side*58-W/2;}
  const pointer=(e:PointerEvent)=>{
   L.lastActive=performance.now();if(L.mood==='rest'||L.mood==='sleep')wake();
   L.px=e.clientX;if(!L.running)heel();
   const inside=hit(e.clientX,e.clientY);if(!inside&&!hovering)return;hovering=inside;
   const under=inside?document.elementFromPoint(e.clientX,e.clientY):null;
   el.classList.toggle('is-hover',inside&&!isInteractive(under));el.classList.toggle('is-ghost',inside&&isInteractive(under));};
  const tap=()=>{markFlag(FLAGS.bond);a.setMood('talk');a.jump(20);a.say(evidence(latest.current.state,latest.current.now),4200);settle('follow',2000);};
  const click=(e:MouseEvent)=>{const t=e.target instanceof Element?e.target:null;
   if(hit(e.clientX,e.clientY)&&!isInteractive(t)){tap();return;}
   // Any click sends him sprinting to the spot, leaving paw prints; on empty paper the spot gets a drop of ink too.
   if(L.mood==='private')return;if(L.mood==='rest'||L.mood==='sleep')wake();
   L.target=e.clientX-W/2;L.running=true;
   if(t&&!isInteractive(t)&&t.matches('main,.main-shell,.app,.page-footer,body'))inkDrop(e.clientX,e.clientY);};
  const focusIn=(e:FocusEvent)=>{const t=e.target instanceof Element?e.target:null;if(!t)return;
   if(t.matches('.writing-area')){clearTimeout(timers.current.mood);a.setMood('private');a.say('Not peeking. Promise.',2000);}
   else if(t.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=date]):not([type=file]):not([type=time])')&&['follow','rest','sleep','sniff'].includes(L.mood))a.setMood('think');};
  const focusOut=(e:FocusEvent)=>{const t=e.target instanceof Element?e.target:null;if(!t)return;
   if(t.matches('.writing-area')&&L.mood==='private'){a.setMood('peek');a.say('All yours. I didn’t read a word.',2200);settle('follow',1400);}
   else if(L.mood==='think')a.setMood('follow');};
  const key=()=>{L.lastActive=performance.now();if(L.mood==='rest'||L.mood==='sleep')wake();};
  const resize=()=>{P.x=clampX(P.x);L.target=clampX(L.target);look();};
  const idle=window.setInterval(()=>{const quiet=performance.now()-L.lastActive;if(L.mood==='follow'&&quiet>REST_AFTER)a.setMood('rest');else if(L.mood==='rest'&&quiet>SLEEP_AFTER+(lead?8000:0))a.setMood('sleep');},4000);
  // A Bond cheer needs the answer right now: the page may have just changed (a ritual card giving way to the doing view).
  a.lookNow=()=>{place(readFloor());return !L.away;};
  gsap.ticker.add(tick);look(0);
  document.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('click',click);document.addEventListener('focusin',focusIn);document.addEventListener('focusout',focusOut);window.addEventListener('keydown',key);window.addEventListener('resize',resize);
  document.addEventListener('scroll',scroll,{passive:true,capture:true});document.addEventListener('visibilitychange',visible);
  return()=>{gsap.ticker.remove(tick);clearInterval(idle);clearTimeout(timers.current.bubble);clearTimeout(timers.current.mood);clearTimeout(wait);clearTimeout(again);
   if(job?.idle!==undefined)window.cancelIdleCallback(job.idle);if(job?.timer!==undefined)clearTimeout(job.timer);mo.disconnect();ro.disconnect();a.lookNow=()=>false;
   document.removeEventListener('pointermove',pointer);document.removeEventListener('click',click);document.removeEventListener('focusin',focusIn);document.removeEventListener('focusout',focusOut);window.removeEventListener('keydown',key);window.removeEventListener('resize',resize);
   document.removeEventListener('scroll',scroll,{capture:true});document.removeEventListener('visibilitychange',visible);};
 },[]);

 // Promises kept: a happy jump. A finished goal or a bingo: up on the hind legs, with confetti.
 const [bigCheer,setBigCheer]=useState(false);
 const celebrate=(text:string,big:boolean,done?:()=>void)=>{const a=api.current;setBigCheer(big);
  clearTimeout(timers.current.mood);a.setMood('cheer');a.say(text,big?3400:2400);a.jump(big?26:14,big?3:1);
  if(big&&speaks){const r=hop.current?.getBoundingClientRect();if(r)burst(r.left+r.width/2,r.top+12,44);}
  timers.current.mood=window.setTimeout(()=>{a.setMood('follow');done?.();},big?3400:2400);};
 useEffect(()=>{if(!cheer)return;celebrate(cheer.text,cheer.pose==='bingo',()=>latest.current.onCheerDone?.());},[cheer?.key]);
 // Bond's journey (src/bond) asks him to cheer for a finished ritual or a milestone.
 // While he has stepped out of view he lets the moment go, and the caller shows its own note instead.
 useEffect(()=>{const on=(e:Event)=>{const d=(e as CustomEvent<{text:string;big:boolean;taken?:boolean}>).detail;if(!d||!speaks)return;
  // Look again right now: the page may have just changed (a ritual card giving way to the doing view).
  // If he has room he is placed on it at once, so the cheer happens where he stands.
  const L=live.current,P=pos.current;if(!api.current.lookNow())return;
  const here=nearest(L.spots,P.x);if(here!==null&&Math.abs(here-P.x)>1){P.x=here;L.target=here;L.running=false;}
  d.taken=true;celebrate(d.text,d.big);};
  window.addEventListener('reboot-bond-cheer',on);return()=>window.removeEventListener('reboot-bond-cheer',on);},[]);

 const big=mood==='cheer'&&bigCheer,walking=move!=='still'&&!['private','rest','sleep','peek'].includes(mood);
 const frame:Frame=walking?(move==='run'?'run':'walk'):big?'cheer':STILL[mood];
 // Every change of pose lands with a little squash, like a flip-book frame.
 const first=useRef(true);
 useEffect(()=>{if(first.current){first.current=false;return;}if(frame==='walk'||frame==='run')return;const img=hop.current?.querySelector('.pet-frame');if(img)gsap.fromTo(img,{scaleY:.9,scaleX:1.06},{scaleY:1,scaleX:1,duration:.45,ease:'elastic.out(1,.45)',transformOrigin:'50% 100%',clearProps:'transform'});},[frame]);

 // The bubble finds a place where it covers nothing you'd read or press: inside the window, clear of the sidebar,
 // on whichever side is free. If neither side is, the bubble hides and the words are only heard. Screen readers hear
 // them from a live region that stays mounted and only changes its text (a status region that arrives already
 // holding its words may never be announced); the drawn bubble is hidden from them so nothing is read twice.
 const bubbleRef=useRef<HTMLParagraphElement>(null),[spot,setSpot]=useState<{key:number;side:'l'|'r';nudge:number;quiet:boolean}|null>(null);
 useLayoutEffect(()=>{const b=bubbleRef.current;if(!b||!bubble)return;
  const place=(side:'l'|'r')=>{b.classList.remove('side-l','side-r','is-quiet');b.classList.add(`side-${side}`);b.style.removeProperty('--nudge');
   // Sized by its layout box, not the pop-in transform, so the check uses where it will settle.
   const raw=b.getBoundingClientRect(),w=b.offsetWidth,h=b.offsetHeight,cx=(raw.left+raw.right)/2,bottom=(raw.top+raw.bottom)/2+h/2;
   const left=cx-w/2,lo=live.current.lo,hi=window.innerWidth-12,nudge=Math.round(left<lo?lo-left:left+w>hi?hi-(left+w):0);
   const r=new DOMRect(left+nudge-6,bottom-h-6,w+12,h+12);
   const clear=![...document.querySelectorAll(BUBBLE_AVOID)].some(el=>{if(root.current?.contains(el))return false;const q=el.getBoundingClientRect();return q.width>0&&q.height>0&&overlaps(r,q);})
    &&!wordsIn(r.top,r.bottom,r.left,r.right,`.pocket-pet,.paw-print,${BUBBLE_AVOID}`).some(q=>q.width>0&&q.height>0&&overlaps(r,q));
   return clear?{key:bubble.key,side,nudge,quiet:false}:null;};
  setSpot(place(bubble.side)??place(bubble.side==='l'?'r':'l')??{key:bubble.key,side:bubble.side,nudge:0,quiet:true});
 },[bubble?.key]);
 const at=spot&&bubble&&spot.key===bubble.key?spot:null;

 return <div ref={root} className={`pocket-pet dog-${dog} is-${mood} move-${walking?move:'still'} ${away?'is-away':''}`} data-face="l" aria-hidden={away||undefined}>
  {bubble&&<p ref={bubbleRef} key={bubble.key} className={`pb-bubble side-${at?.side??bubble.side} ${at?.quiet?'is-quiet':''}`} style={at?.nudge?{['--nudge' as string]:`${at.nudge}px`}:undefined} aria-hidden="true">{bubble.text}</p>}
  {speaks&&<p className="visually-hidden" role="status">{bubble?.text??''}</p>}
  <div className="pb-face"><div ref={hop} className="pb-hop">
   {frame==='walk'?<span className="pet-frame pet-walk"><img src={art(dog,'walk-a')} alt=""/><img src={art(dog,'walk-b')} alt=""/></span>:<img className="pet-frame" src={art(dog,frame)} alt=""/>}
  </div></div>
  {mood==='sleep'&&<span className="pb-z" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>}
  <span className="pb-shadow" aria-hidden="true"/>
 </div>;
}

// One dog, or the Shiba leading with the Samoyed a step behind.
export function PocketPets({choice,state,now,cheer,onCheerDone}:{choice:Choice;state:State;now:string;cheer:Cheer|null;onCheerDone:()=>void}){
 const leadPos=useRef<Pos>({x:window.innerWidth+20,face:-1});
 if(choice==='off')return null;
 return <>
  <PocketDog key="bond" dog="bond" state={state} now={now} cheer={cheer} onCheerDone={onCheerDone} pos={leadPos} speaks/>
 </>;
}

export function PetSetting(){
 const choice=useSyncExternalStore(subscribe,petChoice,()=>'bond' as Choice);
 return <section className="settings-section"><h2>Bond</h2>
  <label className="checkbox-label"><input type="checkbox" checked={choice==='bond'} onChange={e=>setPetChoice(e.target.checked?'bond':'off')}/>Let Bond walk along the bottom of the page</label>
  <p className="muted">On a computer, Bond keeps you company: he follows you around, covers his eyes while you write, jumps for the promises you keep, and reminds you of a real win when you tap him. Tap empty space and he runs over. Hidden on phones and when Reduce Motion is on.</p>
 </section>;
}
