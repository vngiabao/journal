import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Search,ArrowLeft,ArrowRight,ImagePlus,Check,Plus,Maximize2,Minimize2,X} from './icons';
import type {State,Journal as Entry} from './model';
import {putActivity,type Mutate} from './GoalControls';
import {label,parse,iso,addDays} from './dates';
import {dayState} from './engine';
import {Journey} from './Journey';
import {ProofQuickAdd} from './Proof';
import {Count} from './Count';
import {gsap,useGSAP,whenMotionOK} from './motion';

const MOODS=['Great','Good','Okay','Low','Difficult'];
const KINDS:[Entry['kind'],string][]=[['daily','Daily'],['weekly','Weekly review'],['monthly','Monthly review']];
const JOURNAL_GOAL='07';

export function Journal({state,mutate,now,reviewKind}:{state:State;mutate:Mutate;now:string;reviewKind?:'weekly'|'monthly'}){
 const [date,setDate]=useState(()=>{const d=sessionStorage.getItem('reboot-journal-date');sessionStorage.removeItem('reboot-journal-date');return d&&d<=now?d:now;});
 const [search,setSearch]=useState(''),[moodFilter,setMoodFilter]=useState('All moods'),[error,setError]=useState(''),[kind,setKind]=useState<Entry['kind']>(reviewKind??'daily'),[focus,setFocus]=useState(false);
 const entry=state.journals.find(j=>j.date===date&&j.kind===kind),text=entry?.text??'';
 const area=useRef<HTMLTextAreaElement>(null);
 useLayoutEffect(()=>{const a=area.current;if(!a)return;a.style.height='auto';a.style.height=`${Math.max(a.scrollHeight,focus?520:360)}px`;},[text,focus,date,kind]);
 useEffect(()=>{document.body.classList.toggle('focus-writing',focus);const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setFocus(false);};if(focus){window.addEventListener('keydown',esc);area.current?.focus();}return()=>{window.removeEventListener('keydown',esc);document.body.classList.remove('focus-writing');};},[focus]);

 function update(p:Partial<Entry>){mutate(s=>{const idx=s.journals.findIndex(j=>j.date===date&&j.kind===kind),old=idx>=0?s.journals[idx]:undefined;const e:Entry={date,text:'',mood:'',goals:[],attachments:[],kind,...old,...p,updatedAt:new Date().toISOString()};if(idx>=0)s.journals[idx]=e;else s.journals.push(e);},`journal ${kind} ${date}`);}
 function insertPrompt(p:string){update({text:(text.trim()?text.replace(/\s*$/,'')+'\n\n':'')+p+'\n'});requestAnimationFrame(()=>{const a=area.current;if(a){a.focus();a.setSelectionRange(a.value.length,a.value.length);}});}

 const q=search.trim().toLowerCase();
 const filtered=state.journals.filter(j=>j.text.trim()&&(!q||j.text.toLowerCase().includes(q))&&(moodFilter==='All moods'||j.mood===moodFilter)).sort((a,b)=>b.date.localeCompare(a.date));
 const month=parse(date),first=new Date(month.getFullYear(),month.getMonth(),1,12),count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate(),offset=(first.getDay()+6)%7;
 const prompts=reviewKind||kind!=='daily'?['What improved?','What did not work?',`What will I change next ${(reviewKind??kind)==='weekly'?'week':'month'}?`]:['What went well?','What did I struggle with?','What will I change tomorrow?','What am I proud of, even quietly?'];
 const words=text.trim().split(/\s+/).filter(Boolean).length;
 const journalGoal=state.goals.find(g=>g.id===JOURNAL_GOAL)!,counted=dayState(journalGoal,state.logs,date)==='success';
 const streakDays=(()=>{let n=0,d=now;if(!hasEntry(state,d))d=addDays(d,-1);while(hasEntry(state,d)){n++;d=addDays(d,-1);}return n;})();
 const paper=useRef<HTMLDivElement>(null),aside=useRef<HTMLElement>(null),countBox=useRef<HTMLDivElement>(null),wasCounted=useRef({key:date+kind,counted});
 // Picking a day turns the page: the sheet settles, then "Dear me," and your signature are written in with the pen.
 useGSAP(()=>{const mm=whenMotionOK(()=>{const blank={clipPath:'inset(-30% 100% -30% 0)'},inked={clipPath:'inset(-30% 0% -30% 0)',ease:'pen',clearProps:'clipPath'};
  gsap.timeline().from(paper.current,{y:14,rotation:-.6,opacity:0,duration:.45,ease:'power3.out',clearProps:'transform,opacity'})
   .fromTo('.salutation',blank,{...inked,duration:.8},'-=.15').fromTo('.signoff span',blank,{...inked,duration:.7},'-=.35');
 });return()=>mm.revert();},{dependencies:[date,kind],scope:paper});
 // A new month lays its days out one by one.
 useGSAP(()=>{const mm=whenMotionOK(()=>{gsap.from('.calendar button',{opacity:0,scale:.7,duration:.3,stagger:.008,ease:'back.out(2)',clearProps:'opacity,transform'});});return()=>mm.revert();},{dependencies:[date.slice(0,7)],scope:aside});
 // Counting the entry toward your goal presses a small wax seal onto it.
 useGSAP(()=>{const prev=wasCounted.current;wasCounted.current={key:date+kind,counted};if(!counted||prev.counted||prev.key!==date+kind)return;
  const mm=whenMotionOK(()=>{gsap.timeline().from('.count-seal',{scale:2.4,rotation:-40,opacity:0,duration:.42,ease:'stamp'}).fromTo(countBox.current,{x:0},{keyframes:{x:[0,-4,3,-2,0]},duration:.3,ease:'none'},'-=.08');});return()=>mm.revert();},{dependencies:[counted,date,kind],scope:countBox});

 const countEntry=()=>mutate(s=>putActivity(s,s.goals.find(g=>g.id===JOURNAL_GOAL)!,date,{state:'success'}),`goal ${JOURNAL_GOAL}, ${date}`);
 const uncountEntry=()=>mutate(s=>{s.logs=s.logs.filter(l=>!(l.goalId===JOURNAL_GOAL&&l.run===journalGoal.run&&l.date===date&&!l.title&&!l.stage));},`unrecord goal ${JOURNAL_GOAL}`);
 const attach=async(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)){setError('Choose a PNG, JPG, or WebP photo.');return;}if(f.size>3*1024*1024){setError('Choose a photo smaller than 3 MB.');return;}const reader=new FileReader();reader.onload=()=>update({attachments:[...(entry?.attachments??[]),{name:f.name,data:String(reader.result)}]});reader.readAsDataURL(f);e.target.value='';setError('');};

 // The page is the hero: a notebook lying open on the desk at dusk. Everything you need to write sits on the paper;
 // past pages wait on the shelf to the side.
 return <>
  <div className="page-heading journal-desk" style={{['--scene' as string]:'url(/art/scene-evening.webp)'}}><h1>{reviewKind?`${reviewKind==='weekly'?'Weekly':'Monthly'} reflection`:'A little room to reflect'}<span className="title-period">.</span></h1><p>{reviewKind?'Look at what happened, honestly, then give the next stretch one clear intention.':'Write it the way you would to a friend. Private, on this device.'}</p></div>
  <div className="journal-layout">
   <section className="journal-editor">
    {!reviewKind&&<div className="notebook-tabs kind-switch">{KINDS.map(([k,n])=><button key={k} aria-pressed={kind===k} className={kind===k?'selected':''} onClick={()=>setKind(k)}>{n}</button>)}</div>}
    <div ref={paper} className="stationery notebook">
     <header className="page-head">
      <div className="page-date"><h2>{date===now?'Today':label(date,{weekday:'long'})}</h2><p>{label(date,{weekday:date===now?'long':undefined,month:'long',day:'numeric',year:'numeric'})}</p></div>
      <div className="page-tools">
       <button className="icon-button" aria-label="Previous day" onClick={()=>setDate(addDays(date,-1))}><ArrowLeft size={16}/></button>
       <input type="date" aria-label="Journal date" value={date} max={now} onChange={e=>{if(e.target.value)setDate(e.target.value);}}/>
       <button className="icon-button" aria-label="Next day" disabled={date>=now} onClick={()=>setDate(addDays(date,1))}><ArrowRight size={16}/></button>
       <button className="icon-button" aria-label={focus?'Leave focus mode':'Focus mode'} title={focus?'Leave focus (Esc)':'Focus mode'} onClick={()=>setFocus(!focus)}>{focus?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
      </div>
     </header>
     <div className="mood-picker" role="radiogroup" aria-label="How are you feeling?"><span>today felt</span>{MOODS.map(m=>{const on=entry?.mood===m;return <button key={m} role="radio" aria-checked={on} className={on?'selected':''} onClick={()=>update({mood:on?'':m})}>{m}{on&&<MoodRing/>}</button>;})}</div>
     <div className="prompt-buttons"><span>need a nudge?</span>{prompts.map(p=><button key={p} onClick={()=>insertPrompt(p)}><Plus size={13}/>{p}</button>)}</div>
     <p className="salutation" aria-hidden="true">Dear me,</p>
     <textarea ref={area} className="writing-area" aria-label="Journal entry" value={text} onChange={e=>update({text:e.target.value})} placeholder="Start with one honest sentence…"/>
     <p className="signoff" aria-hidden="true">Yours,<span>{state.settings.name?.trim()||'me'}</span><time>{label(date,{month:'long',day:'numeric',year:'numeric'})}</time></p>
     <footer className="page-foot">
      <div className="page-foot-meta"><span>{words} {words===1?'word':'words'}</span><span><Check size={13}/>{entry?'Saved':'Nothing written yet'}</span>
       <label className="attachment-control"><ImagePlus size={15}/><span>Attach a photo</span><small>PNG, JPG or WebP, up to 3 MB</small><input className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={attach}/></label></div>
      {kind==='daily'&&<div ref={countBox} className={`journal-count ${counted?'counted':''}`}>{counted
       ?<><span className="count-seal" aria-hidden="true"><Check size={20} weight="bold"/></span><div><strong>Counted toward “Write a journal”</strong><button className="text-button" onClick={uncountEntry}>Undo</button></div></>
       :<><button className="seal-button" disabled={!words} onClick={countEntry}><span className="seal-ghost" aria-hidden="true"><Check size={18}/></span>Count it</button><small>{journalGoal.status==='active'?'Toward your five days a week.':'Kept on record, even before the goal is active.'}</small></>}</div>}
     </footer>
    </div>
    {error&&<p className="error" role="alert">{error}</p>}
    {!!entry?.attachments.length&&<div className="attachments">{entry.attachments.map((a,i)=><figure key={i}><img src={a.data} alt={a.name}/><figcaption>{a.name}<button className="text-button danger" onClick={()=>update({attachments:entry.attachments.filter((_,n)=>n!==i)})}>Remove</button></figcaption></figure>)}</div>}
    <details className="link-goals"><summary>Link goals or milestones{entry?.goals.length?` (${entry.goals.length})`:''}</summary><div>{state.goals.map(g=><label key={g.id} className="checkbox-label"><input type="checkbox" checked={entry?.goals.includes(g.id)??false} onChange={()=>update({goals:entry?.goals.includes(g.id)?entry.goals.filter(id=>id!==g.id):[...(entry?.goals??[]),g.id]})}/>{g.en}</label>)}</div></details>
    {kind==='daily'&&<><div className="journal-block"><div className="section-title"><div><h2>Proof from {date===now?'today':'this day'}</h2><p>One win, one shot taken, or one lesson. This is what you will reread on hard days.</p></div></div><ProofQuickAdd state={state} mutate={mutate} date={date}/></div>
    <div className="journal-block"><Journey key={date} state={state} mutate={mutate} now={now} mode="inline" days={14} focus={date} title={date===now?'How did today move you?':'How did this day move you?'} subtitle="Mark it on your line. Higher for a step forward, lower for a setback."/></div></>}
   </section>

   <aside ref={aside} className="journal-aside">
    <h2 className="aside-title">Past pages</h2>
    <div className="calendar-heading"><button className="icon-button" aria-label="Previous month" onClick={()=>{const d=parse(date);d.setDate(1);d.setMonth(d.getMonth()-1);setDate(iso(d));}}><ArrowLeft size={16}/></button><strong>{label(date,{month:'long',year:'numeric'})}</strong><button className="icon-button" aria-label="Next month" disabled={date.slice(0,7)>=now.slice(0,7)} onClick={()=>{const d=parse(date);d.setDate(1);d.setMonth(d.getMonth()+1);const n=iso(d);setDate(n>now?now:n);}}><ArrowRight size={16}/></button></div>
    <div className="calendar">{['M','T','W','T','F','S','S'].map((d,i)=><span key={i} aria-hidden="true">{d}</span>)}{Array.from({length:offset},(_,i)=><span key={`empty-${i}`}/>)}{Array.from({length:count},(_,i)=>{const d=iso(new Date(month.getFullYear(),month.getMonth(),i+1,12)),has=hasEntry(state,d);return <button key={d} disabled={d>now} className={`${date===d?'selected':''} ${has?'has-entry':''} ${d===now?'is-today':''}`} aria-label={`${label(d,{month:'long',day:'numeric'})}${has?', has an entry':''}`} aria-pressed={date===d} onClick={()=>setDate(d)}>{i+1}</button>;})}</div>
    <p className="journal-streak">{streakDays?<><b><Count value={streakDays}/></b> {streakDays===1?'day':'days'} written in a row</>:'Write today to start a run of entries.'}</p>
    <label className="search"><Search size={15}/><input aria-label="Search journal" placeholder="Search your entries" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button className="icon-button" aria-label="Clear search" onClick={()=>setSearch('')}><X size={14}/></button>}</label>
    <select aria-label="Filter by mood" value={moodFilter} onChange={e=>setMoodFilter(e.target.value)}>{['All moods',...MOODS].map(m=><option key={m}>{m}</option>)}</select>
    <div className="journal-index" data-stagger>{filtered.map(j=><button key={`${j.date}-${j.kind}`} className={j.date===date&&j.kind===kind?'current':''} onClick={()=>{setDate(j.date);setKind(j.kind);}}><span><strong>{label(j.date,{weekday:'short',month:'short',day:'numeric'})}</strong>{j.kind!=='daily'&&<em>{j.kind} review</em>}{j.mood&&<em>{j.mood}</em>}</span><small>{j.text.trim().slice(0,90)}</small></button>)}{!filtered.length&&<p>{state.journals.some(j=>j.text.trim())?'No entries match.':'Your entries will collect here. Start wherever you are.'}</p>}</div>
   </aside>
  </div>
 </>;
}

// A pencil circle drawn around the mood you picked.
function MoodRing(){return <svg className="mood-ring" viewBox="0 0 120 48" preserveAspectRatio="none" aria-hidden="true"><path pathLength={1} d="M16 31 C7 16 37 5 65 5 C95 6 116 14 113 27 C110 40 73 45 45 43 C21 41 6 34 10 22 C13 15 23 11 33 9"/></svg>;}

function hasEntry(state:State,d:string){return state.journals.some(j=>j.date===d&&j.text.trim());}
