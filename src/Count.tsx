import {useEffect,useRef,useState} from 'react';
import {gsap,motionOK} from './motion';

// A number that counts up the first time it scrolls into view, then glides between values when it changes.
// The value lives in React state, so React always owns the text and nothing goes stale.
export function Count({value,duration=.9}:{value:number;duration?:number}){
 const el=useRef<HTMLSpanElement>(null),shown=useRef(0),started=useRef(false);
 const [n,setN]=useState(()=>motionOK()?0:value);
 useEffect(()=>{
  if(!motionOK()){shown.current=value;setN(value);return;}
  const proxy={v:shown.current};let tween:gsap.core.Tween|undefined;
  const run=()=>{started.current=true;tween=gsap.to(proxy,{v:value,duration,ease:'power3.out',onUpdate:()=>{shown.current=proxy.v;setN(Math.round(proxy.v));},onComplete:()=>{shown.current=value;setN(value);}});};
  if(started.current||!el.current){run();return()=>tween?.kill();}
  const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();run();}});io.observe(el.current);
  return()=>{io.disconnect();tween?.kill();};
 },[value,duration]);
 return <span ref={el} className="count">{n}</span>;
}
