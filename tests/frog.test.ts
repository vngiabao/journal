import {describe,it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {seed} from '../src/seed';
import {frogStats,frogOf,priorityRank} from '../src/frog-rules';
import {remindersIcs,dueReminder,isDue,DEFAULT_REMINDERS,remindersOf} from '../src/reminders';
import {validateImport} from '../src/storage';
import type {Todo} from '../src/model';

const todo=(date:string,p:Partial<Todo>={}):Todo=>({id:crypto.randomUUID(),date,text:'Task',done:false,createdAt:date,...p});

describe('Frog habit',()=>{
 it('counts frogs eaten, the running frog streak and the ones eaten before noon',()=>{
  const todos=[todo('2026-10-20',{frog:true,done:true,doneAt:'2026-10-20T09:00:00'}),todo('2026-10-21',{frog:true,done:true,doneAt:'2026-10-21T15:00:00'}),todo('2026-10-22',{frog:true,done:true,doneAt:'2026-10-22T08:30:00'}),todo('2026-10-22',{done:true}),todo('2026-10-23',{frog:true})];
  expect(frogStats(todos,'2026-10-23')).toEqual({eaten:3,streak:3,early:2});
  expect(frogStats(todos,'2026-10-25').streak).toBe(0);
 });
 it('finds the day’s frog and sorts A, B, C, unlabelled, D, E, then done',()=>{
  const s=seed('2026-10-01');s.todos=[todo('2026-10-23',{text:'frog',frog:true}),todo('2026-10-24',{frog:true})];
  expect(frogOf(s,'2026-10-23')?.text).toBe('frog');
  const list=[todo('d',{priority:'E'}),todo('d',{done:true,priority:'A'}),todo('d'),todo('d',{priority:'B'}),todo('d',{priority:'A'}),todo('d',{priority:'D'})];
  expect(list.sort((a,b)=>priorityRank(a)-priorityRank(b)).map(t=>t.done?'done':t.priority??'-')).toEqual(['A','B','-','D','E','done']);
 });
 it('accepts frog fields in a backup and rejects broken ones',()=>{
  const s=seed('2026-10-01');s.todos=[todo('2026-10-23',{frog:true,priority:'A',slices:[{id:'x',text:'Open the doc',done:false}],doneAt:'2026-10-23T09:00:00.000Z'})];s.settings.reminders={morning:'08:30',evening:'21:00',notify:true};
  expect(()=>validateImport(structuredClone(s))).not.toThrow();
  const bad=structuredClone(s);(bad.todos![0] as unknown as {priority:string}).priority='Z';expect(()=>validateImport(bad)).toThrow();
  const late=structuredClone(s);late.settings.reminders={morning:'8am',evening:'21:00',notify:true};expect(()=>validateImport(late)).toThrow();
 });
});

describe('Frog reminders',()=>{
 it('writes a calendar with two daily alarms at local times',()=>{
  const ics=remindersIcs({morning:'08:30',evening:'21:00',notify:false},'2026-10-23',new Date('2026-10-23T12:00:00Z'));
  expect(ics).toContain('DTSTART:20261023T083000');expect(ics).toContain('DTSTART:20261023T210000');
  expect(ics.match(/RRULE:FREQ=DAILY/g)).toHaveLength(2);expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
  expect(ics).toContain('UID:reboot-frog-morning@journal.gbaonvo.com');expect(ics.split('\r\n').at(-2)).toBe('END:VCALENDAR');
 });
 it('rolls an end time past midnight onto the next day',()=>{expect(remindersIcs({morning:'08:30',evening:'23:55',notify:false},'2026-10-23')).toContain('DTEND:20261024T000500');});
 it('stays quiet once the frog is eaten or tomorrow’s is chosen',()=>{
  const s=seed('2026-10-01');s.todos=[todo('2026-10-23',{frog:true,text:'Send the application'})];
  expect(dueReminder('morning',s,'2026-10-23')?.body).toContain('Send the application');
  s.todos[0].done=true;expect(dueReminder('morning',s,'2026-10-23')).toBeNull();
  expect(dueReminder('evening',s,'2026-10-23')).not.toBeNull();
  s.todos.push(todo('2026-10-24',{frog:true}));expect(dueReminder('evening',s,'2026-10-23')).toBeNull();
 });
 it('is due from its time for two hours, and defaults fill in missing settings',()=>{
  expect(isDue('08:30',new Date(2026,9,23,8,29))).toBe(false);expect(isDue('08:30',new Date(2026,9,23,8,30))).toBe(true);expect(isDue('08:30',new Date(2026,9,23,10,31))).toBe(false);
  expect(remindersOf(seed('2026-10-01'))).toEqual(DEFAULT_REMINDERS);
 });
});
