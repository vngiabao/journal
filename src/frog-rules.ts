// The rules behind the frog habit, kept free of UI so they are easy to test.
import type {State,Todo,Priority} from './model';
import {addDays} from './dates';

export const PRIORITIES:Priority[]=['A','B','C','D','E'];
export const PRIORITY_NAME:Record<Priority,string>={A:'Must do. Serious consequences if not.',B:'Should do. Mild consequences.',C:'Nice to do. No consequences.',D:'Delegate it to someone else.',E:'Eliminate it.'};
// Undone tasks sort A, B, C, unlabelled, then the handed-off and the let-go.
export const priorityRank=(t:Todo)=>t.done?9:t.priority?{A:0,B:1,C:2,D:4,E:5}[t.priority]:3;

export const frogOf=(state:State,date:string)=>(state.todos??[]).find(t=>t.date===date&&t.frog);
export function frogStats(todos:Todo[],now:string){
 const eaten=todos.filter(t=>t.frog&&t.done&&t.date<=now),days=new Set(eaten.map(t=>t.date));
 let streak=0,d=days.has(now)?now:addDays(now,-1);while(days.has(d)){streak++;d=addDays(d,-1);}
 return {eaten:eaten.length,streak,early:eaten.filter(t=>t.doneAt&&new Date(t.doneAt).getHours()<12).length};
}
