export type Tracking = 'daily'|'weekly-frequency'|'weekly-min'|'weekly-max'|'measurement'|'counter'|'milestone';
// 'paused' and 'archived' exist only in older data; they are migrated on load and import.
export type Status = 'not-started'|'active'|'completed'|'paused'|'archived';
export interface Criteria {target:number; unit:string; days?:number; weeks?:number; months?:number; dailyMin?:number; checklist?:string[]; stages?:string[]; direction?:'up'|'down'|'either'; consecutive:boolean; description:string; baseline?:number; distinct?:boolean; requireConnection?:boolean;}
export interface Version {id:string; effective:string; criteria:Criteria; createdAt:string;}
export interface Goal {id:string; en:string; vi:string; originalName:{en:string;vi:string}; category:string; type:Tracking; row:number; col:number; original:Readonly<Criteria>; historicalCheck:boolean; versions:Version[]; status:Status; start:string; deadline:string; pinned:boolean; priority:number; run:number; restarts:{date:string;run:number}[];}
export interface Activity {id:string; goalId:string; run:number; date:string; state:'success'|'failed'|'partial'; value?:number; tasks?:string[]; title?:string; note?:string; evidence?:string; connected?:boolean; stage?:string; prospect?:string; started?:string; completed?:boolean; createdAt:string; updatedAt:string;}
export interface Edit {id:string; at:string; entity:string; before:unknown; after:unknown;}
export interface Journal {date:string; text:string; mood:string; goals:string[]; attachments:{name:string;data:string}[]; kind:'daily'|'weekly'|'monthly'; updatedAt:string;}
// A day on the Journey line. `delta` is always the day's total; `moments` (optional) splits it into several dots, each with its own note.
// One event within a day: its own time, label and note. `delta` is how far it moved you.
export interface Moment {id:string; delta:number; note:string; at:string; tag?:string;}
export interface Movement {date:string; delta:number; note:string; milestone:boolean; tag?:string; moments?:Moment[];}
// A line to start the day, shown above today's list. One per day; the latest stays up until you write a new one.
export interface Quote {id:string; date:string; text:string;}
// ABCDE from Eat That Frog: A must, B should, C nice to do, D delegate, E eliminate.
export type Priority='A'|'B'|'C'|'D'|'E';
export interface Slice {id:string; text:string; done:boolean;}
// `frog` marks the day's one most important task; `slices` are its small first steps; `doneAt` records when it was finished.
export interface Todo {id:string; date:string; text:string; done:boolean; createdAt:string; priority?:Priority; frog?:boolean; slices?:Slice[]; doneAt?:string; carried?:'rewritten'|'dropped'; carriedOn?:string;}
// A weekly training plan (Monday first) and which exercises were done on each date.
export interface Exercise {name:string; dose:string;}
export interface TrainingDay {kind:'gym'|'sport'|'rest'; title:string; exercises:Exercise[];}
export interface Workout {date:string; done:string[];}
export type ProofKind='win'|'attempt'|'lesson';
export interface Proof {id:string; date:string; kind:ProofKind; text:string; createdAt:string;}
export interface Achievement {id:string;goalId:string;run:number;date:string;criteria:Criteria;}
export interface State {schema:1; goals:Goal[]; logs:Activity[]; journey:Movement[]; journals:Journal[]; edits:Edit[]; achievements:Achievement[]; proofs:Proof[]; todos?:Todo[]; quotes?:Quote[]; training?:{days:TrainingDay[]}; workouts?:Workout[]; settings:{language:'en'|'both'|'vi';timezone:string;onboarded:boolean;identity?:string;name?:string;customTags?:string[];reminders?:{morning:string;evening:string;notify:boolean};};}
export function uid(){return crypto.randomUUID();}
