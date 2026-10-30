import {describe,it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {seed} from '../src/seed';
import {validateImport} from '../src/storage';
import type {State,DayRitual} from '../src/model';
import {addDays} from '../src/dates';
import {showUpDays,journey,milestoneAfter,isMilestone,milestonesUpTo,markCelebrated,celebrated,milestoneDue,milestoneKey,bondLine,dayLine,trailPose,keepsake,comingBack,weekWords,WELCOME} from '../src/bond/journey';

const NOW='2026-10-30'; // a Friday
const T='2026-10-30T08:00:00.000Z';
const fresh=()=>{const s=seed('2026-05-04');s.todos=[];return s;};
// A state that showed up `n` days in a row, ending `endAgo` days before NOW.
const streak=(n:number,endAgo=0,s:State=fresh())=>{s.rituals=[...(s.rituals??[]),...Array.from({length:n},(_,i)=>({date:addDays(NOW,-endAgo-i),morning:T}))];return s;};

describe('Bond milestones',()=>{
 it('follows 3, 7, 14, 21, 30, 50, 75, 100, then every 50',()=>{
  expect([0,2,3,6,7,13,14,20,21,29,30,49,50,74,75,99,100,101,149,150,151].map(milestoneAfter)).toEqual([3,3,7,7,14,14,21,21,30,30,50,50,75,75,100,100,150,150,150,200,200]);
  expect(milestonesUpTo(160)).toEqual([3,7,14,21,30,50,75,100,150]);
  expect(isMilestone(7)).toBe(true);expect(isMilestone(8)).toBe(false);expect(isMilestone(250)).toBe(true);expect(isMilestone(0)).toBe(false);
 });
 it('gives every milestone a keepsake and a line without em dashes',()=>{
  for(const n of milestonesUpTo(400)){const k=keepsake(n);expect(k.name).toBeTruthy();expect(k.line).not.toMatch(/—/);}
  expect(keepsake(7).line).toBe('That’s 7 days. Bond found a stick.');
 });
});

describe('Show-up days',()=>{
 it('counts a date once when the morning or evening ritual was finished',()=>{
  const s=fresh();
  s.rituals=[{date:'2026-10-28',morning:T},{date:'2026-10-28',evening:T},{date:'2026-10-27',week:T},{date:'2026-10-26',frog:'x'},{date:'2026-10-25',evening:T}] as DayRitual[];
  expect(showUpDays(s)).toEqual(['2026-10-25','2026-10-28']);
 });
 it('is empty with no rituals at all',()=>{const s=fresh();delete s.rituals;expect(showUpDays(s)).toEqual([]);expect(journey(s,NOW).total).toBe(0);});
});

describe('journey()',()=>{
 it('starts at zero, Bond waiting for the first flag at 3',()=>{
  const j=journey(fresh(),NOW);
  expect(j).toMatchObject({total:0,today:false,weekCount:0,next:3,prev:0,toNext:3,sinceLast:null,gap:null,milestoneToday:null});
  expect(dayLine(j)).toBe('Day one is today');expect(trailPose(j)).toBe('sit');
  expect(bondLine(j,9)).toBe('Bond’s waiting at the start of the trail.');
 });
 it('counts this week Monday to Sunday',()=>{
  const j=journey(streak(6),NOW); // Sun 25 .. Fri 30: Mon..Fri are this week
  expect(j.week).toEqual([true,true,true,true,true,false,false]);expect(j.weekCount).toBe(5);
 });
 it('on a milestone day keeps the finished stretch, with Bond at the flag',()=>{
  const j=journey(streak(3),NOW);
  expect(j).toMatchObject({total:3,today:true,milestoneToday:3,next:3,prev:0,toNext:0});
  expect(bondLine(j,9)).toBe('Three days. Bond knows the way now.');expect(trailPose(j)).toBe('flag');
  expect(trailPose(journey(streak(7),NOW))).toBe('stick');
  expect(j.earned).toEqual([{n:3,date:NOW}]); // reached on the third show-up: today
 });
 it('the day after a milestone looks ahead to the next one',()=>{
  const j=journey(streak(3,1),NOW);
  expect(j).toMatchObject({total:3,today:false,milestoneToday:null,next:7,prev:3,toNext:4,sinceLast:1});
  expect(bondLine(j,8)).toBe('Bond’s waiting for you.');expect(bondLine(j,19)).toBe('Bond saved you a spot for tonight.');
  expect(dayLine(j)).toBe('3 days together');
 });
 it('reads in one phrasing before and after the check-in',()=>{
  const j=journey(streak(12),NOW);
  expect(dayLine(j)).toBe('12 days together');expect(dayLine(journey(streak(11,1),NOW))).toBe('11 days together');
  expect(dayLine(journey(streak(1),NOW))).toBe('1 day together');expect(j).toMatchObject({next:14,prev:7,toNext:2});expect(trailPose(j)).toBe('walk-a');
  expect(j.earned.map(e=>e.n)).toEqual([3,7]);
 });
 it('after a gap: no shame before the check-in, a welcome after it',()=>{
  const away=journey(streak(5,4),NOW);
  expect(away).toMatchObject({total:5,sinceLast:4,gap:4,today:false});
  expect(bondLine(away,9)).toBe('Bond missed you. Welcome back.');expect(trailPose(away)).toBe('tilt');
  const back=journey(streak(1,0,streak(5,4)),NOW);
  expect(back).toMatchObject({total:6,today:true,gap:4,sinceLast:0});
  expect(bondLine(back,8)).toBe('Good morning - you came back.');expect(bondLine(back,20)).toBe('You came back. Bond noticed.');
 });
 it('coming back after two days away shows the welcome, never an empty week',()=>{
  const away=journey(streak(4,5),NOW);
  expect(comingBack(away)).toBe(true);expect(bondLine(away,9)).toBe(WELCOME);
  expect(comingBack(journey(streak(4,1),NOW))).toBe(false);
  expect(comingBack(journey(streak(1,0,streak(4,5)),NOW))).toBe(false);
  expect(comingBack(journey(fresh(),NOW))).toBe(false);
  // No form of the week reads "0 of 7".
  expect(weekWords(away)).not.toMatch(/^0 of 7/);expect(weekWords(journey(fresh(),NOW))).toBe('Your first stone is today');
  expect(weekWords(journey(streak(3),NOW))).toBe('3 of 7 this week');
 });
 it('ignores rituals dated after today',()=>{const s=streak(2);s.rituals!.push({date:addDays(NOW,3),morning:T});expect(journey(s,NOW).total).toBe(2);});
});

describe('celebrating once',()=>{
 it('marks a milestone celebrated and stops it coming due again',()=>{
  const s=streak(7);
  expect(milestoneDue(s,NOW)).toBe(7);
  markCelebrated(s,milestoneKey(7));markCelebrated(s,milestoneKey(7));
  expect(s.bond?.celebrated).toEqual(['days-7']);expect(celebrated(s,'days-7')).toBe(true);
  expect(milestoneDue(s,NOW)).toBeNull();
 });
 it('never celebrates an old milestone retroactively',()=>{expect(milestoneDue(streak(7,1),NOW)).toBeNull();expect(milestoneDue(streak(8),NOW)).toBeNull();});
});

describe('backup validation for rituals and bond',()=>{
 it('accepts valid rituals and bond state',()=>{
  const s=streak(3);markCelebrated(s,'days-3');s.bond!.lastGreeted=NOW;s.rituals![0].frog='todo-1';s.rituals![0].evening=T;
  expect(()=>validateImport(JSON.parse(JSON.stringify(s)))).not.toThrow();
 });
 it('rejects broken rituals and bond state',()=>{
  const bad:((s:State)=>void)[]=[
   s=>{(s as unknown as {rituals:unknown}).rituals='nope';},
   s=>{s.rituals=[{date:'2026-13-01',morning:T}];},
   s=>{s.rituals=[{date:NOW,morning:5 as unknown as string}];},
   s=>{s.rituals=[{date:NOW,morning:T},{date:NOW,evening:T}];},
   s=>{s.bond={celebrated:[3 as unknown as string]};},
   s=>{s.bond={lastGreeted:'yesterday'};},
   s=>{(s as unknown as {bond:unknown}).bond=[];},
  ];
  for(const f of bad){const s=fresh();f(s);expect(()=>validateImport(JSON.parse(JSON.stringify(s)))).toThrow();}
 });
});
