import {useEffect,useMemo,useRef,useState} from 'react';
import {useId} from 'react';
import {ArrowLeft,ArrowRight,Undo2,Redo2,Minus,Plus,X,Trash2,PenLine,Check,ChevronUp,ChevronDown,ChevronsUp,ChevronsDown,Steady} from './icons';
import type {ComponentType} from 'react';
import type {Moment} from './model';
import type {State,Movement} from './model';
import type {Mutate} from './GoalControls';
import {addDays,range,label} from './dates';
import {cumulative,journeyLevels,setMomentLevel,addMoment,updateMoment,removeMoment,dayMoments,dayNotes,dayTags,momentWord,TAG_GROUPS} from './engine';
import {goalName} from './Board';
import {Rough,sk,seedOf} from './Sketch';
import {gsap,useGSAP,whenMotionOK,CLEAR_DASH} from './motion';

type Mode='full'|'inline'|'preview';
type Dot={date:string;index:number;count:number;cx:number;level:number;delta:number;dayIndex:number;last:boolean};
const PERIODS:[number,string][]=[[7,'7 days'],[30,'30 days'],[90,'90 days'],[365,'Year'],[0,'All time']];
const hhmm=(at?:string)=>{if(!at)return '';const d=new Date(at);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const atTime=(date:string,time:string)=>{const [y,mo,d]=date.split('-').map(Number),[h,mi]=time.split(':').map(Number);return new Date(y,mo-1,d,h,mi).toISOString();};
const timeLabel=(at:string,i:number)=>at?new Date(at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):`Moment ${i+1}`;

export function Journey({state,mutate,now,mode='full',days=14,onOpen,title,subtitle,focus}:{state:State;mutate:Mutate;now:string;mode?:Mode;days?:number;onOpen?:()=>void;title?:string;subtitle?:string;focus?:string}){
 const editable=mode!=='preview',full=mode==='full';
 const [period,setPeriod]=useState(full?30:days),[end,setEnd]=useState(()=>focus?[addDays(focus,Math.floor(days/3)),now].sort()[0]:now),[selected,setSelected]=useState(focus??now),[selMoment,setSelMoment]=useState<number|null>(null),[draft,setDraft]=useState<Movement[]|null>(null),[undos,setUndos]=useState<Movement[][]>([]),[redos,setRedos]=useState<Movement[][]>([]),[hover,setHover]=useState<string|null>(null),[width,setWidth]=useState(1100),[deleted,setDeleted]=useState<string|null>(null),[quick,setQuick]=useState<{index:number;label:string}|null>(null),[quickNote,setQuickNote]=useState('');
 const pointer=useRef<number|null>(null),pending=useRef<{date:string;y:number}|null>(null),target=useRef<{date:string;index:number}|null>(null),svg=useRef<SVGSVGElement>(null),frozen=useRef<[number,number]|null>(null),draftRef=useRef<Movement[]|null>(null),baseRef=useRef<Movement[]|null>(null),created=useRef(false),frame=useRef<HTMLDivElement>(null),[fresh,setFresh]=useState<string|null>(null);
 useEffect(()=>{if(!svg.current)return;const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));observer.observe(svg.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{setEnd(e=>e>now?now:e);},[now]);

 const earliest=state.journey.map(m=>m.date).sort()[0]??addDays(now,-29);
 const start=period===0?[earliest,addDays(end,-6)].sort()[0]:addDays(end,1-period);
 const dates=useMemo(()=>range(start,end),[start,end]);
 const pickable=(d:string)=>d>now?now:d;
 useEffect(()=>{if(selected<start||selected>end)setSelected(end);},[start,end,selected]);
 function selectDay(d:string,index:number|null=null){setSelected(d);setSelMoment(index);}

 const shown=draft??state.journey,points=cumulative(shown,dates),values=journeyLevels(state.journey,dates);
 // Fit the scale to your line with generous headroom, so a big day can make a big jump. Frozen while dragging; refits on release.
 const dataLo=Math.min(...values),dataHi=Math.max(...values),pad=Math.max(10,(dataHi-dataLo)*.5),lo=dataLo-pad,hi=dataHi+pad,[mapMin,mapMax]=frozen.current??[lo,hi];
 // While dragging, the pointer keeps the scale it started with (so the point never runs away), but the view widens to keep the whole line in sight.
 const draftLevels=draft?journeyLevels(draft,dates):[],min=draft?Math.min(mapMin,...draftLevels.map(v=>v-pad*.25)):mapMin,max=draft?Math.max(mapMax,...draftLevels.map(v=>v+pad*.25)):mapMax;
 const narrow=width<600,W=Math.max(300,width);
 const H=full?(narrow?380:540):mode==='inline'?(narrow?330:410):210;
 const L=narrow?14:full?46:20,R=narrow?22:full?40:28,T=full?56:40,B=full?50:40;
 // Today is the widest column, and the road ahead beside it holds the quick-log buttons. Past days share what is left.
 const plotW=W-L-R,hasToday=editable&&dates.at(-1)===now,pastN=hasToday?dates.length-1:dates.length;
 const marked=new Set(state.journey.map(m=>m.date));
 // Each past day's weight: a marked day counts fully (the last few days a little more); a quiet stretch shares a small fixed width.
 const weights=dates.slice(0,pastN).map(()=>1);
 if(editable){let i=0;while(i<pastN){if(marked.has(dates[i])){const ago=pastN-i;weights[i]=ago<=3?1.4:1;i++;continue;}let j=i;while(j<pastN&&!marked.has(dates[j]))j++;const run=j-i;for(let k=i;k<j;k++)weights[k]=Math.min(.12,.7/run);i=j;}}
 const sumW=weights.reduce((n,w)=>n+w,0),dataDays=dates.slice(0,pastN).filter(d=>marked.has(d)).length;
 const futureW=hasToday?(narrow?28:Math.min(110,plotW*.08)):0,room=plotW-futureW;
 const pastW=!hasToday?room:dataDays===0?Math.min(room*.16,110):Math.min(room*(narrow?.42:.62),sumW*(narrow?30:88));
 const todayW=hasToday?room-pastW:0,futureX=L+pastW+todayW,slot=pastW/Math.max(1,pastN);
 const starts=weights.reduce<number[]>((a,w,i)=>{a.push(i?a[i-1]+weights[i-1]/sumW*pastW:L);return a;},[]);
 const left=(i:number)=>i<pastN?starts[i]:L+pastW,colW=(i:number)=>i<pastN?weights[i]/sumW*pastW:todayW;
 const x=(i:number)=>left(i)+colW(i)/2,y=(v:number)=>T+(max-v)/(max-min)*(H-T-B);
 const dayPad=(i:number)=>Math.min(18,colW(i)*.08),timeX=(i:number,at:string)=>{const d=new Date(at),f=(d.getHours()*60+d.getMinutes())/1440;return left(i)+dayPad(i)+f*(colW(i)-2*dayPad(i));};
 const xToTime=(i:number,px:number)=>{const f=Math.min(1,Math.max(0,(px-left(i)-dayPad(i))/Math.max(1,colW(i)-2*dayPad(i)))),mins=Math.min(1439,Math.round(f*1440));return atTime(dates[i],`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`);};
 const colAt=(px:number)=>{if(px>=L+pastW)return dates.length-1;for(let i=pastN-1;i>=0;i--)if(px>=starts[i])return i;return 0;};
 // Quiet stretches: runs of unmarked past days, drawn as a pencil squiggle instead of empty space.
 const quiet:{from:number;to:number;n:number}[]=[];if(editable){let i=0;while(i<pastN){if(marked.has(dates[i])){i++;continue;}let j=i;while(j<pastN&&!marked.has(dates[j]))j++;if(j-i>=2)quiet.push({from:left(i),to:left(j-1)+colW(j-1),n:j-i});i=j;}}
 const idx=(d:string)=>Math.max(0,dates.indexOf(d));
 const record=state.journey.find(m=>m.date===selected),liveRecord=shown.find(m=>m.date===selected);
 const moments=record?dayMoments(record):[],activeIndex=selMoment!==null&&selMoment<moments.length?selMoment:Math.max(0,moments.length-1);

 // Every moment is a dot. A day's moments share the space leading up to it, so its last moment lands on the day itself.
 const dots:Dot[]=[];
 points.forEach((p,i)=>{if(!p.entry)return;const ms=dayMoments(p.entry);let level=p.value-p.entry.delta;ms.forEach((m,j)=>{level+=m.delta;dots.push({date:p.date,index:j,count:ms.length,cx:m.at?timeX(i,m.at):ms.length>1?left(i)+colW(i)*(j+1)/(ms.length+1):x(i),level,delta:m.delta,dayIndex:i,last:j===ms.length-1});});});
 const dayEnds=dots.filter(d=>d.last);
 // A fountain-pen stroke: a gentle curve through every moment. It passes exactly through each point, so no high or low is smoothed away.
 const line=penPath(dots.map(d=>[d.cx,y(d.level)] as [number,number]));
 const area=dots.length>1?`${line} L${dots.at(-1)!.cx},${H-B} L${dots[0].cx},${H-B} Z`:'';
 const selDot=dots.find(d=>d.date===selected&&d.index===(target.current?.date===selected?target.current.index:activeIndex));
 const emptyLevel=points.find(p=>p.date===selected)?.value??0;

 function commit(m:Movement[]){setUndos(u=>[...u.slice(-49),state.journey]);setRedos([]);mutate(s=>{s.journey=m;},'journey edit');setDraft(null);draftRef.current=null;frozen.current=null;target.current=null;}
 function cancel(){created.current=false;baseRef.current=null;pointer.current=null;pending.current=null;target.current=null;frozen.current=null;setDraft(null);draftRef.current=null;}
 function coordinates(e:React.PointerEvent<SVGSVGElement>){const r=e.currentTarget.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*W,py=(e.clientY-r.top)/r.height*H;return {px,index:colAt(px),value:mapMax-(py-T)/(H-T-B)*(mapMax-mapMin),py};}
 function beginDrag(e:React.PointerEvent<SVGSVGElement>,date:string,index:number,value:number,base=state.journey){baseRef.current=base;target.current={date,index};pointer.current=e.pointerId;frozen.current=[lo,hi];e.currentTarget.setPointerCapture(e.pointerId);const m=setMomentLevel(base,date,index,value);setDraft(m);draftRef.current=m;}
 function restore(from:Movement[][],undo:boolean){if(!from.length)return;const previous=from.at(-1)!;if(undo){setUndos(from.slice(0,-1));setRedos(r=>[...r,state.journey]);}else{setRedos(from.slice(0,-1));setUndos(u=>[...u,state.journey]);}mutate(s=>{s.journey=previous;},undo?'journey undo':'journey redo');}
 function patchDay(p:Partial<Movement>,entity:string){mutate(s=>{const m=s.journey.find(m=>m.date===selected);if(m)Object.assign(m,p);},entity);}
 // Log a moment from the composer: it joins the end of that day.
 function log(m:{delta:number;note:string;tag?:string},date=selected){const at=date===now?new Date().toISOString():atTime(date,'12:00');let next=addMoment(state.journey,date,at);const n=dayMoments(next.find(d=>d.date===date)!).length-1;next=updateMoment(next,date,n,{delta:m.delta,note:m.note,tag:m.tag});if(m.tag)next=next.map(d=>d.date===date?{...d,milestone:true}:d);commit(next);setSelected(date);setSelMoment(n);setDeleted(null);return n;}
 function saveQuickNote(){if(quick&&quickNote.trim())commit(updateMoment(state.journey,now,quick.index,{note:quickNote.trim()}));setQuick(null);setQuickNote('');}
 function removeAt(i:number){commit(removeMoment(state.journey,selected,i));setSelMoment(null);setDeleted(`${selected}-${Date.now()}`);}
 function edit(i:number,patch:Partial<Pick<Moment,'note'|'delta'|'tag'|'at'>>){commit(updateMoment(state.journey,selected,i,patch));if(patch.tag)patchDay({milestone:true},'journey moment');}
 useEffect(()=>{if(!deleted)return;const t=setTimeout(()=>setDeleted(null),8000);return()=>clearTimeout(t);},[deleted]);
 const levelOf=(index:number)=>dots.find(d=>d.date===selected&&d.index===index)?.level??emptyLevel;

 const ticks=narrow?3:mode==='full'?7:4,tickIndices=Array.from(new Set([0,...Array.from({length:ticks-1},(_,i)=>Math.round((i+1)*(dates.length-1)/ticks)),dates.length-1,...(dates.indexOf(now)>=0?[dates.indexOf(now)]:[])])).filter((i,_,a)=>{const t=dates.indexOf(now);return i===t||t<0||Math.abs(i-t)>=Math.max(2,dates.length/(ticks*2.2));}).sort((a,b)=>a-b);
 // On a phone the past is squeezed, so only its first date and Today get labels.
 const ticksShown=(()=>{if(!editable)return tickIndices;const out:number[]=[],gap=narrow?46:64,todayAt=hasToday?x(dates.length-1):Infinity;let last=-Infinity;for(const i of [0,...dates.map((d,i)=>marked.has(d)&&i<pastN?i:-1).filter(i=>i>0)]){const px=i===0?left(0):x(i);if(px-last>=gap&&todayAt-px>=gap){out.push(i);last=px;}}if(hasToday)out.push(dates.length-1);else if(!out.includes(dates.length-1))out.push(dates.length-1);return out;})();
 const showDots=dates.length<=62,guide=editable?hover??selected:null,todayIndex=dates.indexOf(now);
 const span=max-min,dragged=draft&&target.current?dayMoments(shown.find(m=>m.date===target.current!.date)!)[target.current.index]:null,word=dragged?momentWord(dragged.delta,span):null;

 // Every labelled moment gets its caption on its own dot, thinned so neighbours never collide.
 const captions:{cx:number;level:number;text:string;up:boolean;key:string}[]=[];
 for(const d of dots){const day=points[d.dayIndex].entry!,mo=dayMoments(day)[d.index];const text=mo.tag||(d.last&&day.milestone?dayNotes(day)[0]?.slice(0,26):'');if(!text||(!mo.tag&&!day.milestone))continue;const up=mo.delta>=0;if(captions.some(c=>c.up===up&&Math.abs(c.cx-d.cx)<(narrow?70:110)))continue;captions.push({cx:d.cx,level:d.level,text,up,key:`${d.date}-${d.index}`});}

 const lastEntry=[...state.journey].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 const arrow=(()=>{const a=dots.at(-2),b=dots.at(-1);if(!a||!b||!lastEntry||b.date!==lastEntry.date)return null;const x1=a.cx,y1=y(a.level),x2=b.cx+9*Math.cos(Math.atan2(y(b.level)-y1,b.cx-x1)),y2=y(b.level)+9*Math.sin(Math.atan2(y(b.level)-y1,b.cx-x1)),ang=Math.atan2(y2-y1,x2-x1),s=14;return [[x2-s*Math.cos(ang-.5),y2-s*Math.sin(ang-.5)],[x2,y2],[x2-s*Math.cos(ang+.5),y2-s*Math.sin(ang+.5)]] as [number,number][];})();

 // The page opens like a sketchbook: the highlighter scribbles in, then the pencil draws your line, then the dots land.
 useGSAP(()=>{const mm=whenMotionOK(()=>{
  const tl=gsap.timeline({defaults:{ease:'pen'}});
  tl.from('.rk-today .h',{drawSVG:0,duration:.5,stagger:.015,clearProps:CLEAR_DASH})
   .from('.rk-line .s',{drawSVG:0,duration:1.3,stagger:.12,clearProps:CLEAR_DASH},'-=.25')
   .from('.rk-area .h',{opacity:0,duration:.6,ease:'power1.out'},'<.4')
   .from('.journey-dot',{scale:0,transformOrigin:'50% 50%',duration:.35,stagger:{amount:.5},ease:'back.out(2.4)'},'<')
   .from('.rk-arrow .s',{drawSVG:0,duration:.3,clearProps:CLEAR_DASH},'>-.1')
   .from('.moment text, .rk-cap .s',{opacity:0,y:4,duration:.4,stagger:.05,ease:'power2.out'},'<');
 });return()=>mm.revert();},{scope:frame,dependencies:[period,end,mode]});
 useGSAP(()=>{if(!fresh)return;const mm=whenMotionOK(()=>{gsap.fromTo('[data-fresh]',{scale:0,rotation:-20},{scale:1,rotation:0,transformOrigin:'50% 50%',duration:.7,ease:'elastic.out(1,.45)'});});return()=>mm.revert();},{scope:frame,dependencies:[fresh]});

 const headline=title??(full?'Growth has its own rhythm.':mode==='inline'?'How did today move you?':'Your journey');
 const sub=subtitle??(full?'Log what happened and your line moves with it. Pick any day on the line to add to it or fix it.':mode==='inline'?'Pick how it felt and add a line. Your journey updates as you go.':'The way forward is rarely a straight line.');

 return <section className={`journey journey-${mode}`}>
  <div className="section-title"><div><h2>{headline}</h2><p>{sub}</p></div>
   {full?<div className="toolbar"><button className="icon-button" aria-label="Undo journey edit" disabled={!undos.length} onClick={()=>restore(undos,true)}><Undo2 size={17}/></button><button className="icon-button" aria-label="Redo journey edit" disabled={!redos.length} onClick={()=>restore(redos,false)}><Redo2 size={17}/></button></div>
   :onOpen&&<button className="text-button" onClick={onOpen}>Open Journey <ArrowRight size={16}/></button>}
  </div>
  {full&&<div className="chart-toolbar"><div className="segmented">{PERIODS.map(([n,t])=><button key={n} className={period===n?'selected':''} onClick={()=>{setPeriod(n);setEnd(now);}}>{t}</button>)}</div><div className="toolbar"><button className="icon-button" aria-label="Previous period" disabled={period===0} onClick={()=>setEnd(addDays(end,-Math.max(1,period||30)))}><ArrowLeft size={16}/></button><button className="text-button" onClick={()=>{setEnd(now);selectDay(now);}}>Today</button><button className="icon-button" aria-label="Next period" disabled={end>=now||period===0} onClick={()=>setEnd([addDays(end,Math.max(1,period||30)),now].sort()[0])}><ArrowRight size={16}/></button><span className="toolbar-rule"/><button className="icon-button" aria-label="Zoom in" onClick={()=>setPeriod(Math.max(7,Math.floor((period||dates.length)/2)))}><Plus size={16}/></button><button className="icon-button" aria-label="Zoom out" onClick={()=>setPeriod(Math.min(730,(period||dates.length)*2))}><Minus size={16}/></button></div></div>}
  <div className="chart-frame" ref={frame}>
   <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="application" aria-label={editable?'Your journey. Left and right arrows choose a day; up and down arrows raise or lower its latest moment; Delete removes it.':'Personal journey preview'} tabIndex={editable?0:-1} className={target.current?'is-dragging':''} style={{touchAction:editable?'none':'auto'}}
    onKeyDown={e=>{if(!editable)return;const i=idx(selected);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restore(e.shiftKey?redos:undos,!e.shiftKey);return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','PageUp','PageDown'].includes(e.key))e.preventDefault();if(e.key==='PageUp'||e.key==='PageDown')commit(setMomentLevel(state.journey,selected,activeIndex,levelOf(activeIndex)+(e.key==='PageUp'?1:-1)*Math.max(10,(max-min)/4)));if(e.key==='ArrowLeft')selectDay(dates[Math.max(0,i-1)]);if(e.key==='ArrowRight')selectDay(pickable(dates[Math.min(dates.length-1,i+1)]));if(e.key==='ArrowUp'||e.key==='ArrowDown')commit(setMomentLevel(state.journey,selected,activeIndex,levelOf(activeIndex)+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?4:1)));if(e.key==='Enter')commit(record?updateMoment(state.journey,selected,activeIndex,{delta:0}):setMomentLevel(state.journey,selected,0,emptyLevel));if(e.key==='Escape')cancel();if((e.key==='Delete'||e.key==='Backspace')&&record){e.preventDefault();removeAt(activeIndex);}}}
    onPointerDown={e=>{if(!editable){onOpen?.();return;}if(pointer.current!==null)return;const p=coordinates(e),el=e.target as SVGElement,hitDate=el.dataset?.date,hitIndex=Number(el.dataset?.index);
     if(hitDate&&Number.isFinite(hitIndex)){selectDay(hitDate,hitIndex);setHover(hitDate);beginDrag(e,hitDate,hitIndex,p.value);return;}
     const date=pickable(dates[p.index]);setHover(date);if(hasToday&&date===now){const at=xToTime(dates.length-1,p.px),added=addMoment(state.journey,now,at),base=updateMoment(added,now,dayMoments(added.find(d=>d.date===now)!).length-1,{at}),n=dayMoments(base.find(d=>d.date===now)!).findIndex(m=>m.at===at);created.current=true;setQuick(null);selectDay(now,n);beginDrag(e,now,n,p.value,base);return;}selectDay(date);}}
    onPointerMove={e=>{if(!editable)return;const p=coordinates(e);if(!target.current)setHover(dates[p.index]>now?null:dates[p.index]);if(pending.current&&pointer.current===e.pointerId&&Math.abs(p.py-pending.current.y)>8){const date=pending.current.date,m=state.journey.find(x=>x.date===date);pending.current=null;pointer.current=null;beginDrag(e,date,m?dayMoments(m).length-1:0,p.value);return;}if(target.current&&pointer.current===e.pointerId){const m=setMomentLevel(baseRef.current??state.journey,target.current.date,target.current.index,p.value);setDraft(m);draftRef.current=m;}}}
    onPointerUp={e=>{if(pointer.current!==e.pointerId)return;pending.current=null;pointer.current=null;if(target.current&&draftRef.current){const t=target.current,word=momentWord(dayMoments(draftRef.current.find(d=>d.date===t.date)!)[t.index].delta,max-min);const id=dayMoments(draftRef.current.find(d=>d.date===t.date)!)[t.index].id;commit(draftRef.current);if(created.current){setQuick({index:t.index,label:word});setQuickNote('');setFresh(id);}}else target.current=null;created.current=false;baseRef.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
    onPointerCancel={cancel} onPointerLeave={()=>{if(!target.current)setHover(null);}}>
    {/* Pencil rules on sketchbook paper */}
    {[.25,.5,.75,1].map((f,k)=><Rough key={f} className="rk-rule" shape={sk.line(L,T+f*(H-T-B),W-R,T+f*(H-T-B),{roughness:.9,bowing:.5,strokeWidth:1,seed:11+k})}/>)}
    {min<0&&max>0&&<><Rough className="rk-origin" shape={sk.line(L,y(0),hasToday?futureX:W-R,y(0),{roughness:.7,bowing:.3,strokeWidth:1.2,seed:7})}/>{full&&!narrow&&<text x={L+4} y={y(0)-8} className="chart-caption hand">where you began</text>}</>}
    {full&&<><text x={L} y={T-22} className="chart-axis hand">forward</text><text x={L} y={H-B-10} className="chart-axis hand">setback</text></>}
    {todayIndex>=0&&<><Rough className="rk-today" shape={sk.rect(left(todayIndex)+3,T+2,Math.max(10,colW(todayIndex)-6),H-T-B-4,{fillStyle:'hachure',hachureGap:11,hachureAngle:-62,fillWeight:hasToday?10:6,stroke:'none',roughness:2.4,seed:3})}/>{hasToday&&<text x={x(todayIndex)} y={T+26} textAnchor="middle" className="today-word hand">today</text>}</>}
    {hasToday&&<><Rough className="rk-ahead-edge" shape={sk.line(futureX+3,T,futureX+3,H-B,{roughness:1.4,bowing:1.5,strokeWidth:1.3,seed:5})}/>{!narrow&&<text x={futureX+futureW/2+2} y={(T+H-B)/2} textAnchor="middle" className="chart-caption hand ahead-word" transform={`rotate(-90 ${futureX+futureW/2+2} ${(T+H-B)/2})`}>the road ahead</text>}</>}
    {quiet.map(q=>{const w=q.to-q.from,mid=(q.from+q.to)/2,amp=4,steps=Math.max(2,Math.round(w/9));return <g key={`q-${q.from}`} pointerEvents="none">{w>=10&&<Rough className="rk-quiet" shape={sk.curve(Array.from({length:steps+1},(_,k)=>[q.from+3+(w-6)*k/steps,H-B-6+(k%2?-amp:amp)] as [number,number]),{roughness:.6,strokeWidth:1.3,seed:seedOf(`q${q.n}`)})}/>}<title>{q.n} quiet days</title></g>;})}
    {editable&&hover&&hover!==selected&&<rect x={left(idx(hover))} y={T} width={Math.max(8,colW(idx(hover)))} height={H-T-B} rx={8} className="day-hover" pointerEvents="none"/>}
    {dots.length>1&&<Rough className="rk-area" shape={sk.polygon([...dots.map(d=>[d.cx,y(d.level)] as [number,number]),[dots.at(-1)!.cx,H-B],[dots[0].cx,H-B]],{fillStyle:'hachure',hachureGap:8,hachureAngle:-41,fillWeight:1.1,stroke:'none',roughness:1.1,seed:13})}/>}
    {dots.length>1&&<Rough className="rk-line" shape={sk.curve(dots.map(d=>[d.cx,y(d.level)] as [number,number]),{strokeWidth:2.6,roughness:1.1,bowing:.8,seed:21})}/>}
    {!showDots&&dayEnds.map(d=><line key={`rug-${d.date}`} x1={d.cx} x2={d.cx} y1={H-B} y2={H-B-5} className="journey-rug"/>)}
    {arrow&&<Rough className="rk-arrow" shape={sk.path(arrow,{strokeWidth:2.6,roughness:.8,seed:31})}/>}
    {hasToday&&todayW>220&&<g pointerEvents="none" className="day-clock"><text x={left(dates.length-1)+dayPad(dates.length-1)+4} y={H-B-10} className="hand">morning</text><text x={left(dates.length-1)+colW(dates.length-1)/2} y={H-B-10} textAnchor="middle" className="hand">noon</text><text x={left(dates.length-1)+colW(dates.length-1)-dayPad(dates.length-1)-4} y={H-B-10} textAnchor="end" className="hand">night</text></g>}
    {guide&&!(hasToday&&guide===now)&&<line x1={x(idx(guide))} x2={x(idx(guide))} y1={T-6} y2={H-B} className="chart-guide"/>}
    {captions.map(c=>{const py=y(c.level),dy=c.up?-1:1,anchor=c.cx<L+60?'start':c.cx>W-R-60?'end':'middle';return <g key={c.key} className="moment" pointerEvents="none"><Rough className="rk-cap" shape={sk.line(c.cx,py+dy*11,c.cx+2,py+dy*24,{roughness:1.2,strokeWidth:1.2,seed:seedOf(c.key)})}/><text x={c.cx} y={py+dy*(c.up?30:40)} textAnchor={anchor} className="hand">{c.text}</text></g>;})}
    {dots.map(d=>{const day=points[d.dayIndex].entry!,sealed=!!dayMoments(day)[d.index].tag&&day.milestone,k=`${d.date}-${d.index}`,seed=seedOf(k);if(!(showDots||d.count>1||sealed))return null;
     return <g key={k} className={`journey-dot ${sealed?'tag':d.last?'last':'sub'}`} data-fresh={dayMoments(day)[d.index].id===fresh?'':undefined}>{sealed?<Rough className="rk-dot tag" shape={sk.circle(d.cx,y(d.level),20,{fillStyle:'cross-hatch',hachureGap:4,fillWeight:1,strokeWidth:1.8,roughness:1.3,seed})}/>:<Rough className={`rk-dot ${d.last?'last':'sub'}`} shape={sk.circle(d.cx,y(d.level),d.last?10:8.5,{fillStyle:'solid',strokeWidth:1.7,roughness:1.2,seed})}/>}</g>;})}
    {editable&&dots.map(d=><circle key={`hit-${d.date}-${d.index}`} data-date={d.date} data-index={d.index} cx={d.cx} cy={y(d.level)} r={narrow?16:14} className="dot-hit"/>)}
    {editable&&(selDot?<Rough className="rk-sel" shape={sk.circle(selDot.cx,y(selDot.level),target.current?34:28,{strokeWidth:2.2,roughness:1.6,seed:41})}/>:<Rough className="rk-sel" shape={sk.circle(x(idx(selected)),y(emptyLevel),20,{strokeWidth:2,roughness:1.5,seed:43})}/>)}
    {word&&selDot&&(()=>{const py=y(selDot.level),w=word.length*6.4+22,left0=Math.min(Math.max(L,selDot.cx-w/2),W-R-w),top=py-48<4?py+20:py-48;return <g className="drag-readout" pointerEvents="none"><rect x={left0} y={top} width={w} height={26} rx={13}/><text x={left0+w/2} y={top+17} textAnchor="middle">{word}</text></g>;})()}
    {ticksShown.map(i=>{const today=dates[i]===now;return <text key={i} x={today?x(i):i===0?left(0):x(i)} y={H-14} textAnchor={today||i!==0?'middle':'start'} className={`date-tick hand ${today?'is-today':''}`} onPointerDown={e=>{if(!editable)return;e.stopPropagation();selectDay(dates[i]);}}>{today?'Today':label(dates[i])}</text>;})}
    {!state.journey.length&&!draft&&!hasToday&&<g pointerEvents="none"><text x={hasToday?L+pastW/2:W/2} y={(H-B+T)/2-48} className="chart-empty hand" textAnchor="middle">{mode==='preview'?'Your line starts with one day.':narrow?'Your first day':'Your next chapter starts here.'}</text>{editable&&<text x={hasToday?L+pastW/2:W/2} y={(H-B+T)/2-16} className="chart-caption hand" textAnchor="middle">{hasToday?'Tap in today':'Log your first moment below'}</text>}</g>}
    {hasToday&&!moments.length&&selected===now&&!draft&&<g pointerEvents="none" className="today-hint"><text x={x(dates.length-1)} y={T+58} textAnchor="middle" className="hand">{narrow?'tap here':'tap anywhere in here'}</text>{!narrow&&<text x={x(dates.length-1)} y={T+82} textAnchor="middle" className="hand small">higher for a good moment, lower for a hard one</text>}</g>}
    {hasToday&&quick&&(()=>{const d=dots.find(v=>v.date===now&&v.index===quick.index);if(!d)return null;const w=Math.min(250,todayW-24),h=170,px=d.cx+18+w<=futureX?d.cx+18:Math.max(left(dates.length-1)+8,d.cx-18-w),py=Math.min(Math.max(T,y(d.level)-h/2),H-B-h);return <foreignObject x={px} y={py} width={w} height={h}><NoteCard label={quick.label} note={quickNote} onNote={setQuickNote} onSave={saveQuickNote} onDelete={()=>{removeAt(quick.index);setQuick(null);}}/></foreignObject>;})()}
   </svg>
  </div>
  <div className="chart-foot"><span><span className="dot-key"/>A moment <span className="line-key"/>Your line, joining every moment</span><span>{mode==='preview'?`${state.journey.length} ${state.journey.length===1?'day':'days'} recorded`:`${label(start)} to ${label(end)}`}</span></div>

  {editable&&<div className={`day-desk ${full?'':'compact'}`}>
   {full&&<MomentComposer key={selected} state={state} mutate={mutate} compact={!full} title={selected===now?'What happened today?':`Add to ${label(selected,{weekday:'long',month:'short',day:'numeric'})}`} onLog={m=>{log(m);}}/>}
   <section className="day-moments" aria-label={`Moments on ${label(selected,{weekday:'long',month:'long',day:'numeric'})}`}>
    <header><h3>{selected===now?'Today':label(selected,{weekday:'long',month:'long',day:'numeric'})}</h3>{record&&<p>{momentWord(record.delta,span)} overall{moments.length>1?`, across ${moments.length} moments`:''}</p>}</header>
    {deleted&&<p className="undo-bar" role="status">Moment deleted.<button className="text-button" onClick={()=>{restore(undos,true);setDeleted(null);}}><Undo2 size={15}/>Undo</button></p>}
    {moments.length?<ol>{moments.map((m,i)=><MomentCard key={m.id} m={m} i={i} count={moments.length} state={state} active={i===activeIndex} onSelect={()=>setSelMoment(i)} onEdit={p=>edit(i,p)} onDelete={()=>removeAt(i)} date={selected}/>)}</ol>
    :<p className="day-moments-empty">Nothing logged for this day yet.{selected!==now&&<button className="text-button" onClick={()=>{setEnd(now);selectDay(now);}}>Back to today</button>}</p>}
    {full&&record&&moments.length>1&&<button className="text-button danger clear-day" onClick={()=>{commit(state.journey.filter(m=>m.date!==selected));setSelMoment(null);setDeleted(`${selected}-day`);}}><Trash2 size={15}/>Clear this whole day</button>}
    {full&&<DayContext state={state} date={selected}/>}
   </section>
  </div>}
  {full&&<JourneyLog state={state} start={start} end={end} span={span} selected={selected} onSelect={d=>selectDay(d)}/>}
 </section>;
}

function JourneyLog({state,start,end,span,selected,onSelect}:{state:State;start:string;end:string;span:number;selected:string;onSelect:(d:string)=>void}){
 const days=state.journey.filter(m=>m.date>=start&&m.date<=end&&(dayNotes(m).length||dayTags(m).length)).sort((a,b)=>b.date.localeCompare(a.date));
 return <section className="journey-log"><div className="section-title"><div><h2>Journey log</h2><p>Everything you wrote on your line, newest first. {label(start)} to {label(end)}.</p></div></div>
  {days.length?<ol data-stagger>{days.map(m=><li key={m.date} className={m.date===selected?'current':''}><button onClick={()=>onSelect(m.date)}><span className="log-date">{label(m.date,{weekday:'short',month:'short',day:'numeric'})}</span><span className="log-word">{momentWord(m.delta,span)}</span></button>
   <div className="log-notes">{dayMoments(m).filter(x=>x.note.trim()||x.tag).map((x,i)=><p key={x.id}>{x.at&&dayMoments(m).length>1&&<time>{timeLabel(x.at,i)}</time>}{x.tag&&<span className="moment-tag">{x.tag}</span>}{x.note}</p>)}</div></li>)}</ol>
  :<p className="empty-inline">Notes you write for each moment collect here, so the line doubles as a log.</p>}
 </section>;
}

function DayContext({state,date}:{state:State;date:string}){
 const kept=state.logs.filter(l=>l.date===date&&l.state==='success').map(l=>state.goals.find(g=>g.id===l.goalId)).filter((g,i,a)=>g&&a.indexOf(g)===i);
 const journal=state.journals.find(j=>j.date===date&&j.kind==='daily'),proofs=state.proofs.filter(p=>p.date===date);
 return <div className="day-context"><strong>Alongside this day</strong><p className="muted-small">Recorded separately. Your line never changes on its own.</p>
  <p>{kept.length?<>Kept: {kept.map(g=>goalName(g!,state)).join(', ')}</>:'No habits recorded.'}</p>
  {proofs.map(p=><p key={p.id} className="context-proof"><span>{p.kind==='win'?'Win':p.kind==='attempt'?'Shot taken':'Lesson'}</span>{p.text}</p>)}
  <p className="context-journal">{journal?.text.trim()?`“${journal.text.trim().slice(0,200)}${journal.text.trim().length>200?'…':''}”`:'No journal entry.'}</p>
  <a href="#Journal" onClick={()=>sessionStorage.setItem('reboot-journal-date',date)}>Open this day’s journal</a>
 </div>;
}

// Five plain choices instead of guessing a height on the chart. Big steps count more than small ones.
const STEPS:{delta:number;label:string;dir:'down'|'flat'|'up';Icon:ComponentType<{size?:number}>}[]=[
 {delta:-8,label:'Big setback',dir:'down',Icon:ChevronsDown},
 {delta:-3,label:'Setback',dir:'down',Icon:ChevronDown},
 {delta:0,label:'Steady',dir:'flat',Icon:Steady},
 {delta:3,label:'Step forward',dir:'up',Icon:ChevronUp},
 {delta:8,label:'Big step',dir:'up',Icon:ChevronsUp},
];
const stepFor=(delta:number)=>delta===0?STEPS[2]:delta<0?(delta<=-6?STEPS[0]:STEPS[1]):(delta>=6?STEPS[4]:STEPS[3]);

function StepPicker({value,onChange,small=false}:{value:number|null;onChange:(d:number)=>void;small?:boolean}){
 const id=useId();
 return <div className={`step-picker ${small?'small':''}`} role="radiogroup" aria-labelledby={`${id}-l`}><span id={`${id}-l`} className="field-label">How did it move you?</span>
  <div className="steps">{STEPS.map(s=>{const on=value!==null&&stepFor(value)===s;return <button key={s.delta} type="button" role="radio" aria-checked={on} className={`step dir-${s.dir} ${on?'on':''}`} onClick={()=>onChange(s.delta)}><s.Icon size={small?15:18}/><span>{s.label}</span></button>;})}</div>
 </div>;
}

function LabelPicker({state,mutate,dir,value,onChange}:{state:State;mutate:Mutate;dir:'down'|'flat'|'up'|null;value?:string;onChange:(t?:string)=>void}){
 const custom=state.settings.customTags??[],[adding,setAdding]=useState(false),[draft,setDraft]=useState('');
 const group=TAG_GROUPS[dir==='down'?0:dir==='up'?2:1],others=TAG_GROUPS.flatMap(g=>g.tags).filter(t=>!group.tags.includes(t));
 const chip=(t:string)=><button key={t} type="button" className={`label-chip ${value===t?'on':''}`} aria-pressed={value===t} onClick={()=>onChange(value===t?undefined:t)}>{t}</button>;
 function addOwn(){const t=draft.trim().slice(0,28);if(!t)return;if(!custom.includes(t)&&!TAG_GROUPS.some(g=>g.tags.includes(t)))mutate(s=>{s.settings.customTags=[...(s.settings.customTags??[]),t];},'custom labels');onChange(t);setDraft('');setAdding(false);}
 return <div className="label-picker"><span className="field-label">Label <small>optional</small></span>
  <div className="label-chips">{group.tags.map(chip)}{custom.map(chip)}
   <select className="label-more" aria-label="More labels" value={value&&others.includes(value)?value:''} onChange={e=>onChange(e.target.value||undefined)}><option value="">More…</option>{TAG_GROUPS.filter(g=>g!==group).map(g=><optgroup key={g.name} label={g.name}>{g.tags.map(t=><option key={t}>{t}</option>)}</optgroup>)}</select>
   {adding?<span className="label-own"><input autoFocus aria-label="Your own label" value={draft} maxLength={28} placeholder="Your own label" onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addOwn();}if(e.key==='Escape')setAdding(false);}}/><button type="button" className="icon-button" aria-label="Save label" onClick={addOwn}><Check size={14}/></button></span>
   :<button type="button" className="label-chip ghost" onClick={()=>setAdding(true)}><Plus size={13}/>Your own</button>}
  </div>
 </div>;
}

// After a tap in today's column: a small card beside the new mark for an optional note.
function NoteCard({label,note,onNote,onSave,onDelete}:{label:string;note:string;onNote:(t:string)=>void;onSave:()=>void;onDelete:()=>void}){
 const stop=(e:React.SyntheticEvent)=>e.stopPropagation();
 return <form className="note-card" onPointerDown={stop} onKeyDown={stop} onSubmit={e=>{e.preventDefault();onSave();}}>
  <p className="quick-done"><Check size={15}/>{label}</p>
  <textarea autoFocus aria-label="What happened today?" value={note} maxLength={600} rows={2} placeholder="What happened? (optional)" onChange={e=>onNote(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSave();}if(e.key==='Escape')onSave();}}/>
  <div><button className="button">{note.trim()?'Save':'Done'}</button><button type="button" className="icon-button danger" aria-label="Delete this mark" title="Delete" onClick={onDelete}><Trash2 size={16}/></button></div>
 </form>;
}

function MomentComposer({state,mutate,title,compact,onLog}:{state:State;mutate:Mutate;title:string;compact:boolean;onLog:(m:{delta:number;note:string;tag?:string})=>void}){
 const [delta,setDelta]=useState<number|null>(null),[note,setNote]=useState(''),[tag,setTag]=useState<string|undefined>();
 const dir=delta===null?null:stepFor(delta).dir;
 return <form className="composer" onSubmit={e=>{e.preventDefault();if(delta===null)return;onLog({delta,note:note.trim(),tag});setDelta(null);setNote('');setTag(undefined);}}>
  <h3>{title}</h3>
  <StepPicker value={delta} onChange={setDelta}/>
  <label className="composer-note"><span className="field-label">What happened</span><textarea value={note} rows={compact?2:3} maxLength={600} placeholder="One line is enough." onChange={e=>setNote(e.target.value)}/></label>
  {!compact&&<LabelPicker state={state} mutate={mutate} dir={dir} value={tag} onChange={setTag}/>}
  <div className="composer-foot"><button className="button" disabled={delta===null}><Plus size={16}/>Add to my line</button>{delta===null&&<small>Pick how it moved you first.</small>}</div>
 </form>;
}

function MomentCard({m,i,count,state,active,date,onSelect,onEdit,onDelete}:{m:Moment;i:number;count:number;state:State;active:boolean;date:string;onSelect:()=>void;onEdit:(p:Partial<Pick<Moment,'note'|'delta'|'tag'|'at'>>)=>void;onDelete:()=>void}){
 const [editing,setEditing]=useState(false),[note,setNote]=useState(m.note),step=stepFor(m.delta);
 const custom=state.settings.customTags??[];
 if(editing)return <li className="moment-card editing">
  <StepPicker small value={m.delta} onChange={d=>onEdit({delta:d})}/>
  <div className="moment-edit-row"><label><span className="field-label">Time</span><input type="time" value={hhmm(m.at)} onChange={e=>{if(e.target.value)onEdit({at:atTime(date,e.target.value)});}}/></label>
   <label><span className="field-label">Label</span><select value={m.tag??''} onChange={e=>onEdit({tag:e.target.value||undefined})}><option value="">No label</option>{TAG_GROUPS.map(g=><optgroup key={g.name} label={g.name}>{g.tags.map(t=><option key={t}>{t}</option>)}</optgroup>)}{custom.length>0&&<optgroup label="Your labels">{custom.map(t=><option key={t}>{t}</option>)}</optgroup>}</select></label></div>
  <label><span className="field-label">What happened</span><textarea value={note} rows={3} maxLength={600} onChange={e=>setNote(e.target.value)}/></label>
  <div className="moment-actions"><button type="button" className="button" onClick={()=>{if(note!==m.note)onEdit({note});setEditing(false);}}><Check size={15}/>Done</button><button type="button" className="text-button danger" onClick={onDelete}><Trash2 size={15}/>Delete</button></div>
 </li>;
 return <li className={`moment-card dir-${step.dir} ${active?'active':''}`} onClick={onSelect}>
  <span className="moment-mark" aria-hidden="true"><step.Icon size={16}/></span>
  <div className="moment-body">
   <p className="moment-head"><strong>{step.label}</strong>{m.at&&<time>{timeLabel(m.at,i)}</time>}{m.tag&&<span className="moment-tag">{m.tag}</span>}</p>
   {m.note?<p className="moment-note">{m.note}</p>:<p className="moment-note empty">No note.</p>}
  </div>
  <div className="moment-tools"><button type="button" className="icon-button" aria-label={`Edit ${count>1?`moment ${i+1}`:'this moment'}`} title="Edit" onClick={e=>{e.stopPropagation();setNote(m.note);setEditing(true);}}><PenLine size={16}/></button><button type="button" className="icon-button danger" aria-label={`Delete ${count>1?`moment ${i+1}`:'this moment'}`} title="Delete" onClick={e=>{e.stopPropagation();onDelete();}}><Trash2 size={16}/></button></div>
 </li>;
}

function penPath(p:[number,number][]){if(!p.length)return '';if(p.length<3)return p.map((q,i)=>`${i?'L':'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
 const t=.5/3;let d=`M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
 for(let i=0;i<p.length-1;i++){const a=p[i-1]??p[i],b=p[i],c=p[i+1],e=p[i+2]??c;
  // Control points stay within the segment's vertical span so the curve never overshoots a high or a low.
  const lo=Math.min(b[1],c[1]),hi=Math.max(b[1],c[1]),cl=(v:number)=>Math.min(hi,Math.max(lo,v));
  d+=` C${(b[0]+(c[0]-a[0])*t).toFixed(1)},${cl(b[1]+(c[1]-a[1])*t).toFixed(1)} ${(c[0]-(e[0]-b[0])*t).toFixed(1)},${cl(c[1]-(e[1]-b[1])*t).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;}
 return d;}
