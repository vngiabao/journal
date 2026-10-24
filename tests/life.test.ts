import {describe,it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {seed} from '../src/seed';
import {validateImport} from '../src/storage';
import type {State} from '../src/model';
import {addGoal} from '../src/plan';
import {lifeAreas,ensureAreas,addVision,editVision,removeVision,restoreVision,visionsAt,addArea,renameArea,removeArea,restoreArea,setGoalArea,goalsIn,unassignedGoals,DEFAULT_AREAS,AREA_MAX,AREA_MIN} from '../src/horizon/life';
import {lifeLayout,areaAngle,nodeSide,placeNodes,LIFE_RING_F,type Box} from '../src/horizon/geometry';

const fresh=()=>{const s=seed('2026-05-04');s.todos=[];return s;};
const overlap=(a:Box,b:Box)=>a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t;

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
 it('places goals in their area; a goal whose area is gone waits in the tray',()=>{
  const s=fresh();const a=addGoal(s,'I work as a PM'),b=addGoal(s,'I read 20 books');setGoalArea(s,a.id,'career');
  expect(goalsIn(s,'career').map(g=>g.id)).toEqual([a.id]);expect(unassignedGoals(s).map(g=>g.id)).toEqual([b.id]);
  b.area='gone';expect(unassignedGoals(s)).toHaveLength(1);setGoalArea(s,a.id,undefined);expect(unassignedGoals(s)).toHaveLength(2);
 });
 it('new optional fields pass import validation and bad ones are refused',()=>{
  const s=fresh();const g=addGoal(s,'I weigh 75 kg');setGoalArea(s,g.id,'health');addVision(s,'health','40','I am strong at 40');
  expect(()=>validateImport(structuredClone(s))).not.toThrow();
  const bad=structuredClone(s) as State;bad.plan!.visions![0].when='20y' as never;expect(()=>validateImport(bad)).toThrow();
  const bad2=structuredClone(s) as State;(bad2.plan!.areas as unknown[])[0]={id:1};expect(()=>validateImport(bad2)).toThrow();
  const bad3=structuredClone(s) as State;(bad3.plan!.goals[0] as {area?:unknown}).area=5;expect(()=>validateImport(bad3)).toThrow();
 });
});

describe('Life map geometry',()=>{
 it('leaves the bottom of the wheel free for the ring names at any area count',()=>{
  for(const n of [5,6,7,8]){const near=Array.from({length:n},(_,i)=>{const a=areaAngle(i,n);return Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)));});expect(Math.min(...near)).toBeGreaterThan(.3);}
  expect(areaAngle(0,7)).toBeCloseTo(-Math.PI/2);
 });
 for(const [w,h] of [[1050,560],[1180,780],[1540,1100],[2000,1200]] as const)it(`fits the wheel inside ${w}x${h} and uses the width`,()=>{
  const g=lifeLayout({areas:7,width:w,height:h});
  expect(g.cx-g.rx).toBeGreaterThanOrEqual(0);expect(g.cx+g.rx).toBeLessThanOrEqual(w);expect(g.cy-g.ry).toBeGreaterThan(0);expect(g.cy+g.ry).toBeLessThanOrEqual(h);
  expect(g.rx).toBeGreaterThanOrEqual(g.ry*.9);expect(g.branches).toHaveLength(7);
  for(const b of g.branches){expect(b.cross).toHaveLength(4);
   // Each crossing sits on its ring (within a pixel or two) and they run outward in order.
   b.cross.forEach((p,k)=>{const r=Math.hypot((p[0]-g.cx)/g.rx,(p[1]-g.cy)/g.ry);expect(Math.abs(r-LIFE_RING_F[k])).toBeLessThan(.02);});}
  expect(g.centre.w/2).toBeLessThan(g.rings[0].rx);expect(g.centre.h/2).toBeLessThan(g.rings[0].ry);
 });
 it('reads labels outward: right side to the right, left side to the left, top and bottom stacked',()=>{
  expect(nodeSide(1,0,false)).toBe('right');expect(nodeSide(-1,0,true)).toBe('left');expect(nodeSide(0,-1,true)).toBe('up');expect(nodeSide(0,1,true)).toBe('down');expect(nodeSide(0,-1,false)).toBe('right');
 });
 it('places labels without overlaps, folding to the smaller variant when crowded',()=>{
  const g=lifeLayout({areas:8,width:1180,height:780});
  const nodes=g.branches.flatMap((b,i)=>b.cross.map((p,r)=>({key:`${i}-${r}`,anchor:p,side:nodeSide(b.cos,b.sin,r===3),variants:[{w:200,h:70},{w:110,h:30}]})));
  const out=placeNodes(nodes,{width:g.width,height:g.height});
  expect(out).toHaveLength(32);
  const clean=out.filter(o=>!o.overlap);
  for(let i=0;i<clean.length;i++){const a=clean[i].box;expect(a.l).toBeGreaterThanOrEqual(0);expect(a.r).toBeLessThanOrEqual(g.width+.5);for(let j=i+1;j<clean.length;j++)expect(overlap(a,clean[j].box)).toBe(false);}
  expect(out.some(o=>o.variant===1)).toBe(true);expect(clean.length).toBeGreaterThan(18);
 });
 it('keeps away from obstacles such as the centre',()=>{const o=placeNodes([{key:'a',anchor:[100,100],side:'right',variants:[{w:80,h:20}]}],{width:400,height:400,obstacles:[{l:110,r:200,t:80,b:120}]});expect(overlap(o[0].box,{l:110,r:200,t:80,b:120})).toBe(false);});
});
