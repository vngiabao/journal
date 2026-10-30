// Bond reacts when you finish something. The hops use an elastic settle on purpose: they are rare, earned moments,
// never everyday UI, which stays on 'enter' and 'move'. A short moment over the page that never blocks a click for long:
// any tap, Escape, or the button ends it. Milestones get a keepsake stamp pressed onto the page.
// When the pocket pet is out, he does the cheering himself; when pets are off, the words still show, without the dog.
import {gsap,motionOK} from '../motion';
import {burst} from '../delight';
import {petChoice} from '../Pet';
import {keepsake} from './journey';
import {label} from '../dates';

export type BondMoment='morning-done'|'evening-done'|'week-done'|'frog-done';
const WORDS:Record<BondMoment,{text:string;pose:string}>={
 'morning-done':{text:'Morning planned. Frog first - Bond’s watching.',pose:'jump'},
 'evening-done':{text:'Day done. That one counts.',pose:'cheer'},
 'week-done':{text:'Week planned. Bond likes the look of it.',pose:'jump'},
 'frog-done':{text:'Frog eaten. Bond did a little hop.',pose:'jump'},
};
export const BOND_EVENT='reboot-bond-cheer';
export const bondArt=(pose:string)=>`/art/dog/bond-${pose}.webp`;
const dogOK=()=>petChoice()!=='off';

// A moment and a milestone found in the same breath (the ritual finishes, then the strip notices day 7)
// become one celebration: the bigger one.
let pending:{moment?:BondMoment;milestone?:{n:number;date:string}}={},timer=0;
export function bondCelebrate(m:BondMoment){pending.moment=m;schedule();}
export function celebrateMilestone(n:number,date:string){pending.milestone={n,date};schedule();}
function schedule(){clearTimeout(timer);timer=window.setTimeout(()=>{const p=pending;pending={};if(p.milestone)showMilestone(p.milestone.n,p.milestone.date);else if(p.moment)showMoment(p.moment);},120);}

let current:(()=>void)|null=null;
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string){const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;}

// The pocket pet, if he's out and in view, cheers in place. Returns true when he took the moment. He answers
// synchronously: while he's stepped aside (over a ritual card, say), the words show as a small note instead.
function pocketCheer(text:string,big:boolean){
 if(!dogOK()||!document.querySelector('.pocket-pet'))return false;
 const detail={text,big,taken:false};
 window.dispatchEvent(new CustomEvent(BOND_EVENT,{detail}));return detail.taken;
}

function showMoment(m:BondMoment){
 const {text,pose}=WORDS[m];
 if(pocketCheer(text,false))return;
 current?.();
 const box=el('div','bond-pop');box.setAttribute('role','status');
 // While a check-in card is open its action bar sits at the bottom of the screen, so the note rises at the top instead.
 if(document.querySelector('.ritual-card'))box.classList.add('is-top');
 const dog=dogOK();
 if(dog){const img=el('img','bond-pop-dog');img.src=bondArt(pose);img.alt='';box.append(img);}
 // The status box goes in empty and the words a frame later, so screen readers announce them.
 const words=el('p','bond-pop-text');box.append(words);
 document.body.append(box);requestAnimationFrame(()=>{words.textContent=text;});
 const move=motionOK(),from=box.classList.contains('is-top')?-16:16;let done=false;
 const close=()=>{if(done)return;done=true;current=null;clearTimeout(t);window.removeEventListener('pointerdown',close,true);window.removeEventListener('keydown',close,true);
  if(move)gsap.to(box,{opacity:0,y:from/2,duration:.2,ease:'enter',onComplete:()=>box.remove()});else box.remove();};
 current=close;
 const t=window.setTimeout(close,move?2800:4000);
 window.addEventListener('pointerdown',close,true);window.addEventListener('keydown',close,true);
 if(move){
  gsap.fromTo(box,{opacity:0,y:from},{opacity:1,y:0,duration:.3,ease:'enter'});
  const img=box.querySelector('.bond-pop-dog');
  if(img)gsap.timeline({delay:.15}).to(img,{scaleY:.86,scaleX:1.1,duration:.1,ease:'power1.out',transformOrigin:'50% 100%'})
   .to(img,{y:-18,scaleY:1.06,scaleX:.95,duration:.2,ease:'power2.out',yoyo:true,repeat:1})
   .to(img,{y:0,scaleY:1,scaleX:1,duration:.4,ease:'elastic.out(1,.4)'});
 }
}

// The keepsake stamp, as DOM. The full view draws the same thing in React with the same classes.
export function stampNode(n:number,date?:string){
 const k=keepsake(n),outer=el('div','bond-stamp'),inner=el('div','bond-stamp-in'),img=el('img','bond-stamp-dog');
 img.src=bondArt(k.pose);img.alt='';
 inner.append(img,el('b','bond-stamp-n',String(n)),el('span','bond-stamp-name',k.name));
 if(date)inner.append(el('span','bond-stamp-date',label(date,{month:'short',day:'numeric'})));
 outer.append(inner);return outer;
}

function showMilestone(n:number,date:string){
 const k=keepsake(n),dog=dogOK(),move=motionOK();
 current?.();
 const scrim=el('div','bond-moment');scrim.setAttribute('role','dialog');scrim.setAttribute('aria-modal','true');scrim.setAttribute('aria-label',`${n} days with Bond`);
 const card=el('div','bond-moment-card'),stamp=stampNode(n,date);
 const words=el('div','bond-moment-words');
 // The stamp already carries the number and the date, so the words don't say the day again.
 words.append(el('h2','bond-moment-line',k.line),el('p','bond-moment-sub','A keepsake for your trail. Bond keeps it with the others.'));
 const btn=el('button','button bond-moment-go','Keep walking');btn.type='button';words.append(btn);
 const stage=el('div','bond-moment-stage');stage.append(stamp);
 // Bond cheers on the card itself (the pocket pet would sit under the scrim). Pets off: the stamp and the words only.
 if(dog){const img=el('img','bond-moment-dog');img.src=bondArt('cheer');img.alt='';stage.append(img);}
 card.append(stage,words);scrim.append(card);document.body.append(scrim);
 const before=document.activeElement as HTMLElement|null;btn.focus({preventScroll:true});
 let done=false;
 const close=()=>{if(done)return;done=true;current=null;clearTimeout(t);document.removeEventListener('keydown',key,true);
  const end=()=>{scrim.remove();before?.focus?.({preventScroll:true});};
  if(move)gsap.to(scrim,{opacity:0,duration:.2,ease:'enter',onComplete:end});else end();};
 const key=(e:KeyboardEvent)=>{if(e.key==='Escape'||e.key==='Enter'||e.key===' '){e.preventDefault();close();}else if(e.key==='Tab'){e.preventDefault();btn.focus();}};
 current=close;
 scrim.addEventListener('click',close);document.addEventListener('keydown',key,true);
 // Long enough to read; it leaves on its own if you just keep going.
 const t=window.setTimeout(close,move?7000:9000);
 if(!move)return;
 gsap.timeline()
  .fromTo(scrim,{opacity:0},{opacity:1,duration:.25,ease:'enter'})
  .fromTo(card,{opacity:0,y:18,scale:.97},{opacity:1,y:0,scale:1,duration:.35,ease:'enter'},'<')
  .fromTo(stamp,{scale:1.9,rotation:-22,opacity:0},{scale:1,rotation:-5,opacity:1,duration:.38,ease:'stamp'},'-=.1')
  .add(()=>{const r=stamp.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height*.3,26);})
  .fromTo(words.children,{opacity:0,y:10},{opacity:1,y:0,duration:.3,ease:'enter',stagger:.06},'-=.05');
 const img=stage.querySelector('.bond-moment-dog');
 if(img)gsap.timeline({delay:.45}).fromTo(img,{opacity:0,y:24},{opacity:1,y:0,duration:.3,ease:'enter'})
  .to(img,{y:-22,duration:.22,ease:'power2.out',yoyo:true,repeat:3})
  .to(img,{y:0,duration:.4,ease:'elastic.out(1,.4)'});
}

// A quiet hello from the pocket pet (no overlay). Returns false when he isn't out, so the caller can try another day.
export function greet(text:string){return pocketCheer(text,false);}
