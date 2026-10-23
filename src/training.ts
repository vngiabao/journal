// The weekly training plan: what each weekday holds, and which exercises were done on a date.
// Finishing a gym day counts toward the board's "Gym 4+ times a week" goal, so it is never logged twice.
import type {State,TrainingDay,Workout} from './model';
import {putActivity} from './GoalControls';

const ex=(name:string,dose:string)=>({name,dose});
// The plan as first set up. Monday first.
export const DEFAULT_PLAN:TrainingDay[]=[
 {kind:'sport',title:'Soccer',exercises:[ex('Soccer','90 min')]},
 {kind:'gym',title:'Push',exercises:[ex('Dumbbell floor press','3 × 8–12'),ex('Seated shoulder press','3 × 8–12'),ex('Dumbbell lateral raises','3 × 12–15'),ex('Overhead dumbbell triceps extension','3 × 10–12'),ex('Lying dumbbell triceps extension','2 × 10–12')]},
 {kind:'gym',title:'Pull',exercises:[ex('Back machine / lat pulldown','3 × 8–12'),ex('One-arm dumbbell row','3 × 10–12'),ex('Dumbbell reverse fly','2 × 12–15'),ex('Dumbbell biceps curl','3 × 8–12'),ex('Hammer curl','2 × 10–12')]},
 {kind:'sport',title:'Soccer',exercises:[ex('Soccer','90 min')]},
 {kind:'gym',title:'Upper + Arms',exercises:[ex('Back machine','3 × 10–12'),ex('Dumbbell floor press','3 × 10–12'),ex('Concentration curl','3 × 10–12'),ex('Hammer curl','2 × 10–12'),ex('Overhead triceps extension','3 × 10–12'),ex('Dumbbell triceps kickback','2 × 12–15')]},
 {kind:'gym',title:'Legs + Abs',exercises:[ex('Goblet squat','3 × 10–12'),ex('Dumbbell Romanian deadlift','3 × 10'),ex('Glute bridge','3 × 12–15'),ex('Dead bug','3 × 10/side'),ex('Plank','3 × 30–45 sec')]},
 {kind:'rest',title:'Rest',exercises:[ex('Recovery','')]},
];
export const WEEKDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const planOf=(s:State)=>s.training?.days??DEFAULT_PLAN;
export const weekdayIndex=(date:string)=>(new Date(`${date}T12:00:00`).getDay()+6)%7;
export const dayPlan=(s:State,date:string)=>planOf(s)[weekdayIndex(date)];
export const workoutOn=(s:State,date:string)=>(s.workouts??[]).find(w=>w.date===date);
export const doneNames=(s:State,date:string)=>new Set(workoutOn(s,date)?.done??[]);
export const isTrainingDay=(d:TrainingDay)=>d.kind!=='rest'&&d.exercises.length>0;
export const finished=(s:State,date:string)=>{const d=dayPlan(s,date),done=doneNames(s,date);return isTrainingDay(d)&&d.exercises.every(e=>done.has(e.name));};
export const gymGoal=(s:State)=>s.goals.find(g=>g.type==='weekly-frequency'&&/\bgym\b/i.test(g.originalName?.en??g.en));

// One exercise per line: "Goblet squat 3 × 10–12", "Soccer 90 min", "Plank 3 × 30–45 sec".
const DOSE=/\s+(?:[-–—]\s*)?((?:\d+\s*[×x]\s*\S+.*)|(?:\d+\s*(?:min|mins|minutes|sec|secs|seconds)\b.*))$/i;
export function parseLines(text:string){return text.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(DOSE);return m?{name:l.slice(0,m.index).replace(/[-–—]\s*$/,'').trim(),dose:m[1].replace(/\s*x\s*/i,' × ').trim()}:{name:l,dose:''};});}
export const formatLines=(d:TrainingDay)=>d.exercises.map(e=>e.dose?`${e.name} ${e.dose}`:e.name).join('\n');

function syncGoal(s:State,date:string){
 const d=dayPlan(s,date),g=gymGoal(s);if(!g||d.kind!=='gym')return;
 const mine=(l:State['logs'][number])=>l.goalId===g.id&&l.run===g.run&&l.date===date&&!l.title&&!l.stage;
 if(finished(s,date)){if(!s.logs.some(l=>mine(l)&&l.state==='success'))putActivity(s,g,date,{state:'success',note:`Workout: ${d.title}`});}
 else s.logs=s.logs.filter(l=>!(mine(l)&&l.note===`Workout: ${d.title}`));
}
export function toggleExercise(s:State,date:string,name:string){
 const list=s.workouts??=[];let w:Workout|undefined=list.find(x=>x.date===date);
 if(!w){w={date,done:[]};list.push(w);}
 w.done=w.done.includes(name)?w.done.filter(n=>n!==name):[...w.done,name];
 syncGoal(s,date);
}
export function setAll(s:State,date:string,on:boolean){
 const list=s.workouts??=[];let w=list.find(x=>x.date===date);if(!w){w={date,done:[]};list.push(w);}
 w.done=on?dayPlan(s,date).exercises.map(e=>e.name):[];syncGoal(s,date);
}
