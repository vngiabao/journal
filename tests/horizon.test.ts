import {describe,it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {seed} from '../src/seed';
import {validateImport} from '../src/storage';
import type {State,PlanGoal} from '../src/model';
import {addGoal,addStep,toggleStep,stepToToday,stepToPeriod,toggleItem,itemToWeek,itemToDay,syncStepFromTodo,moveStep,linkBoard,removeGoal,restoreGoal,removeStep,restoreStep,stepPlace,stepTag,weekOf,monthOf,setStepDue,renameGoal,setGoalDeadline,chooseOne} from '../src/plan';
import {wrapText,taperedOutline,fitHits,mindCrop,mindLayout} from '../src/horizon/geometry';

const NOW='2026-10-23';
const fresh=()=>{const s=seed('2026-05-04');s.todos=[];return s;};
const withGoal=(n=3)=>{const s=fresh(),g=addGoal(s,'I raised a pre-seed round');for(let i=0;i<n;i++)addStep(s,g.id,`Step ${i+1}`);return {s,g:s.plan!.goals[0] as PlanGoal};};
const measure=(t:string)=>t.length*8;

describe('Horizon plan functions',()=>{
 it('sends a step into a week or month list once, linked to the step',()=>{
  const {s,g}=withGoal();const st=g.steps[0];
  const it=stepToPeriod(s,g.id,st.id,'week',weekOf(NOW));
  expect(it&&it.stepId).toBe(st.id);expect(it&&it.goalId).toBe(g.id);
  expect(stepToPeriod(s,g.id,st.id,'week',weekOf(NOW))).toBe(false);
  expect(stepToPeriod(s,g.id,st.id,'month',monthOf(NOW))).toBeTruthy();
  expect(s.plan!.items).toHaveLength(2);
 });
 it('toggleStep sets doneAt and ticks linked items and to-dos both ways',()=>{
  const {s,g}=withGoal();const st=g.steps[0];
  const it=stepToPeriod(s,g.id,st.id,'week',weekOf(NOW));if(!it)throw new Error('no item');
  itemToDay(s,it.id,NOW);stepToToday(s,g.id,st.id,NOW);
  toggleStep(s,g.id,st.id);
  expect(st.done).toBe(true);expect(st.doneAt).toBeTruthy();
  expect(s.plan!.items![0].done).toBe(true);expect(s.todos!.every(t=>t.done)).toBe(true);
  toggleStep(s,g.id,st.id);
  expect(st.doneAt).toBeUndefined();expect(s.todos!.every(t=>!t.done)).toBe(true);expect(s.plan!.items![0].done).toBe(false);
 });
 it('ticking a linked item or its to-do marks the step done',()=>{
  const {s,g}=withGoal();const st=g.steps[1];
  const m=stepToPeriod(s,g.id,st.id,'month',monthOf(NOW));if(!m)throw new Error('no item');
  itemToWeek(s,m.id,weekOf(NOW));const w=s.plan!.items!.find(x=>x.scope==='week')!;
  expect(w.stepId).toBe(st.id);
  itemToDay(s,w.id,NOW);const t=s.todos![0];t.done=true;syncStepFromTodo(s,t.id);
  expect(st.done).toBe(true);expect(m.done).toBe(true);expect(w.done).toBe(true);
  toggleItem(s,m.id);expect(st.done).toBe(false);
 });
 it('plain items without a step behave as before',()=>{
  const s=fresh();(s.plan={goals:[],items:[{id:'a',scope:'month',period:'2026-10',text:'Deck',done:false}]});
  itemToWeek(s,'a',weekOf(NOW));const w=s.plan.items!.find(x=>x.scope==='week')!;expect(w.stepId).toBeUndefined();
  toggleItem(s,w.id);expect(s.plan.items![0].done).toBe(true);
 });
 it('moves, removes and restores steps in place',()=>{
  const {s,g}=withGoal(4);moveStep(s,g.id,g.steps[3].id,-1);expect(g.steps.map(x=>x.text)).toEqual(['Step 1','Step 2','Step 4','Step 3']);
  moveStep(s,g.id,g.steps[0].id,-1);expect(g.steps[0].text).toBe('Step 1');
  const r=removeStep(s,g.id,g.steps[1].id)!;expect(g.steps).toHaveLength(3);restoreStep(s,g.id,r.step,r.index);expect(g.steps[1].text).toBe('Step 2');
 });
 it('edits a goal, links a board square, picks the one, and removes a goal with undo',()=>{
  const {s,g}=withGoal();addGoal(s,'I run a half marathon');
  renameGoal(s,g.id,'  I raised a seed round  ');expect(g.text).toBe('I raised a seed round');renameGoal(s,g.id,'   ');expect(g.text).toBe('I raised a seed round');
  setGoalDeadline(s,g.id,'2027-03-01');expect(g.deadline).toBe('2027-03-01');setGoalDeadline(s,g.id,undefined);expect(g.deadline).toBeUndefined();
  chooseOne(s,g.id);expect(g.one).toBe(true);chooseOne(s,s.plan!.goals[1].id);expect(g.one).toBe(false);chooseOne(s,g.id);
  linkBoard(s,g.id,'16');expect(g.boardGoal).toBe('16');linkBoard(s,g.id,undefined);expect(g.boardGoal).toBeUndefined();
  const r=removeGoal(s,g.id)!;expect(s.plan!.goals).toHaveLength(1);restoreGoal(s,r.goal,r.index);expect(s.plan!.goals[0].id).toBe(g.id);expect(s.plan!.goals[0].one).toBe(true);
 });
 it('stepPlace and stepTag follow the chain',()=>{
  const {s,g}=withGoal(5);const [a,b,c,d,e]=g.steps;
  toggleStep(s,g.id,a.id);stepToToday(s,g.id,b.id,NOW);stepToPeriod(s,g.id,c.id,'week',weekOf(NOW));stepToPeriod(s,g.id,d.id,'month','2026-11');setStepDue(s,g.id,e.id,'2026-10-01');
  expect([a,b,c,d,e].map(x=>stepPlace(s,x,NOW))).toEqual(['done','today','week','month','late']);
  expect(stepTag(s,b,NOW)).toBe('On today');expect(stepTag(s,c,NOW)).toBe('This week');expect(stepTag(s,d,NOW)).toBe('In November');expect(stepTag(s,a,NOW)).toMatch(/^Done /);
  setStepDue(s,g.id,e.id,undefined);expect(stepPlace(s,e,NOW)).toBe('open');
 });
 it('old saved plan data and the new optional fields pass import validation',()=>{
  const {s,g}=withGoal();stepToPeriod(s,g.id,g.steps[0].id,'week',weekOf(NOW));g.boardGoal='16';g.reachedAt=NOW;g.steps[0].due='2026-11-01';toggleStep(s,g.id,g.steps[1].id);
  expect(()=>validateImport(structuredClone(s))).not.toThrow();
  const bad=structuredClone(s) as State;bad.plan!.goals[0].reachedAt='soon';expect(()=>validateImport(bad)).toThrow();
  const legacy=fresh();legacy.plan={goals:[{id:'x',text:'Old goal',steps:[{id:'y',text:'Old step',done:false}],createdAt:'2026-09-01T00:00:00Z'}],items:[{id:'i',scope:'week',period:'2026-10-19',text:'Old',done:false}]};
  expect(()=>validateImport(structuredClone(legacy))).not.toThrow();expect(stepPlace(legacy,legacy.plan.goals[0].steps[0],NOW)).toBe('open');
 });
});

describe('Horizon geometry: labels',()=>{
 it('wraps to at most two lines with an ellipsis',()=>{
  const w=wrapText('I raised a pre-seed round for A Story with real investors',100,measure,2);expect(w.lines).toHaveLength(2);expect(w.truncated).toBe(true);expect(w.lines[1].endsWith('…')).toBe(true);
  expect(wrapText('Short',100,measure).lines).toEqual(['Short']);
 });
});

describe('Horizon geometry: the map',()=>{
 it('tapers a branch from thick to thin',()=>{const o=taperedOutline([0,0],[30,0],[60,0],[100,0],20,2,10);expect(o).toHaveLength(22);expect(Math.abs(o[0][1]-o[21][1])).toBeCloseTo(20,0);expect(Math.abs(o[10][1]-o[11][1])).toBeCloseTo(2,0);});
});

describe('life map targets and crop',()=>{
 const G=12;
 it('every line on a branch gets a 44px hit area, and neighbours meet without overlapping',()=>{
  // A goal with its next step, a single-line vision, then "+ Add" (heights as LifeMap builds them).
  const rows=[{kind:'goal',h:24+3+6+19+G,textH:0},{kind:'step',h:22+3+30+G,textH:22},{kind:'vision',h:27+G,textH:0},{kind:'add',h:30+G,textH:0}];
  const f=fitHits(rows,G);let top=0;const spans:[number,number][]=[];
  f.forEach((r,j)=>{if(rows[j].kind==='step'){expect(r.hit).toBeGreaterThanOrEqual(44);expect(r.doHit).toBeGreaterThanOrEqual(44);spans.push([top-r.up,top-r.up+r.hit],[top-r.up+r.hit,top-r.up+r.hit+r.doHit]);}
   else{expect(r.hit).toBeGreaterThanOrEqual(44);spans.push([top-r.up,top-r.up+r.hit]);}
   expect(r.h).toBeGreaterThanOrEqual(rows[j].h);top+=r.h;});
  for(let k=1;k<spans.length;k++)expect(spans[k][0]).toBeCloseTo(spans[k-1][1],5);
 });
 it('a two-line step needs no extra space between its words and "Do today"',()=>{
  const f=fitHits([{kind:'goal',h:64,textH:0},{kind:'step',h:44+3+30+G,textH:44}],G);
  expect(f[1].pad).toBe(0);
 });
 it('the map is cropped to the band its drawing uses, never cutting the drawing',()=>{
  const areas=Array.from({length:7},()=>({rows:[],minH:58,nameW:120}));
  const L=mindLayout(areas,{width:2000,height:1400,mode:'both',cloudW:330});
  const c=mindCrop(L,{rowsH:areas.map(()=>[]),rowUp:G,nameAbove:51,nameBelow:43,half:15,pad:24});
  expect(c.height).toBeLessThan(L.height);expect(c.off).toBeGreaterThan(0);
  const ys=L.branches.flatMap(b=>[b.name.y-51,b.name.y+43]).concat([L.cloud.cy-L.cloud.h/2,L.cloud.cy+L.cloud.h/2]);
  for(const y of ys){expect(y).toBeGreaterThanOrEqual(c.off);expect(y).toBeLessThanOrEqual(c.off+c.height);}
 });
});
