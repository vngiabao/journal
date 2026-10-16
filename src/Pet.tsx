// Pocket pets: a chibi Shiba and/or Samoyed who live on the bottom edge of the page on a computer.
// They trot after you, run over when you tap empty space and sniff the spot, cover their eyes while you write,
// tilt their heads while you type, jump for the promises you keep, and lie down, then curl up asleep, when you step away.
// They never block anything: they ignore the pointer, and taps on them are found by position instead.
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {ChibiPose} from './Art';
import {gsap} from './motion';
import type {State} from './model';
import {promisesKept} from './engine';
import {label} from './dates';
import {burst,inkDrop,isInteractive} from './delight';

export type Cheer={pose:ChibiPose;text:string;key:number};
export type Dog='shiba'|'samoyed';
type Choice=Dog|'both'|'off';
type Frame='sit'|'walk'|'run'|'cover'|'peek'|'tilt'|'sniff'|'jump'|'cheer'|'lie'|'sleep';
type Mood='follow'|'think'|'private'|'peek'|'rest'|'sleep'|'talk'|'cheer'|'sniff';
// Which drawing each mood uses while standing still. Walking and running are handled by movement.
const STILL:Record<Mood,Frame>={follow:'sit',think:'tilt',private:'cover',peek:'peek',rest:'lie',sleep:'sleep',talk:'jump',cheer:'jump',sniff:'sniff'};
const FRAMES=['sit','walk-a','walk-b','run','cover','peek','tilt','sniff','jump','cheer','lie','sleep'];
const art=(dog:Dog,f:string)=>`/art/dog/${dog}-${f}.webp`;
const KEY='reboot-pocket-pet',ROOMY='(hover:hover) and (pointer:fine) and (min-width: 1000px)',QUIET='(prefers-reduced-motion: reduce)',W=84;
const REST_AFTER=45_000,SLEEP_AFTER=150_000;

let remembered:Choice|null=null;
export function petChoice():Choice{if(remembered)return remembered;try{const v=localStorage.getItem(KEY);if(v==='shiba'||v==='samoyed'||v==='both'||v==='off')return v;if(localStorage.getItem('reboot-pocket-bao')==='off')return 'off';}catch{/* storage blocked */}return 'both';}
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
 const live=useRef({target:window.innerWidth-W-48-(lead?90:0),walking:false,running:false,lastActive:performance.now(),mood:'follow' as Mood,trail:0,upper:false});
 const timers=useRef({bubble:0,mood:0}),latest=useRef({state,now,onCheerDone});latest.current={state,now,onCheerDone};
 const api=useRef({setMood:(_m:Mood)=>{},say:(_t:string,_ms?:number)=>{},jump:(_h?:number,_n?:number)=>{}});
 api.current.setMood=m=>{live.current.mood=m;setMoodState(m);};
 api.current.say=(text,ms=2600)=>{if(!speaks)return;clearTimeout(timers.current.bubble);setBubble({text,key:Date.now(),side:pos.current.x+W/2>window.innerWidth*.6?'r':'l'});timers.current.bubble=window.setTimeout(()=>setBubble(null),ms);};
 api.current.jump=(h=16,n=1)=>{const el=hop.current;if(!el)return;gsap.timeline({overwrite:true,delay:lead?.12:0})
  .to(el,{scaleY:.84,scaleX:1.12,duration:.1,ease:'power1.out',transformOrigin:'50% 100%'})
  .to(el,{y:-h,scaleY:1.08,scaleX:.94,duration:.2,ease:'power2.out',yoyo:true,repeat:n*2-1})
  .to(el,{y:0,scaleY:1,scaleX:1,duration:.4,ease:'elastic.out(1,.4)'});};

 // Preload every frame so pose changes never flash.
 useEffect(()=>{for(const f of FRAMES){const i=new Image();i.src=art(dog,f);}},[dog]);

 useEffect(()=>{
  const el=root.current!,L=live.current,P=pos.current,a=api.current,setX=gsap.quickSetter(el,'x','px');
  const floorLeft=()=>(document.querySelector('.sidebar')?.getBoundingClientRect().right??0)+12;
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
   const dx=clampX(L.target)-P.x;
   if(canMove()&&Math.abs(dx)>(lead?6:2)){const step=Math.sign(dx)*Math.min(Math.abs(dx),(L.running?7.5:2.7)*dt/16.67);P.x+=step;L.trail+=Math.abs(step);
    show(L.running?'run':'walk');const f=Math.sign(dx);if(f!==P.face){P.face=f;el.dataset.face=f>0?'r':'l';}
    if(L.running&&L.trail>30){L.trail=0;L.upper=!L.upper;pawPrint(P.x+W/2+(L.upper?6:-6),P.face,L.upper);}}
   else if(shown!=='still'){const ran=L.running;L.running=false;show('still');
    // Arriving somewhere you tapped: a good sniff first.
    if(ran&&free()){a.setMood('sniff');settle('follow',1300);}}
   setX(P.x);};
  const hit=(x:number,y:number)=>{const r=el.querySelector('.pet-frame')?.getBoundingClientRect();return !!r&&x>=r.left+8&&x<=r.right-8&&y>=r.top+10&&y<=r.bottom;};
  const pointer=(e:PointerEvent)=>{
   L.lastActive=performance.now();if(L.mood==='rest'||L.mood==='sleep')wake();
   // The lead keeps you company from a step away, and stays put while you work near the bottom of the screen.
   if(!lead&&L.mood!=='private'&&!L.running&&e.clientY<window.innerHeight-170){const side=e.clientX>P.x+W/2?-1:1;L.target=e.clientX+side*72-W/2;}
   const inside=hit(e.clientX,e.clientY),under=inside?document.elementFromPoint(e.clientX,e.clientY):null;
   el.classList.toggle('is-hover',inside&&!isInteractive(under));el.classList.toggle('is-ghost',inside&&isInteractive(under));};
  const tap=()=>{a.setMood('talk');a.jump(20);a.say(evidence(latest.current.state,latest.current.now),4200);settle('follow',2000);};
  const click=(e:MouseEvent)=>{const t=e.target instanceof Element?e.target:null;
   if(hit(e.clientX,e.clientY)&&!isInteractive(t)){tap();return;}
   // Tap empty paper and the dogs race over, leaving paw prints.
   if(t&&!isInteractive(t)&&t.matches('main,.main-shell,.app,.page-footer,body')&&L.mood!=='private'){if(L.mood==='rest'||L.mood==='sleep')wake();
    L.target=e.clientX-W/2+(lead?(e.clientX>P.x?-70:70):0);L.running=true;if(!lead)inkDrop(e.clientX,e.clientY);}};
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
 useEffect(()=>{if(!cheer)return;const big=cheer.pose==='bingo',a=api.current;
  clearTimeout(timers.current.mood);a.setMood('cheer');a.say(cheer.text,big?3400:2400);a.jump(big?26:14,big?3:1);
  if(big&&speaks){const r=hop.current?.getBoundingClientRect();if(r)burst(r.left+r.width/2,r.top+12,44);}
  timers.current.mood=window.setTimeout(()=>{a.setMood('follow');latest.current.onCheerDone?.();},big?3400:2400);
 },[cheer?.key]);

 const big=mood==='cheer'&&cheer?.pose==='bingo',walking=move!=='still'&&!['private','rest','sleep','peek'].includes(mood);
 const frame:Frame=walking?(move==='run'?'run':'walk'):big?'cheer':STILL[mood];
 // Every change of pose lands with a little squash, like a flip-book frame.
 const first=useRef(true);
 useEffect(()=>{if(first.current){first.current=false;return;}if(frame==='walk'||frame==='run')return;const img=hop.current?.querySelector('.pet-frame');if(img)gsap.fromTo(img,{scaleY:.9,scaleX:1.06},{scaleY:1,scaleX:1,duration:.45,ease:'elastic.out(1,.45)',transformOrigin:'50% 100%',clearProps:'transform'});},[frame]);

 return <div ref={root} className={`pocket-pet dog-${dog} is-${mood} move-${walking?move:'still'}`} data-face="l">
  {bubble&&<p key={bubble.key} className={`pb-bubble side-${bubble.side}`} role="status">{bubble.text}</p>}
  <div className="pb-face"><div ref={hop} className="pb-hop">
   {frame==='walk'?<span className="pet-frame pet-walk"><img src={art(dog,'walk-a')} alt=""/><img src={art(dog,'walk-b')} alt=""/></span>:<img className="pet-frame" src={art(dog,frame)} alt=""/>}
  </div></div>
  {mood==='sleep'&&<span className="pb-z" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>}
  <span className="pb-shadow" aria-hidden="true"/>
 </div>;
}

// One dog, or the Shiba leading with the Samoyed a step behind.
export function PocketPets({choice,state,now,cheer,onCheerDone}:{choice:Choice;state:State;now:string;cheer:Cheer|null;onCheerDone:()=>void}){
 const leadPos=useRef<Pos>({x:window.innerWidth+20,face:-1}),tailPos=useRef<Pos>({x:window.innerWidth+110,face:-1});
 if(choice==='off')return null;
 const first:Dog=choice==='samoyed'?'samoyed':'shiba';
 return <>
  <PocketDog key={first} dog={first} state={state} now={now} cheer={cheer} onCheerDone={onCheerDone} pos={leadPos} speaks/>
  {choice==='both'&&<PocketDog key="samoyed-tail" dog="samoyed" state={state} now={now} cheer={cheer} lead={leadPos} pos={tailPos} speaks={false}/>}
 </>;
}

export function PetSetting(){
 const choice=useSyncExternalStore(subscribe,petChoice,()=>'both' as Choice);
 const options:[Choice,string][]=[['both','Shiba and Samoyed'],['shiba','Shiba'],['samoyed','Samoyed'],['off','Off']];
 return <section className="settings-section"><h2>Pocket pups</h2>
  <div className="segmented pet-choice" role="radiogroup" aria-label="Pocket pups">{options.map(([v,n])=><button key={v} type="button" role="radio" aria-checked={choice===v} className={choice===v?'selected':''} onClick={()=>setPetChoice(v)}>{n}</button>)}</div>
  <p className="muted">On a computer, the pups keep you company along the bottom of the page. They follow you, cover their eyes while you write, jump for the promises you keep, and remind you of a real win when you tap one. Tap empty space and they race over. Hidden on phones and when Reduce Motion is on.</p>
 </section>;
}
