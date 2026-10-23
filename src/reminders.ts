// Reminders for the frog habit: a morning nudge to eat the frog, an evening nudge to choose tomorrow's.
// Two ways to deliver them, both private and serverless:
//  1. A calendar file with two daily alarms. The phone's calendar rings them even when Reboot is closed.
//  2. System notifications while Reboot is open (any tab or the installed app in the foreground).
import type {State} from './model';
import {addDays} from './dates';

export type Reminders={morning:string;evening:string;notify:boolean};
export const DEFAULT_REMINDERS:Reminders={morning:'08:30',evening:'21:00',notify:false};
export const remindersOf=(s:State):Reminders=>({...DEFAULT_REMINDERS,...s.settings.reminders});
const APP='https://journal.gbaonvo.com/';

// RFC 5545 text: escape backslashes, commas and semicolons; newlines become \n.
const esc=(t:string)=>t.replace(/\\/g,'\\\\').replace(/[,;]/g,m=>`\\${m}`).replace(/\n/g,'\\n');
const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const local=(day:string,hhmm:string)=>`${day.replace(/-/g,'')}T${hhmm.replace(':','')}00`;

// Floating local times (no zone), so the alarms follow the phone wherever it is. Stable UIDs mean re-importing updates them.
export function remindersIcs(r:Reminders,today:string,now=new Date()){
 const event=(id:string,time:string,summary:string,description:string,hash:string)=>{const start=local(today,time),[h,m]=time.split(':').map(Number),endMin=h*60+m+10,end=local(endMin>=1440?addDays(today,1):today,`${String(Math.floor(endMin/60)%24).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`);
  return ['BEGIN:VEVENT',`UID:reboot-${id}@journal.gbaonvo.com`,`DTSTAMP:${stamp(now)}`,`DTSTART:${start}`,`DTEND:${end}`,'RRULE:FREQ=DAILY',`SUMMARY:${esc(summary)}`,`DESCRIPTION:${esc(`${description}\n${APP}#${hash}`)}`,`URL:${APP}#${hash}`,'TRANSP:TRANSPARENT',
   'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${esc(summary)}`,'TRIGGER:PT0M','END:VALARM','END:VEVENT'];};
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Project Reboot//Frog reminders//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Reboot',
  ...event('frog-morning',r.morning,'Eat your frog first','Open Reboot and start the one task you would most like to put off. One slice is enough to begin.','Today'),
  ...event('frog-evening',r.evening,'Choose tomorrow’s frog','Pick tomorrow’s frog before bed, so the morning starts already decided.','Today'),
  'END:VCALENDAR'].join('\r\n')+'\r\n';
}

export const notificationsSupported=()=>typeof window!=='undefined'&&'Notification' in window;
export async function askPermission(){if(!notificationsSupported())return 'unsupported';if(Notification.permission!=='default')return Notification.permission;return Notification.requestPermission();}

// Shown through the service worker when there is one, so the installed app and closed tabs behave the same.
export async function notify(title:string,body:string,tag:string){
 if(!notificationsSupported()||Notification.permission!=='granted')return false;
 const options:NotificationOptions={body,tag,icon:'/icons/icon-192.png',badge:'/icons/icon-192.png'};
 try{const reg=await navigator.serviceWorker?.getRegistration();if(reg){await reg.showNotification(title,options);return true;}}catch{/* fall through to a page notification */}
 try{new Notification(title,options);return true;}catch{return false;}
}

// What each reminder says right now, or nothing when it is no longer needed (frog already eaten, tomorrow's already chosen).
export function dueReminder(kind:'morning'|'evening',state:State,today:string){
 const todos=state.todos??[];
 if(kind==='morning'){const frog=todos.find(t=>t.date===today&&t.frog);if(frog?.done)return null;
  return {title:'Eat your frog first',body:frog?`Your frog: ${frog.text}. Start with one slice.`:'Pick today’s frog: the one task you would most like to put off.'};}
 if(todos.some(t=>t.date===addDays(today,1)&&t.frog))return null;
 return {title:'Choose tomorrow’s frog',body:'One task, decided tonight, so the morning starts already decided.'};
}

// A reminder fires once a day, at its time or when Reboot is opened within two hours after it.
export function isDue(hhmm:string,date:Date){const [h,m]=hhmm.split(':').map(Number),at=h*60+m,minutes=date.getHours()*60+date.getMinutes();return minutes>=at&&minutes-at<120;}
