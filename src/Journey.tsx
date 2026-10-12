import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Undo2,Redo2,Minus,Plus,X} from './icons';
import type {State,Movement} from './model';
import type {Mutate} from './GoalControls';
import {addDays,range,label} from './dates';
import {cumulative,journeyLevels,setMomentLevel,addMoment,updateMoment,removeMoment,dayMoments,dayNotes,dayTags,momentWord,TAG_GROUPS} from './engine';
import {goalName} from './Board';

type Mode='full'|'inline'|'preview';
type Dot={date:string;index:number;count:number;cx:number;level:number;delta:number;dayIndex:number;last:boolean};
const PERIODS:[number,string][]=[[7,'7 days'],[30,'30 days'],[90,'90 days'],[365,'Year'],[0,'All time']];
const hhmm=(at?:string)=>{if(!at)return '';const d=new Date(at);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const atTime=(date:string,time:string)=>{const [y,mo,d]=date.split('-').map(Number),[h,mi]=time.split(':').map(Number);return new Date(y,mo-1,d,h,mi).toISOString();};
const timeLabel=(at:string,i:number)=>at?new Date(at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):`Moment ${i+1}`;

export function Journey({state,mutate,now,mode='full',days=14,onOpen,title,subtitle,focus}:{state:State;mutate:Mutate;now:string;mode?:Mode;days?:number;onOpen?:()=>void;title?:string;subtitle?:string;focus?:string}){
 const editable=mode!=='preview',full=mode==='full';
 const [period,setPeriod]=useState(full?30:days),[end,setEnd]=useState(()=>focus?[addDays(focus,Math.floor(days/3)),now].sort()[0]:now),[selected,setSelected]=useState(focus??now),[selMoment,setSelMoment]=useState<number|null>(null),[draft,setDraft]=useState<Movement[]|null>(null),[undos,setUndos]=useState<Movement[][]>([]),[redos,setRedos]=useState<Movement[][]>([]),[hover,setHover]=useState<string|null>(null),[width,setWidth]=useState(1100);
 const pointer=useRef<number|null>(null),pending=useRef<{date:string;y:number}|null>(null),target=useRef<{date:string;index:number}|null>(null),svg=useRef<SVGSVGElement>(null),frozen=useRef<[number,number]|null>(null),draftRef=useRef<Movement[]|null>(null),noteFocus=useRef<string|null>(null);
 useEffect(()=>{if(!svg.current)return;const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));observer.observe(svg.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{setEnd(e=>e>now?now:e);},[now]);

 const earliest=state.journey.map(m=>m.date).sort()[0]??addDays(now,-29);
 const start=period===0?[earliest,addDays(end,-6)].sort()[0]:addDays(end,1-period);
 const dates=useMemo(()=>range(start,end),[start,end]);
 useEffect(()=>{if(selected<start||selected>end)setSelected(end);},[start,end,selected]);
 function selectDay(d:string,index:number|null=null){setSelected(d);setSelMoment(index);}

 const shown=draft??state.journey,points=cumulative(shown,dates),values=journeyLevels(state.journey,dates);
 // Fit the scale to your line with generous headroom, so a big day can make a big jump. Frozen while dragging; refits on release.
 const dataLo=Math.min(...values),dataHi=Math.max(...values),pad=Math.max(10,(dataHi-dataLo)*.5),lo=dataLo-pad,hi=dataHi+pad,[mapMin,mapMax]=frozen.current??[lo,hi];
 // While dragging, the pointer keeps the scale it started with (so the point never runs away), but the view widens to keep the whole line in sight.
 const draftLevels=draft?journeyLevels(draft,dates):[],min=draft?Math.min(mapMin,...draftLevels.map(v=>v-pad*.25)):mapMin,max=draft?Math.max(mapMax,...draftLevels.map(v=>v+pad*.25)):mapMax;
 const narrow=width<600,W=Math.max(300,width);
 const H=full?(narrow?360:470):mode==='inline'?(narrow?230:250):210;
 const L=narrow?14:full?46:20,R=narrow?22:full?40:28,T=full?56:40,B=full?50:40;
 const slot=(W-L-R)/Math.max(1,dates.length-1);
 const x=(i:number)=>L+i*slot,y=(v:number)=>T+(max-v)/(max-min)*(H-T-B);
 const idx=(d:string)=>Math.max(0,dates.indexOf(d));
 const record=state.journey.find(m=>m.date===selected),liveRecord=shown.find(m=>m.date===selected);
 const moments=record?dayMoments(record):[],activeIndex=selMoment!==null&&selMoment<moments.length?selMoment:Math.max(0,moments.length-1);

 // Every moment is a dot. A day's moments share the space leading up to it, so its last moment lands on the day itself.
 const dots:Dot[]=[];
 points.forEach((p,i)=>{if(!p.entry)return;const ms=dayMoments(p.entry);let level=p.value-p.entry.delta;ms.forEach((m,j)=>{level+=m.delta;dots.push({date:p.date,index:j,count:ms.length,cx:x(i)-(ms.length-1-j)/ms.length*slot*.8,level,delta:m.delta,dayIndex:i,last:j===ms.length-1});});});
 const dayEnds=dots.filter(d=>d.last);
 // A fountain-pen stroke: a gentle curve through every moment. It passes exactly through each point, so no high or low is smoothed away.
 const line=penPath(dots.map(d=>[d.cx,y(d.level)] as [number,number]));
 const area=dots.length>1?`${line} L${dots.at(-1)!.cx},${H-B} L${dots[0].cx},${H-B} Z`:'';
 const selDot=dots.find(d=>d.date===selected&&d.index===(target.current?.date===selected?target.current.index:activeIndex));
 const emptyLevel=points.find(p=>p.date===selected)?.value??0;

 function commit(m:Movement[]){setUndos(u=>[...u.slice(-49),state.journey]);setRedos([]);mutate(s=>{s.journey=m;},'journey edit');setDraft(null);draftRef.current=null;frozen.current=null;target.current=null;}
 function cancel(){pointer.current=null;pending.current=null;target.current=null;frozen.current=null;setDraft(null);draftRef.current=null;}
 function coordinates(e:React.PointerEvent<SVGSVGElement>){const r=e.currentTarget.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*W,py=(e.clientY-r.top)/r.height*H;return {index:Math.max(0,Math.min(dates.length-1,Math.round((px-L)/slot))),value:mapMax-(py-T)/(H-T-B)*(mapMax-mapMin),py};}
 function beginDrag(e:React.PointerEvent<SVGSVGElement>,date:string,index:number,value:number){target.current={date,index};pointer.current=e.pointerId;frozen.current=[lo,hi];e.currentTarget.setPointerCapture(e.pointerId);const m=setMomentLevel(state.journey,date,index,value);setDraft(m);draftRef.current=m;}
 function restore(from:Movement[][],undo:boolean){if(!from.length)return;const previous=from.at(-1)!;if(undo){setUndos(from.slice(0,-1));setRedos(r=>[...r,state.journey]);}else{setRedos(from.slice(0,-1));setUndos(u=>[...u,state.journey]);}mutate(s=>{s.journey=previous;},undo?'journey undo':'journey redo');}
 function patchDay(p:Partial<Movement>,entity:string){mutate(s=>{const m=s.journey.find(m=>m.date===selected);if(m)Object.assign(m,p);},entity);}
 function editNote(date:string,index:number,note:string){mutate(s=>{s.journey=updateMoment(s.journey,date,index,{note});},`journey note ${date}`);}
 function setTag(index:number,tag?:string){mutate(s=>{s.journey=updateMoment(s.journey,selected,index,{tag});const d=s.journey.find(m=>m.date===selected);if(d&&tag)d.milestone=true;},'journey moment');}
 function addAnother(){const next=addMoment(state.journey,selected);commit(next);const n=dayMoments(next.find(m=>m.date===selected)!).length-1;setSelMoment(n);noteFocus.current=`${selected}-${n}`;}
 function steady(){const startLevel=state.journey.filter(m=>m.date<selected).reduce((n,m)=>n+m.delta,0);commit(setMomentLevel(state.journey,selected,0,startLevel));}
 const levelOf=(index:number)=>dots.find(d=>d.date===selected&&d.index===index)?.level??emptyLevel;

 const ticks=narrow?3:mode==='full'?7:4,tickIndices=Array.from(new Set([0,...Array.from({length:ticks-1},(_,i)=>Math.round((i+1)*(dates.length-1)/ticks)),dates.length-1]));
 const showDots=dates.length<=62,guide=editable?hover??selected:null,todayIndex=dates.indexOf(now);
 const span=max-min,dragged=draft&&target.current?dayMoments(shown.find(m=>m.date===target.current!.date)!)[target.current.index]:null,word=dragged?momentWord(dragged.delta,span):null;

 // Every labelled moment gets its caption on its own dot, thinned so neighbours never collide.
 const captions:{cx:number;level:number;text:string;up:boolean;key:string}[]=[];
 for(const d of dots){const day=points[d.dayIndex].entry!,mo=dayMoments(day)[d.index];const text=mo.tag||(d.last&&day.milestone?dayNotes(day)[0]?.slice(0,26):'');if(!text||(!mo.tag&&!day.milestone))continue;const up=mo.delta>=0;if(captions.some(c=>c.up===up&&Math.abs(c.cx-d.cx)<(narrow?70:110)))continue;captions.push({cx:d.cx,level:d.level,text,up,key:`${d.date}-${d.index}`});}

 const lastEntry=[...state.journey].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 const arrow=(()=>{const a=dots.at(-2),b=dots.at(-1);if(!a||!b||!lastEntry||b.date!==lastEntry.date)return null;const x1=a.cx,y1=y(a.level),x2=b.cx,y2=y(b.level),ang=Math.atan2(y2-y1,x2-x1),s=13;return `M${x2+3*Math.cos(ang)},${y2+3*Math.sin(ang)} L${x2-s*Math.cos(ang-0.42)},${y2-s*Math.sin(ang-0.42)} Q${x2-s*.62*Math.cos(ang)},${y2-s*.62*Math.sin(ang)} ${x2-s*Math.cos(ang+0.42)},${y2-s*Math.sin(ang+0.42)} Z`;})();

 const headline=title??(full?'Growth has its own rhythm.':mode==='inline'?'How did today move you?':'Your journey');
 const sub=subtitle??(full?'Pick a day, then click higher or lower, or drag its point. A day can hold several moments.':mode==='inline'?'Click above or below the line for today. Drag to adjust. No numbers needed.':'The way forward is rarely a straight line.');
 const noteRef=(key:string)=>(el:HTMLTextAreaElement|HTMLInputElement|null)=>{if(el&&noteFocus.current===key){el.focus();noteFocus.current=null;}};

 return <section className={`journey journey-${mode}`}>
  <div className="section-title"><div><h2>{headline}</h2><p>{sub}</p></div>
   {full?<div className="toolbar"><button className="icon-button" aria-label="Undo journey edit" disabled={!undos.length} onClick={()=>restore(undos,true)}><Undo2 size={17}/></button><button className="icon-button" aria-label="Redo journey edit" disabled={!redos.length} onClick={()=>restore(redos,false)}><Redo2 size={17}/></button></div>
   :onOpen&&<button className="text-button" onClick={onOpen}>Open Journey <ArrowRight size={16}/></button>}
  </div>
  {full&&<div className="chart-toolbar"><div className="segmented">{PERIODS.map(([n,t])=><button key={n} className={period===n?'selected':''} onClick={()=>{setPeriod(n);setEnd(now);}}>{t}</button>)}</div><div className="toolbar"><button className="icon-button" aria-label="Previous period" disabled={period===0} onClick={()=>setEnd(addDays(end,-Math.max(1,period||30)))}><ArrowLeft size={16}/></button><button className="text-button" onClick={()=>{setEnd(now);selectDay(now);}}>Today</button><button className="icon-button" aria-label="Next period" disabled={end>=now||period===0} onClick={()=>setEnd([addDays(end,Math.max(1,period||30)),now].sort()[0])}><ArrowRight size={16}/></button><span className="toolbar-rule"/><button className="icon-button" aria-label="Zoom in" onClick={()=>setPeriod(Math.max(7,Math.floor((period||dates.length)/2)))}><Plus size={16}/></button><button className="icon-button" aria-label="Zoom out" onClick={()=>setPeriod(Math.min(730,(period||dates.length)*2))}><Minus size={16}/></button></div></div>}
  <div className="chart-frame">
   <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="application" aria-label={editable?'Editable personal journey. Left and right arrows choose a day; up and down arrows raise or lower the selected moment; Enter records a steady moment; Escape cancels a drag.':'Personal journey preview'} tabIndex={editable?0:-1} className={target.current?'is-dragging':''} style={{touchAction:editable?'none':'auto'}}
    onKeyDown={e=>{if(!editable)return;const i=idx(selected);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restore(e.shiftKey?redos:undos,!e.shiftKey);return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','PageUp','PageDown'].includes(e.key))e.preventDefault();if(e.key==='PageUp'||e.key==='PageDown')commit(setMomentLevel(state.journey,selected,activeIndex,levelOf(activeIndex)+(e.key==='PageUp'?1:-1)*Math.max(10,(max-min)/4)));if(e.key==='ArrowLeft')selectDay(dates[Math.max(0,i-1)]);if(e.key==='ArrowRight')selectDay(dates[Math.min(dates.length-1,i+1)]);if(e.key==='ArrowUp'||e.key==='ArrowDown')commit(setMomentLevel(state.journey,selected,activeIndex,levelOf(activeIndex)+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?4:1)));if(e.key==='Enter')commit(record?updateMoment(state.journey,selected,activeIndex,{delta:0}):setMomentLevel(state.journey,selected,0,emptyLevel));if(e.key==='Escape')cancel();}}
    onPointerDown={e=>{if(!editable){onOpen?.();return;}if(pointer.current!==null)return;const p=coordinates(e),el=e.target as SVGElement,hitDate=el.dataset?.date,hitIndex=Number(el.dataset?.index);
     if(hitDate&&Number.isFinite(hitIndex)){selectDay(hitDate,hitIndex);setHover(hitDate);beginDrag(e,hitDate,hitIndex,p.value);return;}
     const date=dates[p.index];setHover(date);if(date===selected){beginDrag(e,date,record?activeIndex:0,p.value);}else{selectDay(date);pending.current={date,y:p.py};pointer.current=e.pointerId;}}}
    onPointerMove={e=>{if(!editable)return;const p=coordinates(e);if(!target.current)setHover(dates[p.index]);if(pending.current&&pointer.current===e.pointerId&&Math.abs(p.py-pending.current.y)>8){const date=pending.current.date,m=state.journey.find(x=>x.date===date);pending.current=null;pointer.current=null;beginDrag(e,date,m?dayMoments(m).length-1:0,p.value);return;}if(target.current&&pointer.current===e.pointerId){const m=setMomentLevel(state.journey,target.current.date,target.current.index,p.value);setDraft(m);draftRef.current=m;}}}
    onPointerUp={e=>{if(pointer.current!==e.pointerId)return;pending.current=null;pointer.current=null;if(target.current&&draftRef.current)commit(draftRef.current);else target.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
    onPointerCancel={cancel} onPointerLeave={()=>{if(!target.current)setHover(null);}}>
    <defs><linearGradient id={`wash-${mode}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" className="wash-stop-top"/><stop offset="100%" className="wash-stop-bottom"/></linearGradient></defs>
    {[0,.25,.5,.75,1].map(f=><line key={f} x1={L} x2={W-R} y1={T+f*(H-T-B)} y2={T+f*(H-T-B)} className="chart-rule"/>)}
    {min<0&&max>0&&<><line x1={L} x2={W-R} y1={y(0)} y2={y(0)} className="chart-origin"/>{full&&!narrow&&<text x={W-R} y={y(0)-6} textAnchor="end" className="chart-caption">where you began</text>}</>}
    {full&&<><text x={L} y={T-24} className="chart-axis">Forward</text><text x={L} y={H-B+20} className="chart-axis">Setback</text></>}
    {todayIndex>=0&&(()=>{const half=Math.max(6,slot/2),x0=Math.max(L,x(todayIndex)-half),x1=Math.min(W-R+8,x(todayIndex)+half);return <rect x={x0} y={T} width={x1-x0} height={H-T-B} className="today-band"/>;})()}
    {area&&<path d={area} fill={`url(#wash-${mode})`} className="journey-area"/>}
    {dots.length>1&&<><path d={line} className="journey-line-shadow"/><path d={line} className="journey-line"/></>}
    {!showDots&&dayEnds.map(d=><line key={`rug-${d.date}`} x1={d.cx} x2={d.cx} y1={H-B} y2={H-B-5} className="journey-rug"/>)}
    {arrow&&<path d={arrow} className="journey-arrow"/>}
    {guide&&<line x1={x(idx(guide))} x2={x(idx(guide))} y1={T-6} y2={H-B} className="chart-guide"/>}
    {captions.map(c=>{const py=y(c.level),dy=c.up?-1:1,anchor=c.cx<L+60?'start':c.cx>W-R-60?'end':'middle';return <g key={c.key} className="moment" pointerEvents="none"><line x1={c.cx} x2={c.cx} y1={py+dy*8} y2={py+dy*22}/><text x={c.cx} y={py+dy*(c.up?28:36)} textAnchor={anchor}>{c.text}</text></g>;})}
    {dots.map(d=>{const day=points[d.dayIndex].entry!,sealed=!!dayMoments(day)[d.index].tag&&day.milestone;const k=`${d.date}-${d.index}`,data={'data-date':editable?d.date:undefined,'data-index':editable?d.index:undefined};if(sealed)return <g key={k} className="wax-seal"><circle {...data} cx={d.cx} cy={y(d.level)} r={8}/><circle cx={d.cx} cy={y(d.level)} r={4.6} className="seal-ring" pointerEvents="none"/></g>;return (showDots||d.count>1)&&<circle key={k} {...data} cx={d.cx} cy={y(d.level)} r={d.last?3.4:2.8} className={d.last?'journey-dot':'journey-dot sub'}/>;})}
    {editable&&(selDot?<circle cx={selDot.cx} cy={y(selDot.level)} r={target.current?9:7} className="selected-dot" pointerEvents="none"/>:<circle cx={x(idx(selected))} cy={y(emptyLevel)} r={7} className="selected-dot empty" pointerEvents="none"/>)}
    {word&&selDot&&(()=>{const py=y(selDot.level),w=word.length*6.4+22,left=Math.min(Math.max(L,selDot.cx-w/2),W-R-w),top=py-44<4?py+16:py-44;return <g className="drag-readout" pointerEvents="none"><rect x={left} y={top} width={w} height={26} rx={13}/><text x={left+w/2} y={top+17} textAnchor="middle">{word}</text></g>;})()}
    {tickIndices.map(i=><text key={i} x={x(i)} y={H-14} textAnchor={i===0?'start':i===dates.length-1?'end':'middle'} className={`date-tick ${dates[i]===now?'is-today':''}`} onPointerDown={e=>{if(!editable)return;e.stopPropagation();selectDay(dates[i]);}}>{dates[i]===now?'Today':label(dates[i])}</text>)}
    {!state.journey.length&&!draft&&<g pointerEvents="none"><text x={W/2} y={(H-B+T)/2-8} className="chart-empty" textAnchor="middle">{mode==='preview'?'Your line starts with one day.':narrow?'Draw your first day.':'Your next chapter starts here.'}</text>{editable&&<text x={W/2} y={(H-B+T)/2+20} className="chart-caption" textAnchor="middle">{mode==='inline'||selected===now?'Click above the line for a good day, below for a hard one':'Pick a day, then place its point'}</text>}</g>}
   </svg>
  </div>
  <div className="chart-foot"><span><span className="dot-key"/>A moment <span className="line-key"/>Your line, joining every moment</span><span>{mode==='preview'?`${state.journey.length} ${state.journey.length===1?'day':'days'} recorded`:`${label(start)} to ${label(end)}`}</span></div>

  {mode==='inline'&&<div className="inline-day">
   <div className="inline-day-head"><span><strong>{selected===now?'Today':label(selected,{weekday:'long',month:'short',day:'numeric'})}</strong>{record?` · ${momentWord(record.delta,span)}${moments.length>1?` across ${moments.length} moments`:''}`:' · not marked yet'}</span>
    <span className="toolbar">{record?<button className="text-button" onClick={addAnother}><Plus size={15}/>Another moment</button>:<button className="text-button" onClick={steady}>It was a steady day</button>}</span></div>
   {record&&<input className="inline-note" ref={noteRef(`${selected}-${activeIndex}`)} aria-label="What happened?" placeholder={moments.length>1?`What happened at ${timeLabel(moments[activeIndex].at,activeIndex).toLowerCase()}?`:'What happened? A line is enough.'} value={moments[activeIndex]?.note??''} onChange={e=>editNote(selected,activeIndex,e.target.value)}/>}
   {record&&<TagSelect state={state} value={moments[activeIndex]?.tag} onChange={t=>setTag(activeIndex,t)}/>}
  </div>}

  {full&&<><div className="day-reflection">
   <header className="day-panel-head"><div><h3>{label(selected,{weekday:'long',month:'long',day:'numeric'})}</h3><p className="day-word">{record?`${momentWord(record.delta,span)} overall${moments.length>1?`, across ${moments.length} moments`:''}`:'No mark yet. Click on the graph to place this day.'}</p></div>
    <div className="day-actions">{record?<button className="button secondary" onClick={addAnother}><Plus size={15}/>Add another moment</button>:<button className="button secondary" onClick={steady}>Mark a steady day</button>}{record&&<button className="text-button danger" onClick={()=>{commit(state.journey.filter(m=>m.date!==selected));setSelMoment(null);}}>Remove this day</button>}</div></header>
   <div className="day-log"><span className="field-label">What happened</span>
    {record?<ol>{moments.map((m,i)=><li key={m.id} className={i===activeIndex?'active':''} onClick={()=>setSelMoment(i)}>
      <div className="day-log-head"><input type="time" className="moment-time" aria-label={`Time of moment ${i+1}`} value={hhmm(m.at)} onClick={e=>e.stopPropagation()} onChange={e=>{if(!e.target.value)return;commit(updateMoment(state.journey,selected,i,{at:atTime(selected,e.target.value)}));setSelMoment(null);}}/><span className="day-log-word">{momentWord(m.delta,span)}</span>{m.tag&&<span className="moment-tag">{m.tag}</span>}{moments.length>1&&<button className="icon-button" aria-label={`Remove ${timeLabel(m.at,i)}`} onClick={e=>{e.stopPropagation();commit(removeMoment(state.journey,selected,i));setSelMoment(null);}}><X size={14}/></button>}</div>
      <textarea ref={noteRef(`${selected}-${i}`)} aria-label={i===0&&moments.length===1?'A note about this day':`Note for ${timeLabel(m.at,i)}`} value={m.note} placeholder="What happened, how it felt, what you learned…" onFocus={()=>setSelMoment(i)} onChange={e=>editNote(selected,i,e.target.value)}/>
     </li>)}</ol>
    :<p className="muted">Place this day on the graph, then write what happened.</p>}
    {record&&<button className="add-moment" onClick={addAnother}><Plus size={16}/>Something else happened today<small>Each moment gets its own dot, time, label and note</small></button>}
   </div>
   <aside className="day-side">
    <TagPicker state={state} mutate={mutate} title={moments.length>1?`Label ${hhmm(moments[activeIndex]?.at)?`the ${timeLabel(moments[activeIndex].at,activeIndex)} moment`:`moment ${activeIndex+1}`}`:'Name this moment'} value={moments[activeIndex]?.tag} disabled={!record} onChange={t=>setTag(activeIndex,t)}/>
    <label className="checkbox-label"><input type="checkbox" checked={record?.milestone??false} disabled={!record} onChange={e=>patchDay({milestone:e.target.checked},'journey milestone')}/>Show this day&rsquo;s labels on the line</label>
   <DayContext state={state} date={selected}/>
   </aside>
  </div>
  <JourneyLog state={state} start={start} end={end} span={span} selected={selected} onSelect={d=>selectDay(d)}/></>}
 </section>;
}

function JourneyLog({state,start,end,span,selected,onSelect}:{state:State;start:string;end:string;span:number;selected:string;onSelect:(d:string)=>void}){
 const days=state.journey.filter(m=>m.date>=start&&m.date<=end&&(dayNotes(m).length||dayTags(m).length)).sort((a,b)=>b.date.localeCompare(a.date));
 return <section className="journey-log"><div className="section-title"><div><h2>Journey log</h2><p>Everything you wrote on your line, newest first. {label(start)} to {label(end)}.</p></div></div>
  {days.length?<ol>{days.map(m=><li key={m.date} className={m.date===selected?'current':''}><button onClick={()=>onSelect(m.date)}><span className="log-date">{label(m.date,{weekday:'short',month:'short',day:'numeric'})}</span><span className="log-word">{momentWord(m.delta,span)}</span></button>
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

function TagPicker({state,mutate,value,disabled,onChange,title='Name this moment'}:{state:State;mutate:Mutate;value?:string;disabled:boolean;onChange:(t?:string)=>void;title?:string}){
 const [draft,setDraft]=useState(''),custom=state.settings.customTags??[];
 const chip=(t:string,own=false)=><span key={t} className="tag-chip"><button disabled={disabled} className={value===t?'selected':''} aria-pressed={value===t} onClick={()=>onChange(value===t?undefined:t)}>{t}</button>{own&&<button className="tag-remove" aria-label={`Delete label ${t}`} onClick={()=>mutate(s=>{s.settings.customTags=(s.settings.customTags??[]).filter(x=>x!==t);},'custom labels')}><X size={11}/></button>}</span>;
 function add(e:React.FormEvent){e.preventDefault();const t=draft.trim().slice(0,28);if(!t)return;if(!custom.includes(t)&&!TAG_GROUPS.some(g=>g.tags.includes(t)))mutate(s=>{s.settings.customTags=[...(s.settings.customTags??[]),t];},'custom labels');if(!disabled)onChange(t);setDraft('');}
 return <div className="tag-picker"><span className="field-label">{title}</span>
  {TAG_GROUPS.map(g=><div key={g.name} className="tag-group"><span>{g.name}</span><div className="tag-row">{g.tags.map(t=>chip(t))}</div></div>)}
  {custom.length>0&&<div className="tag-group"><span>Your labels</span><div className="tag-row">{custom.map(t=>chip(t,true))}</div></div>}
  <form className="tag-custom" onSubmit={add}><input aria-label="Your own label" value={draft} maxLength={28} placeholder="Your own label" onChange={e=>setDraft(e.target.value)}/><button className="button secondary" disabled={!draft.trim()}><Plus size={14}/>Add</button></form>
 </div>;
}

function TagSelect({state,value,onChange}:{state:State;value?:string;onChange:(t?:string)=>void}){
 const custom=state.settings.customTags??[],known=TAG_GROUPS.some(g=>g.tags.includes(value??''))||custom.includes(value??'');
 return <select className="tag-select" aria-label="Name this day" value={value??''} onChange={e=>onChange(e.target.value||undefined)}><option value="">Name this day</option>{TAG_GROUPS.map(g=><optgroup key={g.name} label={g.name}>{g.tags.map(t=><option key={t}>{t}</option>)}</optgroup>)}{custom.length>0&&<optgroup label="Your labels">{custom.map(t=><option key={t}>{t}</option>)}</optgroup>}{value&&!known&&<option>{value}</option>}</select>;
}

function penPath(p:[number,number][]){if(!p.length)return '';if(p.length<3)return p.map((q,i)=>`${i?'L':'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
 const t=.5/3;let d=`M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
 for(let i=0;i<p.length-1;i++){const a=p[i-1]??p[i],b=p[i],c=p[i+1],e=p[i+2]??c;
  // Control points stay within the segment's vertical span so the curve never overshoots a high or a low.
  const lo=Math.min(b[1],c[1]),hi=Math.max(b[1],c[1]),cl=(v:number)=>Math.min(hi,Math.max(lo,v));
  d+=` C${(b[0]+(c[0]-a[0])*t).toFixed(1)},${cl(b[1]+(c[1]-a[1])*t).toFixed(1)} ${(c[0]-(e[0]-b[0])*t).toFixed(1)},${cl(c[1]-(e[1]-b[1])*t).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;}
 return d;}
