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
// the frog card, the sidebar, any field, and any words or buttons along the bottom edge. If there is no room left on
// the floor, he steps out of view until there is. While a Bond milestone is on screen he waits off stage, so there is only ever one Bond cheering.
const AVOID='.ritual-card,.frog-card,.sidebar,.bond-strip,input:not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable="true"]';
// His speech bubble must not sit over a field or the cards he avoids either (it rides higher than he does).
const BUBBLE_AVOID=AVOID;
const BAND=100;
type Span=[number,number];
const overlaps=(a:DOMRect,b:DOMRect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
// Anything you read or press: a control, a picture, or an element with its own words.
const PRESSABLE='button,a[href],input,textarea,select,label,[role=button],img,svg,canvas,video';
function readable(x:number,y:number){
 const el=document.elementFromPoint(x,y);if(!el||el===document.body||el===document.documentElement||el.closest('.pocket-pet'))return false;
 if(el.closest(PRESSABLE))return true;
 for(const n of el.childNodes)if(n.nodeType===3&&n.textContent?.trim())return true;
 return false;
}
// The stretches of floor (left edge x) where he can stand without covering anything he avoids or any words.
const COL=14;
function freeFloor(lo:number,hi:number):Span[]{
 let spans:Span[]=hi>=lo?[[lo,hi]]:[];const top=innerHeight-BAND;
 for(const el of document.querySelectorAll(AVOID)){const r=el.getBoundingClientRect();if(!r.width||!r.height||r.bottom<=top||r.top>=innerHeight)continue;
  const a=r.left-W+6,b=r.right-6;spans=spans.flatMap(([s,e]):Span[]=>e<=a||s>=b?[[s,e]]:[...(s<a?[[s,a] as Span]:[]),...(e>b?[[b,e] as Span]:[])]);}
 // Then the words themselves: a strip of columns across the floor, each tested at his height. He fits where his body
 // (the middle of his 84px frame) only crosses clear columns.
 const out:Span[]=[];
 for(const [s,e] of spans){
  const clear:boolean[]=[];for(let cx=s+10;cx<=e+W-10;cx+=COL)clear.push(![innerHeight-14,innerHeight-42,innerHeight-70].some(y=>readable(cx,y)));
  const span=Math.ceil((W-20)/COL);let run:number|null=null,last=s;
  for(let i=0;i+span<clear.length&&s+i*COL<=e;i++){const ok=clear.slice(i,i+span+1).every(Boolean),x=s+i*COL;
   if(ok){if(run===null)run=x;last=x;}else if(run!==null){out.push([run,last]);run=null;}}
  if(run!==null)out.push([run,last]);
 }
 return out;
}
const floorLeft=()=>(document.querySelector('.sidebar')?.getBoundingClientRect().right??0)+12;
const floorNow=()=>document.querySelector('.bond-moment')?[]:freeFloor(floorLeft(),window.innerWidth-W-16);
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
 gsap.to(p,{opacity:0,duration:1.5,delay:.6,ease:'power1.in',onComplete:()=>p.remove()});
}

type Pos={x:number;face:number};
function PocketDog({dog,state,now,cheer,onCheerDone,lead,pos,speaks}:{dog:Dog;state:State;now:string;cheer:Cheer|null;onCheerDone?:()=>void;lead?:{current:Pos};pos:{current:Pos};speaks:boolean}){
 const root=useRef<HTMLDivElement>(null),hop=useRef<HTMLDivElement>(null);
 const [mood,setMoodState]=useState<Mood>('follow'),[move,setMove]=useState<'still'|'walk'|'run'>('still'),[bubble,setBubble]=useState<{text:string;key:number;side:'l'|'r'}|null>(null);
 const live=useRef({target:window.innerWidth-W-48-(lead?90:0),walking:false,running:false,lastActive:performance.now(),mood:'follow' as Mood,trail:0,upper:false,away:false,spots:[] as Span[],checked:0});
 const [away,setAway]=useState(false);
 const timers=useRef({bubble:0,mood:0}),latest=useRef({state,now,onCheerDone});latest.current={state,now,onCheerDone};
 const api=useRef({setMood:(_m:Mood)=>{},say:(_t:string,_ms?:number)=>{},jump:(_h?:number,_n?:number)=>{}});
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
  const clampX=(v:number)=>gsap.utils.clamp(floorLeft(),window.innerWidth-W-16,v);
  const free=()=>L.mood==='follow'||L.mood==='think';
  const canMove=()=>L.running?L.mood!=='private':free();
  const settle=(m:Mood,after:number)=>{clearTimeout(timers.current.mood);timers.current.mood=window.setTimeout(()=>a.setMood(m),after);};
  const wake=()=>{const was=L.mood;a.setMood('follow');if(was==='sleep'){a.jump(10);a.say('Oh! You’re back.',1800);}};
  let shown:'still'|'walk'|'run'='still';
  const show=(m:'still'|'walk'|'run')=>{if(m!==shown){shown=m;setMove(m);}};
  const tick=(_t:number,dt:number)=>{
   // A follower trots a step behind the lead dog instead of chasing the pointer.
   if(lead&&!L.running&&free())L.target=lead.current.x-lead.current.face*78;
   // He stays put while the guided tour is open, so its spotlight can find him.
   if(document.body.classList.contains('touring')){if(shown!=='still'){L.running=false;show('still');}setX(P.x);return;}
   // A few times a second: where on the floor is he allowed to be? (Cards come and go as you scroll and finish things.)
   const t=performance.now();
   if(t-L.checked>320){L.checked=t;L.spots=floorNow();
    const here=nearest(L.spots,P.x),gone=here===null;
    if(gone!==L.away){L.away=gone;setAway(gone);if(gone)setBubble(null);
     // Back in view: he steps in where there is room rather than walking across what he avoids.
     else{P.x=here!;L.target=nearest(L.spots,L.target)??here!;L.running=false;}}
    else if(!gone&&Math.abs(here-P.x)>1){L.target=here;L.running=true;}}
   // He stays on his own stretch of floor: never walks across a card to reach the cursor.
   const span=L.away?null:L.spots.find(([s,e])=>P.x>=s-1&&P.x<=e+1);
   if(span)L.target=Math.min(span[1],Math.max(span[0],L.target));
   const dx=clampX(L.target)-P.x;
   if(canMove()&&Math.abs(dx)>(lead?6:2)){const step=Math.sign(dx)*Math.min(Math.abs(dx),(L.running?6.5:3.4)*dt/16.67);P.x+=step;L.trail+=Math.abs(step);
    show(L.running?'run':'walk');const f=Math.sign(dx);if(f!==P.face){P.face=f;el.dataset.face=f>0?'r':'l';}
    if(L.running&&L.trail>36){L.trail=0;L.upper=!L.upper;pawPrint(P.x+W/2+(L.upper?6:-6),P.face,L.upper);}}
   else if(shown!=='still'){const ran=L.running;L.running=false;show('still');
    // Arriving somewhere you tapped: a good sniff first.
    if(ran&&free()){a.setMood('sniff');settle('follow',1300);}}
   setX(P.x);};
  const hit=(x:number,y:number)=>{const r=el.querySelector('.pet-frame')?.getBoundingClientRect();return !!r&&x>=r.left+8&&x<=r.right-8&&y>=r.top+10&&y<=r.bottom;};
  const pointer=(e:PointerEvent)=>{
   L.lastActive=performance.now();if(L.mood==='rest'||L.mood==='sleep')wake();
   // He keeps walking toward your cursor wherever it is, and stops just beside it rather than underneath.
   if(!lead&&L.mood!=='private'&&!L.running){const side=e.clientX>P.x+W/2?-1:1;L.target=e.clientX+side*58-W/2;}
   const inside=hit(e.clientX,e.clientY),under=inside?document.elementFromPoint(e.clientX,e.clientY):null;
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
  const resize=()=>{P.x=clampX(P.x);L.target=clampX(L.target);};
  const idle=window.setInterval(()=>{const quiet=performance.now()-L.lastActive;if(L.mood==='follow'&&quiet>REST_AFTER)a.setMood('rest');else if(L.mood==='rest'&&quiet>SLEEP_AFTER+(lead?8000:0))a.setMood('sleep');},4000);
  gsap.ticker.add(tick);
  document.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('click',click);document.addEventListener('focusin',focusIn);document.addEventListener('focusout',focusOut);window.addEventListener('keydown',key);window.addEventListener('resize',resize);
  return()=>{gsap.ticker.remove(tick);clearInterval(idle);clearTimeout(timers.current.bubble);clearTimeout(timers.current.mood);
   document.removeEventListener('pointermove',pointer);document.removeEventListener('click',click);document.removeEventListener('focusin',focusIn);document.removeEventListener('focusout',focusOut);window.removeEventListener('keydown',key);window.removeEventListener('resize',resize);};
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
  const L=live.current,P=pos.current,spots=floorNow(),here=nearest(spots,P.x);if(here===null)return;
  if(L.away){L.away=false;setAway(false);}L.spots=spots;L.checked=performance.now();if(Math.abs(here-P.x)>1){P.x=here;L.target=here;L.running=false;}
  d.taken=true;celebrate(d.text,d.big);};
  window.addEventListener('reboot-bond-cheer',on);return()=>window.removeEventListener('reboot-bond-cheer',on);},[]);

 const big=mood==='cheer'&&bigCheer,walking=move!=='still'&&!['private','rest','sleep','peek'].includes(mood);
 const frame:Frame=walking?(move==='run'?'run':'walk'):big?'cheer':STILL[mood];
 // Every change of pose lands with a little squash, like a flip-book frame.
 const first=useRef(true);
 useEffect(()=>{if(first.current){first.current=false;return;}if(frame==='walk'||frame==='run')return;const img=hop.current?.querySelector('.pet-frame');if(img)gsap.fromTo(img,{scaleY:.9,scaleX:1.06},{scaleY:1,scaleX:1,duration:.45,ease:'elastic.out(1,.45)',transformOrigin:'50% 100%',clearProps:'transform'});},[frame]);

 // The bubble finds a place where it covers nothing you'd read or press: inside the window, clear of the sidebar,
 // on whichever side is free. If neither side is, the words stay for screen readers only.
 const bubbleRef=useRef<HTMLParagraphElement>(null),[spot,setSpot]=useState<{key:number;side:'l'|'r';nudge:number;quiet:boolean}|null>(null);
 useLayoutEffect(()=>{const b=bubbleRef.current;if(!b||!bubble)return;
  const place=(side:'l'|'r')=>{b.classList.remove('side-l','side-r','is-quiet');b.classList.add(`side-${side}`);b.style.removeProperty('--nudge');
   // Sized by its layout box, not the pop-in transform, so the check uses where it will settle.
   const raw=b.getBoundingClientRect(),w=b.offsetWidth,h=b.offsetHeight,cx=(raw.left+raw.right)/2,bottom=(raw.top+raw.bottom)/2+h/2;
   const left=cx-w/2,lo=floorLeft(),hi=window.innerWidth-12,nudge=Math.round(left<lo?lo-left:left+w>hi?hi-(left+w):0);
   const r=new DOMRect(left+nudge-6,bottom-h-6,w+12,h+12);
   const clear=![...document.querySelectorAll(BUBBLE_AVOID)].some(el=>{if(root.current?.contains(el))return false;const q=el.getBoundingClientRect();return q.width>0&&q.height>0&&overlaps(r,q);});
   return clear?{key:bubble.key,side,nudge,quiet:false}:null;};
  setSpot(place(bubble.side)??place(bubble.side==='l'?'r':'l')??{key:bubble.key,side:bubble.side,nudge:0,quiet:true});
 },[bubble?.key]);
 const at=spot&&bubble&&spot.key===bubble.key?spot:null;

 return <div ref={root} className={`pocket-pet dog-${dog} is-${mood} move-${walking?move:'still'} ${away?'is-away':''}`} data-face="l" aria-hidden={away||undefined}>
  {bubble&&<p ref={bubbleRef} key={bubble.key} className={`pb-bubble side-${at?.side??bubble.side} ${at?.quiet?'is-quiet':''}`} style={at?.nudge?{['--nudge' as string]:`${at.nudge}px`}:undefined} role="status">{bubble.text}</p>}
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
