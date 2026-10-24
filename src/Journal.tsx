import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Search,ArrowLeft,ArrowRight,ChevronDown,ImagePlus,Check,Plus,Maximize2,Minimize2,X} from './icons';
import type {State,Journal as Entry} from './model';
import type {Mutate} from './GoalControls';
import {label,parse,addDays,weekStart} from './dates';
import {Count} from './Count';
import {dayState} from './engine';
import {ProofQuickAdd} from './Proof';
import {dayPlan,finished} from './training';
import {applyMood,setEntryText} from './mood';
import {gsap,useGSAP,whenMotionOK} from './motion';

const MOODS=['Great','Good','Okay','Low','Difficult'];
const tone=(m?:string)=>m?`tone-${m.toLowerCase()}`:'';
const shiftMonth=(ym:string,n:number)=>{const [y,m]=ym.split('-').map(Number),d=new Date(y,m-1+n,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const KINDS:[Entry['kind'],string][]=[['daily','Daily'],['weekly','Weekly review'],['monthly','Monthly review']];
const JOURNAL_GOAL='07';

export function Journal({state,mutate,now,reviewKind}:{state:State;mutate:Mutate;now:string;reviewKind?:'weekly'|'monthly'}){
 const [date,setDate]=useState(()=>{const d=sessionStorage.getItem('reboot-journal-date');sessionStorage.removeItem('reboot-journal-date');return d&&d<=now?d:now;});
 const [search,setSearch]=useState(''),[moodFilter,setMoodFilter]=useState('All moods'),[error,setError]=useState(''),[kind,setKind]=useState<Entry['kind']>(()=>{if(reviewKind)return reviewKind;let k:string|null=null;try{k=sessionStorage.getItem('reboot-journal-kind');sessionStorage.removeItem('reboot-journal-kind');}catch{/* fine */}return k==='weekly'||k==='monthly'?k:'daily';}),[focus,setFocus]=useState(false);
 const entry=state.journals.find(j=>j.date===date&&j.kind===kind),text=entry?.text??'';
 const area=useRef<HTMLTextAreaElement>(null);
 useLayoutEffect(()=>{const a=area.current;if(!a)return;a.style.height='auto';a.style.height=`${Math.max(a.scrollHeight,focus?520:360)}px`;},[text,focus,date,kind]);
 useEffect(()=>{document.body.classList.toggle('focus-writing',focus);const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setFocus(false);};if(focus){window.addEventListener('keydown',esc);area.current?.focus();}return()=>{window.removeEventListener('keydown',esc);document.body.classList.remove('focus-writing');};},[focus]);

 function update(p:Partial<Entry>){mutate(s=>{const idx=s.journals.findIndex(j=>j.date===date&&j.kind===kind),old=idx>=0?s.journals[idx]:undefined;const e:Entry={date,text:'',mood:'',goals:[],attachments:[],kind,...old,...p,updatedAt:new Date().toISOString()};if(idx>=0)s.journals[idx]=e;else s.journals.push(e);},`journal ${kind} ${date}`);}
 function insertPrompt(p:string){update({text:(text.trim()?text.replace(/\s*$/,'')+'\n\n':'')+p+'\n'});requestAnimationFrame(()=>{const a=area.current;if(a){a.focus();a.setSelectionRange(a.value.length,a.value.length);}});}

 const q=search.trim().toLowerCase();
 const filtered=state.journals.filter(j=>j.text.trim()&&(!q||j.text.toLowerCase().includes(q))&&(moodFilter==='All moods'||j.mood===moodFilter)).sort((a,b)=>b.date.localeCompare(a.date));
 const prompts=reviewKind||kind!=='daily'?['What improved?','What did not work?',`What will I change next ${(reviewKind??kind)==='weekly'?'week':'month'}?`]:['What went well?','What did I struggle with?','What will I change tomorrow?','What am I proud of, even quietly?'];
 const words=text.trim().split(/\s+/).filter(Boolean).length;
 const journalGoal=state.goals.find(g=>g.id===JOURNAL_GOAL)!,counted=dayState(journalGoal,state.logs,date)==='success';
 const streakDays=(()=>{let n=0,d=now;if(!hasEntry(state,d))d=addDays(d,-1);while(hasEntry(state,d)){n++;d=addDays(d,-1);}return n;})();
 // The week you are in sits across the desk; the whole month opens from its name.
 const [monthOpen,setMonthOpen]=useState(false),[view,setView]=useState(date.slice(0,7));
 const ws=weekStart(date),week=Array.from({length:7},(_,i)=>addDays(ws,i));
 const [vy,vm]=view.split('-').map(Number),vCount=new Date(vy,vm,0).getDate(),vOffset=(new Date(vy,vm-1,1).getDay()+6)%7;
 const viewDays=Array.from({length:vCount},(_,i)=>`${view}-${String(i+1).padStart(2,'0')}`);
 useEffect(()=>{if(!monthOpen)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setMonthOpen(false);};const down=(e:MouseEvent)=>{if(!(e.target instanceof Element&&e.target.closest('.month-pop,.month-toggle')))setMonthOpen(false);};
  window.addEventListener('keydown',key);document.addEventListener('mousedown',down);return()=>{window.removeEventListener('keydown',key);document.removeEventListener('mousedown',down);};},[monthOpen]);
 const paper=useRef<HTMLDivElement>(null),aside=useRef<HTMLDivElement>(null),countBox=useRef<HTMLDivElement>(null),wasCounted=useRef({key:date+kind,counted});
 // Picking a day turns the page: the sheet settles, then "Dear me," and your signature are written in with the pen.
 useGSAP(()=>{const mm=whenMotionOK(()=>{const blank={clipPath:'inset(-30% 100% -30% 0)'},inked={clipPath:'inset(-30% 0% -30% 0)',ease:'pen',clearProps:'clipPath'};
  gsap.timeline().from(paper.current,{y:14,rotation:-.6,opacity:0,duration:.45,ease:'power3.out',clearProps:'transform,opacity'})
   .fromTo('.salutation',blank,{...inked,duration:.8},'-=.15').fromTo('.signoff span',blank,{...inked,duration:.7},'-=.35');
 });return()=>mm.revert();},{dependencies:[date,kind],scope:paper});
 // A new month lays its days out one by one.
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from('.week-days button',{opacity:0,y:8,duration:.32,stagger:.03,ease:'power2.out',clearProps:'opacity,transform'});});return()=>mm.revert();},{dependencies:[ws],scope:aside});
 // Counting the entry toward your goal presses a small wax seal onto it.
 useGSAP(()=>{const prev=wasCounted.current;wasCounted.current={key:date+kind,counted};if(!counted||prev.counted||prev.key!==date+kind)return;
  const mm=whenMotionOK(()=>{gsap.timeline().from('.count-seal',{scale:2.4,rotation:-40,opacity:0,duration:.42,ease:'stamp'}).fromTo(countBox.current,{x:0},{keyframes:{x:[0,-4,3,-2,0]},duration:.3,ease:'none'},'-=.08');});return()=>mm.revert();},{dependencies:[counted,date,kind],scope:countBox});

 const attach=async(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)){setError('Choose a PNG, JPG, or WebP photo.');return;}if(f.size>3*1024*1024){setError('Choose a photo smaller than 3 MB.');return;}const reader=new FileReader();reader.onload=()=>update({attachments:[...(entry?.attachments??[]),{name:f.name,data:String(reader.result)}]});reader.readAsDataURL(f);e.target.value='';setError('');};

 // Today's line from the morning (the latest one on or before this day) opens the page as an epigraph.
 const epigraph=[...(state.quotes??[])].filter(q=>q.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0]?.text;
 const entryNo=state.journals.filter(j=>j.kind==='daily'&&j.text.trim()&&j.date<date).length+1;
 const moodOf=(d:string)=>state.journals.find(j=>j.date===d&&j.kind==='daily'&&j.text.trim())?.mood;

 // The writing room: a lamp-lit desk at night. The page is the only bright thing on it.
 // This week runs along the top of the desk, the month one tap away; past pages are laid out below.
 return <>
  <div className="page-heading journal-head"><h1>{reviewKind?`${reviewKind==='weekly'?'Weekly':'Monthly'} reflection`:'A little room to reflect'}<span className="title-period">.</span></h1><p>{reviewKind?'Look at what happened, honestly, then give the next stretch one clear intention.':'Write it the way you would to a friend. Private, on this device.'}</p></div>
  <section className="writing-room" aria-label="Journal">
   <div ref={aside} className="date-strip">
    <div className="strip-head">
     <button type="button" className="month-toggle" aria-expanded={monthOpen} aria-haspopup="dialog" onClick={()=>{setView(date.slice(0,7));setMonthOpen(!monthOpen);}}>{label(date,{month:'long',year:'numeric'})}<ChevronDown size={18}/></button>
     <span className="journal-streak">{streakDays?<><b><Count value={streakDays}/></b> {streakDays===1?'day':'days'} written in a row</>:'Write today to start a run.'}</span>
     {date!==now&&<button type="button" className="today-chip" aria-label="Go to today’s page" onClick={()=>setDate(now)}>Today</button>}
    </div>
    <div className="week-row">
     <button type="button" className="icon-button week-nav" aria-label="Previous week" onClick={()=>setDate(addDays(date,-7))}><ArrowLeft size={18}/></button>
     <div className="week-days">{week.map(d=>{const has=hasEntry(state,d),m=moodOf(d);
      return <button key={d} type="button" disabled={d>now} aria-pressed={date===d} className={`${date===d?'selected':''} ${d===now?'is-today':''} ${has?'has-entry':''} ${tone(m)}`} aria-label={`${label(d,{weekday:'long',month:'long',day:'numeric'})}${d===now?', today':''}${has?`, has an entry${m?`, felt ${m.toLowerCase()}`:''}`:''}`} onClick={()=>setDate(d)}><small aria-hidden="true">{label(d,{weekday:'short'})}</small><b>{parse(d).getDate()}</b><i className="ink-drop-dot" aria-hidden="true"/></button>;})}</div>
     <button type="button" className="icon-button week-nav" aria-label="Next week" disabled={ws>=weekStart(now)} onClick={()=>{const n=addDays(date,7);setDate(n>now?now:n);}}><ArrowRight size={18}/></button>
    </div>
    {monthOpen&&<div className="month-pop" role="dialog" aria-label="Choose a day">
     <div className="month-pop-head"><button type="button" className="icon-button" aria-label="Previous month" onClick={()=>setView(shiftMonth(view,-1))}><ArrowLeft size={16}/></button><strong>{label(`${view}-01`,{month:'long',year:'numeric'})}</strong><button type="button" className="icon-button" aria-label="Next month" disabled={view>=now.slice(0,7)} onClick={()=>setView(shiftMonth(view,1))}><ArrowRight size={16}/></button></div>
     <div className="month-grid">{['M','T','W','T','F','S','S'].map((d,i)=><span key={i} aria-hidden="true">{d}</span>)}{Array.from({length:vOffset},(_,i)=><span key={`gap-${i}`} aria-hidden="true"/>)}
      {viewDays.map((d,i)=>{const has=hasEntry(state,d),m=moodOf(d);return <button key={d} type="button" disabled={d>now} aria-pressed={date===d} className={`${has?'has-entry':''} ${tone(m)} ${date===d?'selected':''} ${d===now?'is-today':''}`} aria-label={`${label(d,{month:'long',day:'numeric'})}${has?', has an entry':''}`} onClick={()=>{setDate(d);setMonthOpen(false);}}>{i+1}</button>;})}</div>
     <div className="month-legend">{MOODS.map(m=><span key={m} className={tone(m)}><i className="ink-drop-dot" aria-hidden="true"/>{m}</span>)}</div>
    </div>}
   </div>

   <div className="book">
    <article ref={paper} className="book-spread">
     <section className="book-page verso" aria-label="About this entry">
      <p className="folio-top"><span>The Reboot Journal</span><span>{kind==='daily'?`Entry No. ${entryNo}`:`${kind[0].toUpperCase()}${kind.slice(1)} review`}</span></p>
      <header className="masthead">
       <span className="masthead-day" aria-hidden="true">{parse(date).getDate()}</span>
       <div className="masthead-text"><h2>{label(date,{weekday:'long'})}</h2><p>{date===now?'Today · ':''}{label(date,{month:'long',year:'numeric'})}</p></div>
      </header>
      <div className="page-tools">
       <button className="icon-button" aria-label="Previous day" onClick={()=>setDate(addDays(date,-1))}><ArrowLeft size={16}/></button>
       <input type="date" aria-label="Journal date" value={date} max={now} onChange={e=>{if(e.target.value)setDate(e.target.value);}}/>
       <button className="icon-button" aria-label="Next day" disabled={date>=now} onClick={()=>setDate(addDays(date,1))}><ArrowRight size={16}/></button>
       <button className="icon-button" aria-label={focus?'Leave focus mode':'Focus mode'} title={focus?'Leave focus (Esc)':'Focus mode'} onClick={()=>setFocus(!focus)}>{focus?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
      </div>
      <p className="ornament" aria-hidden="true"><span>✦</span></p>
      <blockquote className="epigraph"><p>{epigraph??'Progress isn’t linear. Keep showing up.'}</p><cite>{epigraph?'Today’s line':'A reminder'}</cite></blockquote>
      <div className="mood-picker" role="radiogroup" aria-label="How are you feeling?"><span>{date===now?'How was today?':'How was this day?'}</span>{MOODS.map(m=>{const on=entry?.mood===m;return <button key={m} role="radio" aria-checked={on} className={`${tone(m)} ${on?'selected':''}`} onClick={()=>{if(kind==='daily')mutate(s=>applyMood(s,date,on?'':m),'check-in mood');else update({mood:on?'':m});}}><i className="mood-swatch" aria-hidden="true"/>{m}</button>;})}</div>
      {kind==='daily'&&<OnRecord state={state} date={date}/>}
      {kind==='daily'&&<div className="book-proof"><span>A win, a shot you took, or a lesson</span><ProofQuickAdd state={state} mutate={mutate} date={date}/></div>}
      <div className="prompt-list"><span>{reviewKind||kind!=='daily'?'Questions for this stretch':'Questions for tonight'}</span><ol>{prompts.map(p=><li key={p}><button onClick={()=>insertPrompt(p)}>{p}</button></li>)}</ol></div>
      <footer className="verso-foot">
       <label className="attachment-control"><ImagePlus size={15}/><span>Attach a photo</span><small>PNG, JPG or WebP, up to 3 MB</small><input className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={attach}/></label>
       {kind==='daily'&&<div ref={countBox} className={`journal-count ${counted?'counted':''}`}>{counted?<><span className="count-seal" aria-hidden="true"><Check size={20} weight="bold"/></span><strong>Counted toward “Write a journal”</strong></>:<small>Writing a line here counts toward “Write a journal”.</small>}</div>}
      </footer>
      <p className="page-no" aria-hidden="true">{entryNo*2-1}</p>
      <span className="page-frame" aria-hidden="true"/>
     </section>
     <section className="book-page recto">
      <p className="running-head" aria-hidden="true"><span>{label(date,{weekday:'long'})}</span><i>✦</i><span>{parse(date).getDate()} {label(date,{month:'long',year:'numeric'})}</span></p>
      <p className="salutation" aria-hidden="true">Dear me,</p>
      <textarea ref={area} className="writing-area" aria-label="Journal entry" value={text} onChange={e=>{const v=e.target.value;if(kind==='daily')mutate(s=>setEntryText(s,date,v),`journal daily ${date}`);else update({text:v});}} placeholder="Start with one honest sentence…"/>
      <p className="signoff" aria-hidden="true">Yours,<span>{state.settings.name?.trim()||'me'}</span></p>
      <p className="folio"><span>{words} {words===1?'word':'words'}</span><span aria-hidden="true">·</span><span>{entry?'Saved':'Nothing written yet'}</span></p>
      <p className="page-no" aria-hidden="true">{entryNo*2}</p>
      <span className="watermark" aria-hidden="true"/>
      <span className="page-frame" aria-hidden="true"/>
     </section>
    </article>
    <span className="book-ribbon" aria-hidden="true"/>
   </div>
   {error&&<p className="error room-error" role="alert">{error}</p>}
   {!!entry?.attachments.length&&<div className="attachments room-attachments">{entry.attachments.map((a,i)=><figure key={i}><img src={a.data} alt={a.name}/><figcaption>{a.name}<button className="text-button danger" onClick={()=>update({attachments:entry.attachments.filter((_,n)=>n!==i)})}>Remove</button></figcaption></figure>)}</div>}
  </section>

  <div className="journal-below">
   <details className="link-goals"><summary>Link goals or milestones{entry?.goals.length?` (${entry.goals.length})`:''}</summary><div>{state.goals.map(g=><label key={g.id} className="checkbox-label"><input type="checkbox" checked={entry?.goals.includes(g.id)??false} onChange={()=>update({goals:entry?.goals.includes(g.id)?entry.goals.filter(id=>id!==g.id):[...(entry?.goals??[]),g.id]})}/>{g.en}</label>)}</div></details>
   <section className="past-pages">
    <div className="past-head"><h2>Past pages</h2>
     <label className="search"><Search size={15}/><input aria-label="Search journal" placeholder="Search your entries" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button className="icon-button" aria-label="Clear search" onClick={()=>setSearch('')}><X size={14}/></button>}</label>
     <select aria-label="Filter by mood" value={moodFilter} onChange={e=>setMoodFilter(e.target.value)}>{['All moods',...MOODS].map(m=><option key={m}>{m}</option>)}</select></div>
    <div className="journal-index" data-stagger>{filtered.map(j=><button key={`${j.date}-${j.kind}`} className={`${tone(j.mood)} ${j.date===date&&j.kind===kind?'current':''}`} onClick={()=>{setDate(j.date);setKind(j.kind);window.scrollTo({top:0,behavior:'smooth'});}}>
     <span className="entry-date"><b>{parse(j.date).getDate()}</b><span>{label(j.date,{weekday:'short'})}<br/>{label(j.date,{month:'short',year:'numeric'})}</span></span>
     <span className="entry-tags">{j.mood&&<em><i className="ink-drop-dot" aria-hidden="true"/>{j.mood}</em>}{j.kind!=='daily'&&<em>{j.kind} review</em>}</span>
     <small>{j.text.trim().slice(0,160)}</small></button>)}{!filtered.length&&<p>{state.journals.some(j=>j.text.trim())?'No entries match.':'Your pages will collect here. Start wherever you are.'}</p>}</div>
   </section>
  </div>
 </>;
}

function hasEntry(state:State,d:string){return state.journals.some(j=>j.date===d&&j.text.trim());}

// On the record: what the day already holds, from your own list, training and promises, to write from.
function OnRecord({state,date}:{state:State;date:string}){
 const todos=(state.todos??[]).filter(t=>t.date===date&&!t.dismissed&&!t.routine),frog=todos.find(t=>t.frog),done=todos.filter(t=>t.done&&!t.frog&&!t.auto).length;
 const plan=dayPlan(state,date),trained=finished(state,date),daily=state.goals.filter(g=>g.status==='active'&&g.type==='daily'),kept=daily.filter(g=>dayState(g,state.logs,date)==='success').length;
 const lines:string[]=[];
 if(frog)lines.push(frog.done?`Ate the frog: ${frog.text}`:`Frog still waiting: ${frog.text}`);
 if(done)lines.push(`${done} ${done===1?'task':'tasks'} done`);
 if(trained)lines.push(plan.kind==='gym'?`Trained: ${plan.title}`:`${plan.title} done`);
 if(daily.length)lines.push(`${kept} of ${daily.length} promises kept`);
 return <div className="on-record"><span>On the record</span>{lines.length?<ul>{lines.map(l=><li key={l}>{l}</li>)}</ul>:<p>Nothing recorded yet. That’s fine; write what happened.</p>}</div>;
}
