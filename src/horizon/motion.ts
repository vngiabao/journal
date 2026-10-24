// Horizon's motion vocabulary. Plugins are registered once in ../motion; this adds the "move" ease for travel
// (things going from one place to another) next to the existing "pen" and "stamp".
import {CustomEase} from 'gsap/CustomEase';
import {gsap,motionOK,whenMotionOK,useGSAP,Flip,CLEAR_DASH} from '../motion';

CustomEase.create('move','M0,0 C0.77,0 0.175,1 1,1');
// Entrances: cubic-bezier(0.23,1,0.32,1), the same curve as --ease in tokens.css.
CustomEase.create('enter','M0,0 C0.23,1 0.32,1 1,1');

// A ghost chip that flies from where you tapped to the shelf that now holds the item (a FLIP without moving real DOM).
export function flyChip(text:string,from:Element|null,to:Element|null){
 if(!from||!to||!motionOK())return;
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),el=document.createElement('div');
 el.className='hz-ghost';el.textContent=text;el.setAttribute('aria-hidden','true');
 el.style.left=`${a.left}px`;el.style.top=`${a.top+a.height/2-18}px`;document.body.appendChild(el);
 gsap.timeline({onComplete:()=>el.remove()})
  .fromTo(el,{opacity:0,scale:.92},{opacity:1,scale:1,duration:.12,ease:'enter'})
  .to(el,{x:b.left+16-a.left,y:b.top+20-(a.top+a.height/2-18),duration:.45,ease:'move'},'<.04')
  .to(el,{opacity:0,scale:.96,duration:.16,ease:'enter'},'-=.08');
}

export {gsap,motionOK,whenMotionOK,useGSAP,Flip,CLEAR_DASH};
