// Check in: the evening half of Today. One tap for how the day felt (it also marks your line), one line for the
// journal, one win for the proof file, and in the evening, closing the day.
import type {State} from './model';
import type {Mutate} from './GoalControls';
import {MOODS,applyMood,setEntryText} from './mood';
import {ProofQuickAdd,ProofRecall} from './Proof';
import {TomorrowFrog} from './Frog';
import {ArrowRight} from './icons';

const tone=(m:string)=>`tone-${m.toLowerCase()}`;
const FELT:Record<string,string>={Great:'a big step forward',Good:'a step forward',Okay:'a steady day',Low:'a setback',Difficult:'a hard day'};

export function CheckIn({state,mutate,now,go}:{state:State;mutate:Mutate;now:string;go:(p:string)=>void}){
 const entry=state.journals.find(j=>j.date===now&&j.kind==='daily'),mood=entry?.mood??'',text=entry?.text??'';
 const long=text.length>220||text.split('\n').length>4;
 const evening=new Date().getHours()>=17,unfinished=(state.todos??[]).filter(t=>t.date===now&&!t.done).length;
 return <section className="checkin" aria-labelledby="checkin-title">
  <h2 id="checkin-title">How was today?</h2>
  <div className="mood-row" role="radiogroup" aria-label="How was today?">{MOODS.map(m=>{const on=mood===m;return <button key={m} type="button" role="radio" aria-checked={on} className={`mood-pick ${tone(m)} ${on?'selected':''}`} onClick={()=>mutate(s=>applyMood(s,now,on?'':m),'check-in mood')}><i className="mood-swatch" aria-hidden="true"/>{m}</button>;})}</div>
  {mood&&<p className="checkin-note">Marked on your line as {FELT[mood]}. <button type="button" className="text-button" onClick={()=>go('Journey')}>See your line</button></p>}
  {long?<p className="checkin-wrote">You’ve written {text.trim().split(/\s+/).length} words today. <button type="button" className="text-button" onClick={()=>go('Journal')}>Keep writing <ArrowRight size={14}/></button></p>
   :<label className="checkin-line"><span>One line about today</span><textarea rows={2} value={text} maxLength={2000} placeholder="What happened, in a sentence?" onChange={e=>mutate(s=>setEntryText(s,now,e.target.value),`journal daily ${now}`)}/><small>Saved to your journal. It counts toward “Write a journal”.</small></label>}
  <div className="checkin-proof"><span>A win, or a shot you took?</span><ProofQuickAdd state={state} mutate={mutate} date={now} compact/></div>
  {(mood==='Low'||mood==='Difficult')&&<ProofRecall state={state} now={now}/>}
  {(evening||unfinished===0)&&<div className="close-day"><h3>Close the day</h3>
   {unfinished>0&&<p className="close-note">{unfinished} unfinished {unfinished===1?'task waits':'tasks wait'} for tomorrow. You’ll rewrite the ones that still matter, by hand.</p>}
   <TomorrowFrog state={state} mutate={mutate} now={now} always/>
  </div>}
 </section>;
}
