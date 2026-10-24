// The life map's data: areas of life, present-tense visions at 5 years, 10 years and 40, and which area each goal
// belongs to. Pure functions on State, so the wheel and the phone ladder share one source of truth.
import type {State,LifeArea,Vision,VisionWhen,PlanGoal} from '../model';
import {uid} from '../model';

export const DEFAULT_AREAS:LifeArea[]=[
 {id:'career',name:'Career'},{id:'education',name:'Education'},{id:'health',name:'Health'},{id:'relationship',name:'Relationship'},
 {id:'connection',name:'Connection'},{id:'ownership',name:'Ownership'},{id:'mind',name:'Mind'},
];
// What each default area means, shown under its name the first time.
export const AREA_HINTS:Record<string,string>={connection:'Family and friends',ownership:'Money and the things you own'};
export const AREA_MIN=5,AREA_MAX=8;
// Far to near, the order the ladder reads in.
export const WHENS:VisionWhen[]=['40','10y','5y'];
export const WHEN_LABEL:Record<VisionWhen,string>={'40':'At 40','10y':'In 10 years','5y':'In 5 years'};
export const WHEN_SHORT:Record<VisionWhen|'year',string>={year:'This year','5y':'5 years','10y':'10 years','40':'At 40'};

const plan=(s:State)=>s.plan??={goals:[]};
// Areas are seeded lazily: reading never writes, the first edit stores the defaults.
export const lifeAreas=(s:State):LifeArea[]=>s.plan?.areas??DEFAULT_AREAS;
export function ensureAreas(s:State){const p=plan(s);return p.areas??=DEFAULT_AREAS.map(a=>({...a}));}
export const lifeVisions=(s:State):Vision[]=>s.plan?.visions??[];
export const visionsAt=(s:State,area:string,when:VisionWhen)=>lifeVisions(s).filter(v=>v.area===area&&v.when===when);
export const areaOf=(s:State,g:PlanGoal)=>g.area&&lifeAreas(s).some(a=>a.id===g.area)?g.area:undefined;
export const goalsIn=(s:State,area:string)=>(s.plan?.goals??[]).filter(g=>areaOf(s,g)===area);
export const unassignedGoals=(s:State)=>(s.plan?.goals??[]).filter(g=>!areaOf(s,g));

export function addArea(s:State,name:string){const areas=ensureAreas(s),n=name.trim();if(!n||areas.length>=AREA_MAX)return undefined;const a={id:uid(),name:n};areas.push(a);return a;}
export function renameArea(s:State,id:string,name:string){const a=ensureAreas(s).find(x=>x.id===id),n=name.trim();if(a&&n)a.name=n;}
// Removing an area takes its visions with it and leaves its goals without an area. Undo puts all of it back.
export function removeArea(s:State,id:string){const areas=ensureAreas(s);if(areas.length<=AREA_MIN)return undefined;const index=areas.findIndex(a=>a.id===id);if(index<0)return undefined;
 const [area]=areas.splice(index,1),p=plan(s),visions=(p.visions??[]).filter(v=>v.area===id),goalIds=p.goals.filter(g=>g.area===id).map(g=>g.id);
 p.visions=(p.visions??[]).filter(v=>v.area!==id);for(const g of p.goals)if(g.area===id)delete g.area;
 return {area,index,visions,goalIds};}
export function restoreArea(s:State,r:{area:LifeArea;index:number;visions:Vision[];goalIds:string[]}){const areas=ensureAreas(s),p=plan(s);if(areas.some(a=>a.id===r.area.id))return;
 areas.splice(Math.min(r.index,areas.length),0,r.area);(p.visions??=[]).push(...r.visions.filter(v=>!p.visions!.some(x=>x.id===v.id)));
 for(const g of p.goals)if(r.goalIds.includes(g.id)&&!g.area)g.area=r.area.id;}

export function addVision(s:State,area:string,when:VisionWhen,text:string){const t=text.trim();if(!t)return undefined;ensureAreas(s);const v:Vision={id:uid(),area,when,text:t};(plan(s).visions??=[]).push(v);return v;}
export function editVision(s:State,id:string,patch:{text?:string;when?:VisionWhen}){const v=(s.plan?.visions??[]).find(x=>x.id===id);if(!v)return;if(patch.text!==undefined&&patch.text.trim())v.text=patch.text.trim();if(patch.when)v.when=patch.when;}
export function removeVision(s:State,id:string){const list=s.plan?.visions;if(!list)return undefined;const index=list.findIndex(v=>v.id===id);if(index<0)return undefined;const [vision]=list.splice(index,1);return {vision,index};}
export function restoreVision(s:State,vision:Vision,index:number){const list=plan(s).visions??=[];if(list.some(v=>v.id===vision.id))return;list.splice(Math.min(index,list.length),0,vision);}

export function setGoalArea(s:State,goalId:string,area?:string){const g=(s.plan?.goals??[]).find(x=>x.id===goalId);if(!g)return;ensureAreas(s);if(area)g.area=area;else delete g.area;}
// The furthest vision written for an area (at 40, else 10 years, else 5), for one-line summaries.
export function furthestVision(s:State,area:string){for(const w of WHENS){const v=visionsAt(s,area,w)[0];if(v)return v;}return undefined;}
