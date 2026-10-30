// Bond's journey, as plain numbers. Every day with a finished morning or evening ritual is a day you showed up.
// The count only ever grows: a missed day never takes anything away.
import type {State} from '../model';
import {addDays,daysBetween,weekStart} from '../dates';

const FIRST=[3,7,14,21,30,50,75,100];
// The milestones, in order: 3, 7, 14, 21, 30, 50, 75, 100, then every 50.
export function milestoneAfter(n:number){const m=FIRST.find(x=>x>n);return m??(Math.floor(n/50)+1)*50;}
export function isMilestone(n:number){return n>0&&(FIRST.includes(n)||n>100&&n%50===0);}
export function milestonesUpTo(n:number){const out:number[]=[];for(let m=milestoneAfter(0);m<=n;m=milestoneAfter(m))out.push(m);return out;}
const before=(n:number)=>{let p=0;for(let m=milestoneAfter(0);m<n;m=milestoneAfter(m))p=m;return p;};

// The dates you showed up, oldest first, each once.
export function showUpDays(state:State){
 return [...new Set((state.rituals??[]).filter(r=>r&&(r.morning||r.evening)).map(r=>r.date))].sort();
}

export interface Journey{
 days:string[];            // show-up dates, oldest first (none after `now`)
 total:number;             // days showing up, all time
 today:boolean;            // already showed up today
 week:boolean[];           // Monday..Sunday of this week: showed up that day
 weekCount:number;         // of 7
 next:number;              // the next milestone ahead
 prev:number;              // the milestone just behind (0 at the start)
 toNext:number;            // show-ups left to the next milestone
 sinceLast:number|null;    // days since the last show-up (0 = today, null = never)
 gap:number|null;          // days between today and the show-up before today (for "you came back")
 milestoneToday:number|null; // today's show-up reached this milestone
 earned:{n:number;date:string}[]; // every milestone reached, with the day it was reached
}

export function journey(state:State,now:string):Journey{
 const days=showUpDays(state).filter(d=>d<=now),total=days.length,today=days.at(-1)===now;
 const ws=weekStart(now),week=Array.from({length:7},(_,i)=>days.includes(addDays(ws,i)));
 const last=days.at(-1),earlier=today?days.at(-2):last;
 const milestoneToday=today&&isMilestone(total)?total:null;
 // On a milestone day the trail still shows the stretch just finished, with Bond at the flag.
 const next=milestoneToday??milestoneAfter(total),prev=before(next);
 return {days,total,today,week,weekCount:week.filter(Boolean).length,next,prev,toNext:next-total,
  sinceLast:last?daysBetween(last,now):null,gap:earlier?daysBetween(earlier,now):null,milestoneToday,
  earned:milestonesUpTo(total).map(n=>({n,date:days[n-1]}))};
}

// A milestone is celebrated once, ever. The key lives in state.bond.celebrated.
export const milestoneKey=(n:number)=>`days-${n}`;
export function celebrated(state:State,key:string){return !!state.bond?.celebrated?.includes(key);}
export function markCelebrated(state:State,key:string){
 const b=state.bond??(state.bond={});const list=b.celebrated??(b.celebrated=[]);if(!list.includes(key))list.push(key);
}
// The milestone that should be celebrated right now, if any: reached today and never celebrated.
export function milestoneDue(state:State,now:string){const j=journey(state,now);return j.milestoneToday&&!celebrated(state,milestoneKey(j.milestoneToday))?j.milestoneToday:null;}

// What each milestone leaves behind: a keepsake with a name, a pose and a line from Bond.
export interface Keepsake{n:number;name:string;pose:string;line:string;}
export function keepsake(n:number):Keepsake{
 switch(n){
  case 3:return {n,name:'First steps',pose:'sit',line:'Three days. Bond knows the way now.'};
  case 7:return {n,name:'A week',pose:'stick',line:'That’s 7 days. Bond found a stick.'};
  case 14:return {n,name:'Two weeks',pose:'run',line:'Two weeks together. Bond ran ahead to show you.'};
  case 21:return {n,name:'Three weeks',pose:'jump',line:'21 days. Bond hasn’t stopped wagging.'};
  case 30:return {n,name:'A month',pose:'cheer',line:'30 days together. Bond wants a photo of this one.'};
  case 50:return {n,name:'Fifty',pose:'flag',line:'50 days. Bond planted a flag for you.'};
  case 75:return {n,name:'Seventy-five',pose:'stick',line:'75 days. Bond brought the whole branch.'};
  case 100:return {n,name:'One hundred',pose:'cheer',line:'100 days together. Bond is so proud of you.'};
  default:return {n,name:`${n} days`,pose:n%100===0?'cheer':'flag',line:`${n} days together. Bond’s still right here with you.`};
 }
}

// Back after two or more days away, and not shown up yet today: Bond says hello, and the welcome takes the place of
// the week's count, so a comeback never opens on an empty week.
export const WELCOME='Bond missed you. Welcome back.';
export const comingBack=(j:Journey)=>!j.today&&j.total>0&&j.sinceLast!==null&&j.sinceLast>=2;
// The week in words. An empty week is never "0 of 7": it is a week that starts with today.
export function weekWords(j:Journey){
 if(j.weekCount)return `${j.weekCount} of 7 this week`;
 return j.total?'A new week starts today':'Your first stone is today';
}

// Bond's one line for the strip. Warm, short, never a scolding. `hour` is the local hour (0-23).
export function bondLine(j:Journey,hour:number){
 if(j.milestoneToday)return keepsake(j.milestoneToday).line;
 if(j.today){
  if(j.total===1)return 'Day one. Bond’s coming with you.';
  if(j.gap!==null&&j.gap>=2)return hour<12?'Good morning - you came back.':'You came back. Bond noticed.';
  const ahead=j.toNext===1?'One more day to the next flag.':null;
  const lines=['Another day on the trail together.','Bond’s tail hasn’t stopped.','Good walk today. Same time tomorrow?','Bond’s trotting a little taller today.'];
  return ahead??lines[j.total%lines.length];
 }
 if(j.total===0)return 'Bond’s waiting at the start of the trail.';
 if(comingBack(j))return WELCOME;
 return hour<17?'Bond’s waiting for you.':'Bond saved you a spot for tonight.';
}

// The big line, always in one phrasing so it never changes wording mid-day: "4 days together", today included once
// you've shown up. With nothing yet, day one is today.
export function dayLine(j:Journey){
 if(!j.total)return 'Day one is today';
 return `${j.total} ${j.total===1?'day':'days'} together`;
}

// Bond's pose on the trail.
export function trailPose(j:Journey):string{
 if(j.milestoneToday)return keepsake(j.milestoneToday).pose==='stick'?'stick':'flag';
 if(j.today)return 'walk-a';
 if(j.total&&j.sinceLast!==null&&j.sinceLast>=2)return 'tilt';
 return 'sit';
}
