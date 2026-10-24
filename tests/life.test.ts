import {describe,it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {seed} from '../src/seed';
import {validateImport} from '../src/storage';
import type {State} from '../src/model';
import {addGoal} from '../src/plan';
import {lifeAreas,ensureAreas,addVision,editVision,removeVision,restoreVision,visionsAt,addArea,renameArea,removeArea,restoreArea,setGoalArea,goalsIn,unassignedGoals,furthestVision,lifeHorizons,visionHorizons,addHorizon,renameHorizon,removeHorizon,restoreHorizon,horizonRank,horizonTitle,horizonPhrase,DEFAULT_AREAS,AREA_MAX,AREA_MIN} from '../src/horizon/life';
import {mindLayout,mindSizes,mindSplit,spinePath,branchPoints,taperedPoly,cloudPoints,bezLength,type MindAreaIn} from '../src/horizon/geometry';

const fresh=()=>{const s=seed('2026-05-04');s.todos=[];return s;};

describe('Life map data',()=>{
 it('reads the default areas without writing, and seeds them on the first edit',()=>{
  const s=fresh();expect(lifeAreas(s).map(a=>a.name)).toEqual(['Career','Education','Health','Relationship','Connection','Ownership','Mind']);expect(s.plan?.areas).toBeUndefined();
  addVision(s,'health','40','I run a marathon at 40');expect(s.plan!.areas).toHaveLength(7);expect(s.plan!.areas).not.toBe(DEFAULT_AREAS);
 });
 it('adds, edits, removes and restores visions in place, several per ring',()=>{
  const s=fresh();const a=addVision(s,'ownership','40','I own my home')!;addVision(s,'ownership','40','I own a small rental');addVision(s,'ownership','5y','I have six months saved');
  expect(addVision(s,'ownership','5y','   ')).toBeUndefined();
  expect(visionsAt(s,'ownership','40')).toHaveLength(2);
  editVision(s,a.id,{text:'I own a home with a garden',when:'10y'});expect(visionsAt(s,'ownership','10y')[0].text).toBe('I own a home with a garden');
  const r=removeVision(s,a.id)!;expect(visionsAt(s,'ownership','10y')).toHaveLength(0);restoreVision(s,r.vision,r.index);expect(s.plan!.visions![r.index].id).toBe(a.id);
 });
 it('keeps five to eight areas; removing one takes its visions and frees its goals, and undo puts them back',()=>{
  const s=fresh();ensureAreas(s);expect(addArea(s,'Faith')).toBeTruthy();expect(addArea(s,'Play')).toBeUndefined();expect(s.plan!.areas).toHaveLength(AREA_MAX);
  renameArea(s,'mind','Mind and spirit');expect(lifeAreas(s).find(a=>a.id==='mind')!.name).toBe('Mind and spirit');renameArea(s,'mind','  ');expect(lifeAreas(s).find(a=>a.id==='mind')!.name).toBe('Mind and spirit');
  const g=addGoal(s,'I weigh 75 kg');setGoalArea(s,g.id,'health');addVision(s,'health','5y','I run every week');
  const r=removeArea(s,'health')!;expect(g.area).toBeUndefined();expect(visionsAt(s,'health','5y')).toHaveLength(0);expect(unassignedGoals(s)).toHaveLength(1);
  restoreArea(s,r);expect(lifeAreas(s)[r.index].id).toBe('health');expect(g.area).toBe('health');expect(visionsAt(s,'health','5y')).toHaveLength(1);
  while(lifeAreas(s).length>AREA_MIN)removeArea(s,lifeAreas(s)[0].id);expect(removeArea(s,lifeAreas(s)[0].id)).toBeUndefined();
 });
 it('summarises an area by its furthest vision',()=>{const s=fresh();expect(furthestVision(s,'mind')).toBeUndefined();addVision(s,'mind','5y','I read daily');expect(furthestVision(s,'mind')!.when).toBe('5y');addVision(s,'mind','10y','I meditate');expect(furthestVision(s,'mind')!.when).toBe('10y');addVision(s,'mind','40','I am calm');expect(furthestVision(s,'mind')!.text).toBe('I am calm');});
 it('keeps horizons in time order, with custom ones of your own',()=>{
  const s=fresh();expect(lifeHorizons(s).map(h=>h.label)).toEqual(['This year','5 years','10 years','At 40']);
  addHorizon(s,'At 50');addHorizon(s,'15 years');addHorizon(s,'Someday');addHorizon(s,'At 35');
  expect(lifeHorizons(s).map(h=>h.label)).toEqual(['This year','5 years','10 years','15 years','At 35','At 40','At 50','Someday']);
  expect(addHorizon(s,'15 YEARS')).toBeUndefined();expect(addHorizon(s,'  ')).toBeUndefined();
  expect(visionHorizons(s)[0].label).toBe('Someday');expect(visionHorizons(s).some(h=>h.id==='year')).toBe(false);
  expect(horizonRank('in 20 years')).toBe(20);expect(horizonTitle(lifeHorizons(s)[3])).toBe('In 15 years');expect(horizonPhrase(lifeHorizons(s)[5])).toBe('at 40');expect(horizonPhrase(lifeHorizons(s)[0])).toBe('this year');
 });
 it('renames and removes custom horizons with their visions, undo puts them back; defaults stay',()=>{
  const s=fresh();const h=addHorizon(s,'15 years')!;addVision(s,'career',h.id,'I sold the company');renameHorizon(s,h.id,'20 years');expect(lifeHorizons(s).find(x=>x.id===h.id)!.label).toBe('20 years');
  expect(removeHorizon(s,'40')).toBeUndefined();const r=removeHorizon(s,h.id)!;expect(visionsAt(s,'career',h.id)).toHaveLength(0);expect(lifeHorizons(s)).toHaveLength(4);
  restoreHorizon(s,r);expect(visionsAt(s,'career',h.id)).toHaveLength(1);expect(lifeHorizons(s)).toHaveLength(5);
  expect(()=>validateImport(structuredClone(s))).not.toThrow();
  const bad=structuredClone(s) as State;bad.plan!.horizons![0].label='';expect(()=>validateImport(bad)).toThrow();
 });
 it('places goals in their area; a goal whose area is gone waits in the tray',()=>{
  const s=fresh();const a=addGoal(s,'I work as a PM'),b=addGoal(s,'I read 20 books');setGoalArea(s,a.id,'career');
  expect(goalsIn(s,'career').map(g=>g.id)).toEqual([a.id]);expect(unassignedGoals(s).map(g=>g.id)).toEqual([b.id]);
  b.area='gone';expect(unassignedGoals(s)).toHaveLength(1);setGoalArea(s,a.id,undefined);expect(unassignedGoals(s)).toHaveLength(2);
 });
 it('new optional fields pass import validation and bad ones are refused',()=>{
  const s=fresh();const g=addGoal(s,'I weigh 75 kg');setGoalArea(s,g.id,'health');addVision(s,'health','40','I am strong at 40');
  expect(()=>validateImport(structuredClone(s))).not.toThrow();
  const bad=structuredClone(s) as State;bad.plan!.visions![0].when='';expect(()=>validateImport(bad)).toThrow();
  const bad2=structuredClone(s) as State;(bad2.plan!.areas as unknown[])[0]={id:1};expect(()=>validateImport(bad2)).toThrow();
  const bad3=structuredClone(s) as State;(bad3.plan!.goals[0] as {area?:unknown}).area=5;expect(()=>validateImport(bad3)).toThrow();
 });
});

describe('Life map geometry: the mind map',()=>{
 const area=(n:number,h=40):MindAreaIn=>({rows:Array.from({length:n},(_,k)=>({h,base:h-12,w:120,horizon:Math.min(3,k)})),minH:44});
 it('goes two-sided on a wide map and one-sided on a narrow one',()=>{
  expect(mindSizes({width:1114,height:740}).mode).toBe('both');expect(mindSizes({width:654,height:552}).mode).toBe('right');
  expect(mindSizes({width:1114,height:740}).room).toBeGreaterThanOrEqual(170);expect(mindSizes({width:654,height:552}).room).toBeGreaterThanOrEqual(170);
 });
 it('puts the first half down the right and brings the rest back up the left, clockwise',()=>{
  const L=mindLayout(Array.from({length:7},()=>area(2)),{width:1200,height:800});
  expect(L.branches.filter(b=>b.side===1)).toHaveLength(4);
  for(let i=1;i<4;i++)expect(L.branches[i].tip[1]).toBeGreaterThan(L.branches[i-1].tip[1]);
  for(let i=5;i<7;i++)expect(L.branches[i].tip[1]).toBeLessThan(L.branches[i-1].tip[1]);
  for(const b of L.branches){expect(Math.sign(b.tip[0]-L.cloud.cx)).toBe(b.side);expect(Math.abs(b.p0[0]-L.cloud.cx)).toBeLessThanOrEqual(L.cloud.w/2);}
 });
 it('stacks each area without overlaps and keeps every twig line on the page',()=>{
  for(const [w,h] of [[654,552],[1114,740],[1392,1040]] as const){const L=mindLayout([area(3),area(5,62),area(1),area(0),area(4),area(2),area(6)],{width:w,height:h});
   for(const side of [1,-1]){const bs=L.branches.filter(b=>b.side===side).sort((a,b)=>a.top-b.top);for(let i=1;i<bs.length;i++)expect(bs[i].top).toBeGreaterThanOrEqual(bs[i-1].bottom);}
   for(const b of L.branches)for(const t of b.twigs){const end=t.x+b.side*t.len;expect(Math.min(t.x,end)).toBeGreaterThanOrEqual(0);expect(Math.max(t.x,end)).toBeLessThanOrEqual(L.width+.5);expect(t.y).toBeLessThanOrEqual(L.height);}}
 });
 it('splits the sides by how much is written, keeping the clockwise order',()=>{expect(mindSplit([1,1,1,1,1,1,1])).toBe(4);expect(mindSplit([300,40,40,40,40,40,40])).toBe(1);expect(mindSplit([40,40,40,40,40,40,300])).toBe(6);
  const L=mindLayout([area(6,60),area(1),area(1),area(1),area(1),area(1)],{width:1200,height:600});expect(L.branches.filter(b=>b.side===1)).toHaveLength(1);});
 it('runs time outward: later horizons end further from the branch',()=>{
  const L=mindLayout([area(4)],{width:1200,height:600});const xs=L.branches[0].twigs.map(t=>t.x);for(let i=1;i<4;i++)expect(xs[i]).toBeGreaterThan(xs[i-1]);
 });
 it('grows taller than the window rather than squeezing',()=>{const L=mindLayout(Array.from({length:8},()=>area(6,60)),{width:1200,height:500});expect(L.height).toBeGreaterThan(500);});
 it('starts every root inside the cloud, spread around its rim, and runs level where the name is written',()=>{
  const L=mindLayout(Array.from({length:7},(_,i)=>({...area(1),nameW:60+i*10})),{width:1200,height:700});
  expect(new Set(L.branches.map(b=>`${Math.round(b.p0[0])},${Math.round(b.p0[1])}`)).size).toBe(7);for(const side of [1,-1]){const ys=L.branches.filter(b=>b.side===side).map(b=>Math.round(b.p0[1]));expect(new Set(ys).size).toBe(ys.length);}
  for(const b of L.branches){expect(Math.hypot((b.p0[0]-L.cloud.cx)/(L.cloud.w/2),(b.p0[1]-L.cloud.cy)/(L.cloud.h/2))).toBeLessThan(.95);
   expect(b.knee[1]).toBeCloseTo(b.tip[1],5);expect(Math.abs(b.tip[0]-b.knee[0])).toBeGreaterThan(b.name.w);expect(spinePath(b).startsWith('M')).toBe(true);
   const roots=b.twigs.map(t=>t.p0[0]);for(let k=1;k<roots.length;k++)expect(b.side*(roots[k]-roots[k-1])).toBeGreaterThan(0);}
 });
 it('lets twigs leave one after another, never from a single point',()=>{const L=mindLayout([area(4)],{width:1200,height:600}),r=L.branches[0].twigs.map(t=>t.p0[0]);expect(new Set(r).size).toBe(4);});
 it('tapers a branch outline from thick to thin',()=>{const pts=branchPoints({p0:[0,0],c1:[20,0],c2:[40,0],knee:[60,0],tip:[160,0]}),o=taperedPoly(pts,20,4),n=pts.length;
  expect(o).toHaveLength(2*n);expect(Math.abs(o[0][1]-o[2*n-1][1])).toBeCloseTo(20,0);expect(Math.abs(o[n-1][1]-o[n][1])).toBeLessThan(6);});
 it('draws a closed, soft cloud',()=>{const p=cloudPoints(100,100,200,100);expect(Math.hypot(p[0][0]-p[90][0],p[0][1]-p[90][1])).toBeLessThan(1);for(const [x,y] of p){expect(Math.abs(x-100)).toBeLessThanOrEqual(100.5);expect(Math.abs(y-100)).toBeLessThanOrEqual(50.5);}});
 it('measures a branch',()=>{expect(bezLength([0,0],[10,0],[20,0],[30,0])).toBeCloseTo(30,0);});
});
