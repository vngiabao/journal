// One feeling, written in one place. Choosing how a day felt sets the journal's mood and marks the same day on
// your Journey line, so the two never disagree. Writing anything in the day's entry counts toward "Write a journal".
import type {State,Journal} from './model';
import {uid} from './model';
import {putActivity} from './GoalControls';

export const MOODS=['Great','Good','Okay','Low','Difficult'] as const;
export type Mood=typeof MOODS[number];
// The five moods map onto the Journey line's five steps: big step, step forward, steady, setback, big setback.
export const MOOD_DELTA:Record<Mood,number>={Great:8,Good:3,Okay:0,Low:-3,Difficult:-8};
export const CHECK_IN='Check-in';
export const JOURNAL_GOAL='07';

function dailyEntry(s:State,date:string):Journal{
 let e=s.journals.find(j=>j.date===date&&j.kind==='daily');
 if(!e){e={date,text:'',mood:'',goals:[],attachments:[],kind:'daily',updatedAt:new Date().toISOString()};s.journals.push(e);}
 return e;
}

// The day's feeling lives on the line as one moment tagged "Check-in"; changing the mood moves that moment.
function syncLine(s:State,date:string,mood:string){
 const delta=(MOOD_DELTA as Record<string,number>)[mood];
 let day=s.journey.find(m=>m.date===date);
 if(delta===undefined){
  if(!day?.moments)return;
  day.moments=day.moments.filter(x=>x.tag!==CHECK_IN);
  if(!day.moments.length)s.journey=s.journey.filter(m=>m.date!==date);else day.delta=day.moments.reduce((n,x)=>n+x.delta,0);
  return;
 }
 if(!day){day={date,delta:0,note:'',milestone:false,moments:[]};s.journey=[...s.journey,day].sort((a,b)=>a.date.localeCompare(b.date));}
 if(!day.moments)day.moments=[{id:uid(),delta:day.delta,note:day.note,at:`${date}T12:00:00.000Z`,...(day.tag?{tag:day.tag}:{})}];
 const m=day.moments.find(x=>x.tag===CHECK_IN);
 if(m)m.delta=delta;else day.moments.push({id:uid(),delta,note:'',at:new Date().toISOString(),tag:CHECK_IN});
 day.delta=day.moments.reduce((n,x)=>n+x.delta,0);
}

export function applyMood(s:State,date:string,mood:string){const e=dailyEntry(s,date);e.mood=mood;e.updatedAt=new Date().toISOString();syncLine(s,date,mood);}

// Writing counts: the first words of the day record "Write a journal"; clearing the entry takes the record back.
export function setEntryText(s:State,date:string,text:string){
 const e=dailyEntry(s,date);e.text=text;e.updatedAt=new Date().toISOString();
 const g=s.goals.find(x=>x.id===JOURNAL_GOAL);if(!g)return;
 const auto=(l:State['logs'][number])=>l.goalId===JOURNAL_GOAL&&l.run===g.run&&l.date===date&&!l.title&&!l.stage;
 if(text.trim()){if(!s.logs.some(l=>auto(l)&&l.state==='success'))putActivity(s,g,date,{state:'success',note:'Wrote a journal entry'});}
 else s.logs=s.logs.filter(l=>!(auto(l)&&l.note==='Wrote a journal entry'));
}
