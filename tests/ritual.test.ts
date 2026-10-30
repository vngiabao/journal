import {describe,it,expect} from 'vitest';
import {seed} from '../src/seed';
import type {Todo} from '../src/model';
import {activeRitual,hasWeekStep,isPlanDay,isMonthEnd,planWeek,planMonth,markRitual,ritualOf,suggestFrog,frogCandidates,chooseFrog,newFrog,afterFrog,toTomorrow,leftToSettle,rewriteTomorrow,letGo,settledOn,setTomorrowFrog,tomorrowsFrog,todaysTasks} from '../src/ritual/rules';
import {leftovers} from '../src/frog-rules';

const FRI='2026-10-30',SAT='2026-10-31',SUN='2026-11-01';
const todo=(date:string,p:Partial<Todo>={}):Todo=>({id:crypto.randomUUID(),date,text:'Task',done:false,createdAt:date,...p});

describe('Which ritual leads Today',()=>{
 it('morning until 17:00, evening after, nothing once each is done',()=>{
  const s=seed('2026-10-01');
  expect(activeRitual(s,FRI,9)).toBe('morning');
  expect(activeRitual(s,FRI,17)).toBe('evening');
  markRitual(s,FRI,'morning','2026-10-30T13:00:00Z');
  expect(activeRitual(s,FRI,10)).toBeNull();
  expect(activeRitual(s,FRI,19)).toBe('evening');
  markRitual(s,FRI,'evening');expect(activeRitual(s,FRI,21)).toBeNull();
  expect(ritualOf(s,FRI)?.morning).toBe('2026-10-30T13:00:00Z');
 });
 it('marks a ritual once, so a second finish keeps the first time',()=>{
  const s=seed('2026-10-01');markRitual(s,FRI,'morning','A');markRitual(s,FRI,'morning','B');
  expect(s.rituals).toEqual([{date:FRI,morning:'A'}]);
 });
 it('adds the week step on Sunday and Saturday evening, until it is done',()=>{
  const s=seed('2026-10-01');
  expect(isPlanDay(SUN,9)).toBe(true);expect(isPlanDay(SAT,9)).toBe(false);expect(isPlanDay(SAT,18)).toBe(true);expect(isPlanDay(FRI,20)).toBe(false);
  expect(hasWeekStep(s,SUN,9)).toBe(true);markRitual(s,SUN,'week');expect(hasWeekStep(s,SUN,19)).toBe(false);
 });
 it('plans next week at the weekend and next month in its last three days',()=>{
  expect(planWeek(SUN)).toBe('2026-11-02');expect(planWeek(SAT)).toBe('2026-11-02');expect(planWeek(FRI)).toBe('2026-10-26');
  expect(isMonthEnd('2026-10-29')).toBe(true);expect(isMonthEnd('2026-10-28')).toBe(false);
  expect(planMonth('2026-10-30')).toBe('2026-11');expect(planMonth('2026-10-10')).toBe('2026-10');
 });
});

describe('Morning: frog and today’s three',()=>{
 it('suggests the frog already chosen, else the best task, never the gym or a hand-off',()=>{
  const s=seed('2026-10-01');
  s.todos=[todo(FRI,{text:'gym',auto:'workout',priority:'A'}),todo(FRI,{text:'hand off',priority:'D'}),todo(FRI,{text:'b',priority:'B'}),todo(FRI,{text:'a',priority:'A'}),todo(FRI,{text:'routine',routine:'plan',priority:'A'})];
  expect(suggestFrog(s,FRI)?.text).toBe('a');
  expect(frogCandidates(s,FRI).map(t=>t.text)).toEqual(['a','b']);
  s.todos.push(todo(FRI,{text:'set last night',frog:true}));
  expect(suggestFrog(s,FRI)?.text).toBe('set last night');
  expect(todaysTasks(s,FRI).some(t=>t.routine)).toBe(false);
 });
 it('choosing a frog makes it the only frog, an A task, and remembers it',()=>{
  const s=seed('2026-10-01');const a=todo(FRI,{frog:true}),b=todo(FRI,{priority:'C'});s.todos=[a,b];
  chooseFrog(s,FRI,b.id);
  expect(s.todos.filter(t=>t.frog).map(t=>t.id)).toEqual([b.id]);expect(s.todos.find(t=>t.id===b.id)?.priority).toBe('A');
  expect(ritualOf(s,FRI)?.frog).toBe(b.id);
  const t=newFrog(s,FRI,'Write the deck');expect(s.todos.filter(x=>x.frog)).toEqual([t]);expect(ritualOf(s,FRI)?.frog).toBe(t.id);
 });
 it('lists what comes after the frog best first; "Tomorrow" moves a task off today',()=>{
  const s=seed('2026-10-01');const c=todo(FRI,{text:'c',priority:'C'}),a=todo(FRI,{text:'a',priority:'A'}),u=todo(FRI,{text:'u'});s.todos=[todo(FRI,{text:'frog',frog:true}),c,a,u];
  expect(afterFrog(s,FRI).map(t=>t.text)).toEqual(['a','c','u']);
  toTomorrow(s,a.id,FRI);expect(afterFrog(s,FRI).map(t=>t.text)).toEqual(['c','u']);expect(s.todos.find(t=>t.id===a.id)?.date).toBe(SAT);
 });
});

describe('Evening: the rewrite rule and tomorrow’s frog',()=>{
 it('settles today’s unfinished tasks and older leftovers by rewriting or letting go',()=>{
  const s=seed('2026-10-01');const old=todo('2026-10-29',{text:'old',priority:'B'}),today=todo(FRI,{text:'today'}),done=todo(FRI,{done:true}),gym=todo(FRI,{auto:'workout'});s.todos=[old,today,done,gym];
  expect(leftToSettle(s,FRI).map(t=>t.text)).toEqual(['old','today']);
  rewriteTomorrow(s,old.id,'  old, again ',FRI);
  const copy=s.todos.find(t=>t.date===SAT);expect(copy).toMatchObject({text:'old, again',priority:'B',done:false});
  letGo(s,today.id,FRI);
  expect(leftToSettle(s,FRI)).toEqual([]);
  expect(leftovers(s.todos,SAT).map(t=>t.text)).toEqual([]);
  rewriteTomorrow(s,today.id,'   ',FRI);expect(s.todos.filter(t=>t.date===SAT)).toHaveLength(1);
 });
 it('counts tonight’s settling: written again for tomorrow, and let go',()=>{
  const s=seed('2026-10-01');const a=todo(FRI,{text:'a'}),b=todo(FRI,{text:'b'}),c=todo('2026-10-29',{text:'c'}),old=todo('2026-10-28',{text:'old',carried:'dropped',carriedOn:'2026-10-28'});s.todos=[a,b,c,old];
  expect(settledOn(s,FRI)).toEqual({again:0,dropped:0,total:0});
  rewriteTomorrow(s,a.id,'a again',FRI);letGo(s,b.id,FRI);letGo(s,c.id,FRI);
  expect(settledOn(s,FRI)).toEqual({again:1,dropped:2,total:3});
  expect(leftToSettle(s,FRI)).toEqual([]);
 });
 it('sets tomorrow’s frog from tomorrow’s list or from new words, one at a time',()=>{
  const s=seed('2026-10-01');const t=todo(SAT,{text:'call'});s.todos=[t];
  setTomorrowFrog(s,FRI,{id:t.id});expect(tomorrowsFrog(s,FRI)?.text).toBe('call');expect(t.priority).toBe('A');
  setTomorrowFrog(s,FRI,{text:'Draft the essay'});expect(tomorrowsFrog(s,FRI)?.text).toBe('Draft the essay');
  expect(s.todos.filter(x=>x.frog)).toHaveLength(1);
 });
});
