import {describe,it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {seed} from '../src/seed';
import {validateImport} from '../src/storage';
import type {State,PlanGoal} from '../src/model';
import {addGoal,addStep,toggleStep,stepToToday,stepToPeriod,toggleItem,itemToWeek,itemToDay,syncStepFromTodo,reorderStep,reachGoal,unreachGoal,linkBoard,removeGoal,restoreGoal,removeStep,restoreStep,stepPlace,stepTag,weekOf,monthOf,setStepDue,isLate} from '../src/plan';
import {peakSlots,ridgeLayout,summitOf,hatchTop,hillPolygon,wrapText,layoutLabels,catmullRom,foldSteps,trailLayout,taperedOutline,mapLayout,BAND_DESKTOP,BAND_PHONE} from '../src/horizon/geometry';

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
 it('reorders, removes and restores steps in place',()=>{
  const {s,g}=withGoal(4);reorderStep(s,g.id,3,0);expect(g.steps.map(x=>x.text)).toEqual(['Step 4','Step 1','Step 2','Step 3']);
  reorderStep(s,g.id,0,99);expect(g.steps.at(-1)!.text).toBe('Step 4');
  const r=removeStep(s,g.id,g.steps[1].id)!;expect(g.steps).toHaveLength(3);restoreStep(s,g.id,r.step,r.index);expect(g.steps[1].text).toBe('Step 2');
 });
 it('reaches, unreaches, links a board square, and removes a goal with undo',()=>{
  const {s,g}=withGoal();g.one=true;addGoal(s,'I run a half marathon');
  reachGoal(s,g.id,NOW);expect(g.reachedAt).toBe(NOW);unreachGoal(s,g.id);expect(g.reachedAt).toBeUndefined();
  linkBoard(s,g.id,'16');expect(g.boardGoal).toBe('16');linkBoard(s,g.id,undefined);expect(g.boardGoal).toBeUndefined();
  const r=removeGoal(s,g.id)!;expect(s.plan!.goals).toHaveLength(1);restoreGoal(s,r.goal,r.index);expect(s.plan!.goals[0].id).toBe(g.id);expect(s.plan!.goals[0].one).toBe(true);
 });
 it('stepPlace and stepTag follow the chain',()=>{
  const {s,g}=withGoal(5);const [a,b,c,d,e]=g.steps;
  toggleStep(s,g.id,a.id);stepToToday(s,g.id,b.id,NOW);stepToPeriod(s,g.id,c.id,'week',weekOf(NOW));stepToPeriod(s,g.id,d.id,'month','2026-11');setStepDue(s,g.id,e.id,'2026-10-01');
  expect([a,b,c,d,e].map(x=>stepPlace(s,x,NOW))).toEqual(['done','today','week','month','late']);
  expect(stepTag(s,b,NOW)).toBe('On today');expect(stepTag(s,c,NOW)).toBe('This week');expect(stepTag(s,d,NOW)).toBe('In November');expect(stepTag(s,a,NOW)).toMatch(/^Done /);
  expect(isLate(e,NOW)).toBe(true);setStepDue(s,g.id,e.id,undefined);expect(stepPlace(s,e,NOW)).toBe('open');
 });
 it('old saved plan data and the new optional fields pass import validation',()=>{
  const {s,g}=withGoal();stepToPeriod(s,g.id,g.steps[0].id,'week',weekOf(NOW));g.boardGoal='16';g.reachedAt=NOW;g.steps[0].due='2026-11-01';toggleStep(s,g.id,g.steps[1].id);
  expect(()=>validateImport(structuredClone(s))).not.toThrow();
  const bad=structuredClone(s) as State;bad.plan!.goals[0].reachedAt='soon';expect(()=>validateImport(bad)).toThrow();
  const legacy=fresh();legacy.plan={goals:[{id:'x',text:'Old goal',steps:[{id:'y',text:'Old step',done:false}],createdAt:'2026-09-01T00:00:00Z'}],items:[{id:'i',scope:'week',period:'2026-10-19',text:'Old',done:false}]};
  expect(()=>validateImport(structuredClone(legacy))).not.toThrow();expect(stepPlace(legacy,legacy.plan.goals[0].steps[0],NOW)).toBe('open');
 });
});

describe('Horizon geometry: the ridge',()=>{
 it('adds a slot for the "Add a goal" peak until there are ten',()=>{expect(peakSlots(0)).toBe(1);expect(peakSlots(1)).toBe(2);expect(peakSlots(9)).toBe(10);expect(peakSlots(10)).toBe(10);});
 it('0 goals: a flat horizon with only the dashed peak in the middle',()=>{const r=ridgeLayout(0,1000,-1,BAND_DESKTOP);expect(r.peaks).toHaveLength(0);expect(r.add!.x).toBe(500);});
 it('1 goal: one peak and the add peak beside it',()=>{const r=ridgeLayout(1,1000,0,BAND_DESKTOP);expect(r.peaks[0].x).toBe(250);expect(r.peaks[0].summit).toBe(BAND_DESKTOP.one);expect(r.add!.x).toBe(750);});
 it('10 goals: no add peak, the one is tallest, others alternate',()=>{
  const r=ridgeLayout(10,1200,5,BAND_DESKTOP);expect(r.add).toBeNull();expect(r.peaks).toHaveLength(10);
  const s=r.peaks.map(p=>p.summit);expect(Math.min(...s)).toBe(BAND_DESKTOP.one);expect(s.filter(x=>x===BAND_DESKTOP.one)).toHaveLength(1);
  expect(new Set(s.filter((_,i)=>i!==5))).toEqual(new Set([BAND_DESKTOP.high,BAND_DESKTOP.low]));
  for(let i=1;i<10;i++)expect(r.peaks[i].x).toBeGreaterThan(r.peaks[i-1].x);
  expect(r.line[0][0]).toBe(0);expect(r.line.at(-1)![0]).toBe(1200);
 });
 it('summits alternate around the one, and the phone band is shorter',()=>{expect([0,1,2,3].map(i=>summitOf(i,1,BAND_DESKTOP))).toEqual([BAND_DESKTOP.high,BAND_DESKTOP.one,BAND_DESKTOP.low,BAND_DESKTOP.high]);expect(BAND_PHONE.height).toBeLessThan(BAND_DESKTOP.height);});
 it('shading rises from the base in proportion to steps done',()=>{const p={summit:100,base:200};expect(hatchTop(p,0,10)).toBe(200);expect(hatchTop(p,5,10)).toBe(150);expect(hatchTop(p,10,10)).toBe(100);expect(hatchTop(p,3,0)).toBe(200);});
 it('hill polygons close down to the base line',()=>{const r=ridgeLayout(3,900,1,BAND_DESKTOP),poly=hillPolygon(r.peaks[0].hill,r.peaks[0].base);expect(poly.at(-1)![1]).toBe(BAND_DESKTOP.base);expect(poly.at(-2)![1]).toBe(BAND_DESKTOP.base);});
});

describe('Horizon geometry: labels',()=>{
 it('wraps to at most two lines with an ellipsis',()=>{
  const w=wrapText('I raised a pre-seed round for A Story with real investors',100,measure,2);expect(w.lines).toHaveLength(2);expect(w.truncated).toBe(true);expect(w.lines[1].endsWith('…')).toBe(true);
  expect(wrapText('Short',100,measure).lines).toEqual(['Short']);
 });
 const overlap=(a:{left:number;top:number;width:number;lines:string[]},b:typeof a,lh:number)=>a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.lines.length*lh&&a.top+a.lines.length*lh>b.top;
 for(const n of [1,6,10])for(const width of [360,1000,1600])it(`never overlaps: ${n} goals across ${width}px`,()=>{
  const r=ridgeLayout(n,width,Math.min(5,n-1),BAND_DESKTOP),texts=['I weigh 75 kg and keep it','I work as a product manager at a startup','I read 20 books','I sing one song well','I have a girlfriend I love','I raised a pre-seed round for A Story','I run a half marathon','I speak Japanese at work','I am on a team I trust','I visit Vietnam with my parents'];
  const out=layoutLabels(r.peaks.map(p=>({x:p.x,bottom:p.summit-46,text:texts[p.index],priority:p.one?1:0})),{maxWidth:Math.min(190,1.8*r.slot),lineHeight:19,rowStep:40,gap:10,bandWidth:width,measure});
  for(let i=0;i<out.length;i++){expect(out[i].left).toBeGreaterThanOrEqual(0);expect(out[i].left+out[i].width).toBeLessThanOrEqual(width+.5);for(let j=i+1;j<out.length;j++)expect(overlap(out[i],out[j],19)).toBe(false);}
 });
 it('avoids obstacles such as pennants',()=>{const out=layoutLabels([{x:100,bottom:100,text:'A label',priority:0}],{maxWidth:150,lineHeight:19,rowStep:40,gap:4,bandWidth:400,measure,obstacles:[{l:60,r:140,t:70,b:100}]});expect(out[0].row).toBe(1);});
});

describe('Horizon geometry: the trail',()=>{
 it('builds a smooth path through the points',()=>{expect(catmullRom([])).toBe('');expect(catmullRom([[0,0],[10,10]])).toBe('M0 0 L10 10');const d=catmullRom([[0,0],[10,10],[20,0],[30,10]]);expect(d.startsWith('M0 0 C')).toBe(true);expect(d.match(/C/g)).toHaveLength(3);});
 for(const [open,max,shown,hidden] of [[0,6,0,0],[1,6,1,0],[6,6,6,0],[7,6,6,1],[30,6,6,24]] as const)it(`folds ${open} open steps into ${shown} shown + ${hidden}`,()=>{const f=foldSteps(Array.from({length:open},(_,i)=>i),max);expect(f.shown).toHaveLength(shown);expect(f.hidden).toBe(hidden);});
 it('shows the whole trail when expanded',()=>{expect(foldSteps(Array.from({length:30},(_,i)=>i),6,true).hidden).toBe(0);});
 it('puts the next stone lowest and climbs upward',()=>{const t=trailLayout({count:6,gutter:200,gap:60,top:100,bottom:110});expect(t.stones).toHaveLength(6);for(let i=1;i<6;i++)expect(t.stones[i][1]).toBe(t.stones[i-1][1]-60);expect(t.height).toBe(100+5*60+110);expect(t.path[0]).toEqual(t.head);expect(t.path.at(-1)).toEqual(t.topPoint);for(const [x] of t.stones){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(200);}});
 it('handles an empty trail',()=>{const t=trailLayout({count:0,gutter:96,gap:54,top:70,bottom:70});expect(t.stones).toHaveLength(0);expect(t.height).toBe(140);});
});

describe('Horizon geometry: the map',()=>{
 it('tapers a branch from thick to thin',()=>{const o=taperedOutline([0,0],[30,0],[60,0],[100,0],20,2,10);expect(o).toHaveLength(22);expect(Math.abs(o[0][1]-o[21][1])).toBeCloseTo(20,0);expect(Math.abs(o[10][1]-o[11][1])).toBeCloseTo(2,0);});
 it('uses two sides on wide screens, goal 1 at the top right, and keeps branches still when focus moves',()=>{
  const a=mapLayout({n:9,focus:0,twigs:7,width:1200,oneIndex:5}),b=mapLayout({n:9,focus:5,twigs:3,width:1200,oneIndex:5});
  expect(a.mode).toBe('both');expect(a.branches.filter(x=>x.side===1)).toHaveLength(5);expect(a.branches[0].tip[1]).toBeLessThan(a.branches[1].tip[1]);
  expect(a.branches.map(x=>x.tip)).toEqual(b.branches.map(x=>x.tip));expect(a.twigs).toHaveLength(7);expect(b.twigs).toHaveLength(3);
  for(const t of a.twigs){expect(t.tip[1]).toBeGreaterThanOrEqual(0);expect(t.tip[1]).toBeLessThanOrEqual(a.height);}
  for(const br of a.branches){expect(br.tip[0]).toBeGreaterThan(0);expect(br.tip[0]).toBeLessThan(1200);}
 });
 it('falls back to a trunk layout on a phone and grows with the twigs',()=>{const m=mapLayout({n:10,focus:2,twigs:7,width:358,oneIndex:0});expect(m.mode).toBe('stack');expect(m.twigs).toHaveLength(7);for(const t of m.twigs)expect(t.label.x+t.label.width).toBeLessThanOrEqual(358);expect(m.height).toBeGreaterThan(mapLayout({n:10,focus:2,twigs:0,width:358,oneIndex:0}).height);});
 it('handles no goals',()=>{const m=mapLayout({n:0,focus:0,twigs:0,width:1000,oneIndex:-1});expect(m.branches).toHaveLength(0);});
});
