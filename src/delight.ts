// Small moments of delight that live outside any one page: stamps, bursts, and how things react to the pointer.
import {gsap,motionOK} from './motion';

export const finePointer=()=>window.matchMedia('(hover:hover) and (pointer:fine)').matches;
const INTERACTIVE='button,a,input,textarea,select,label,summary,[role="button"],[role="radio"],[contenteditable="true"],svg,.goal-tile,.todo-list li';
export const isInteractive=(el:Element|null)=>!!el?.closest(INTERACTIVE);

function layer(className:string,x:number,y:number){const el=document.createElement('div');el.className=className;el.setAttribute('aria-hidden','true');el.style.left=`${x}px`;el.style.top=`${y}px`;document.body.appendChild(el);return el;}

// A rubber stamp pressed where you clicked: an inked word at a slight tilt, a few specks of ink, then it dries away.
export function inkStamp(x:number,y:number,word='Kept'){
 if(!motionOK())return;
 const el=layer('ink-stamp',x,y);el.textContent=word;
 const specks=Array.from({length:6},()=>el.appendChild(document.createElement('i')));
 gsap.timeline({onComplete:()=>el.remove()})
  .fromTo(el,{xPercent:-50,yPercent:-50,scale:2.3,rotation:gsap.utils.random(-30,-16),opacity:0},{scale:1,rotation:gsap.utils.random(-12,-4),opacity:1,duration:.32,ease:'stamp'})
  .fromTo(specks,{x:0,y:0,scale:0},{x:()=>gsap.utils.random(-46,46),y:()=>gsap.utils.random(-28,28),scale:()=>gsap.utils.random(.5,1.3),duration:.3,ease:'power3.out'},'-=.14')
  .to(el,{opacity:0,y:'-=8',duration:.6,ease:'power1.in'},'+=.55');
}

// A drop of ink where you tapped empty paper: a ring that spreads and fades.
export function inkDrop(x:number,y:number){
 if(!motionOK())return;
 const el=layer('ink-drop',x,y);
 gsap.fromTo(el,{xPercent:-50,yPercent:-50,scale:.2,opacity:.7},{scale:1.6,opacity:0,duration:.7,ease:'power2.out',onComplete:()=>el.remove()});
}

// Paper confetti thrown up from a point; it arcs, tumbles and falls away.
export function burst(x:number,y:number,n=36){
 if(!motionOK())return;
 const colors=['var(--gold)','var(--red)','var(--blue)','var(--green)','var(--metal)'];
 for(let i=0;i<n;i++){const d=layer('burst-bit',0,0);d.style.background=colors[i%colors.length];if(i%3===0)d.style.borderRadius='50%';
  gsap.timeline({onComplete:()=>d.remove()}).set(d,{x,y,rotation:gsap.utils.random(0,360)})
   .to(d,{x:x+gsap.utils.random(-180,180),duration:1.5,ease:'power2.out'},0)
   .to(d,{y:y-gsap.utils.random(90,260),duration:.5,ease:'power2.out'},0)
   .to(d,{y:`+=${gsap.utils.random(300,460)}`,duration:1,ease:'power2.in'},.5)
   .to(d,{rotation:`+=${gsap.utils.random(-600,600)}`,rotationX:gsap.utils.random(-360,360),duration:1.5,ease:'none'},0)
   .to(d,{opacity:0,duration:.3},1.2);}
}

// Primary buttons lean toward the pointer, as if magnetised.
export function installHoverPhysics(){
 if(!finePointer())return()=>{};
 let btn:HTMLElement|null=null;
 const release=(el:HTMLElement|null)=>{if(el)gsap.to(el,{x:0,y:0,duration:.6,ease:'elastic.out(1,.45)',overwrite:'auto'});};
 const move=(e:PointerEvent)=>{
  if(!motionOK())return;const t=e.target instanceof Element?e.target:null;
  const b=(t?.closest('.button:not(:disabled)')??null) as HTMLElement|null;
  if(b!==btn){release(btn);btn=b;}
  if(btn){const r=btn.getBoundingClientRect(),c=gsap.utils.clamp;gsap.to(btn,{x:c(-6,6,(e.clientX-r.left-r.width/2)*.15),y:c(-4,4,(e.clientY-r.top-r.height/2)*.3),duration:.3,ease:'power3.out',overwrite:'auto'});}
 };
 const leave=()=>{release(btn);btn=null;};
 document.addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',leave);
 return()=>{document.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',leave);};
}
