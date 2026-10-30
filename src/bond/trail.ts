// Geometry for Bond's trail: where stones, flags and Bond sit, for the strip and for the whole winding trail.
// Pure numbers, so the drawing code only has to place things.
import type {Journey} from './journey';
import {milestoneAfter} from './journey';

export interface Stone{x:number;y:number;done:boolean;start?:boolean}
export interface Pt{x:number;y:number}

// The strip: one stretch of trail, from the last milestone to the next flag.
export function stripLayout(j:Journey,w:number,h:number){
 const base=h-22,x0=56,x1=Math.max(x0+80,w-(w<480?104:126));
 const y=(x:number)=>base-4*Math.sin(x/Math.max(w,1)*Math.PI*2.2);
 const steps=Math.max(1,j.next-j.prev),stride=Math.ceil(steps/18);
 const xAt=(i:number)=>x0+i/steps*(x1-x0);
 const stones:Stone[]=[];
 for(let i=0;i<steps;i+=stride)stones.push({x:xAt(i),y:y(xAt(i)),done:j.prev+i<=j.total,start:i===0});
 const path:Pt[]=[];for(let x=10;x<=x1+18;x+=18)path.push({x,y:y(x)});
 const bondAt=(count:number)=>{const x=xAt(Math.max(0,Math.min(steps,count-j.prev)));return {x,y:y(x)};};
 // On a milestone day Bond stands just short of the flag, so the flag and its words stay in view.
 const bond=j.milestoneToday?{x:x1-54,y:y(x1-54)}:bondAt(j.total);
 return {base,x0,x1,y,stones,path,flag:{x:x1,y:y(x1)},bond,bondAt};
}

// The whole trail: every milestone so far plus the next two, laid out as a path that winds down the sheet.
export function trailMilestones(j:Journey){
 const out=[0];let m=0;
 while(m<j.next){m=milestoneAfter(m);out.push(m);}
 out.push(milestoneAfter(m));
 return out;
}

const MIN_GAP=30;
export function fullLayout(j:Journey,w:number){
 const ms=trailMilestones(j),segs=ms.length-1;
 const per=w>=980?4:w>=620?3:2,rows=Math.ceil(segs/per),gap=w<620?150:140,top=64,pad=w<620?52:74;
 const span=w-2*pad;
 // u runs 0..segs in milestone units; each row holds `per` stretches and the next row runs back the other way.
 const rowPt=(r:number,local:number):Pt=>({x:r%2===0?pad+local*span:w-pad-local*span,y:top+r*gap});
 const at=(u:number):Pt=>{const r=Math.min(rows-1,Math.floor(u/per));return rowPt(r,(u-r*per)/per);};
 const path:Pt[]=[];
 for(let r=0;r<rows;r++){
  const from=r*per,to=Math.min(segs,(r+1)*per),n=Math.max(2,Math.round((to-from)*span/per/22));
  for(let i=0;i<=n;i++)path.push(rowPt(r,(to-from)*i/n/per));
  // A U-turn bulging out past the edge into the next row.
  if(r<rows-1){const edge=r%2===0?w-pad:pad,dir=r%2===0?1:-1,cy=top+r*gap+gap/2,R=gap/2;
   for(let k=1;k<12;k++){const a=-Math.PI/2+k/12*Math.PI;path.push({x:edge+dir*Math.cos(a)*R*.55,y:cy+Math.sin(a)*R});}}
 }
 // Stones keep at least MIN_GAP px apart (a stone is 13px across), so a short stretch on a phone gets fewer stones
 // rather than a row of stones touching.
 const stones:Stone[]=[],segPx=span/per,room=Math.max(1,Math.floor(segPx/MIN_GAP));
 for(let s=0;s<segs;s++){const len=ms[s+1]-ms[s],n=Math.min(len-1,room-1,9);
  // A stone per day when they fit; otherwise n stones spread evenly, each lit once the days reach it.
  for(let k=1;k<=n;k++){const f=k/(n+1),p=at(s+f);stones.push({...p,done:ms[s]+Math.round(f*len)<=j.total});}}
 const flags=ms.map((n,k)=>({n,k,...at(k),state:(n===0?'start':n<=j.total?'earned':n===j.next?'next':'later') as 'start'|'earned'|'next'|'later'}));
 // Bond stands where today's count falls between two flags.
 let s=0;while(s<segs-1&&ms[s+1]<=j.total&&!(ms[s+1]===j.total&&j.milestoneToday))s++;
 if(j.milestoneToday)s=ms.indexOf(j.total)-1;
 const frac=Math.min(1,(j.total-ms[s])/(ms[s+1]-ms[s]));
 const u=s+frac,face=Math.min(rows-1,Math.floor(u/per))%2===0?1:-1;
 return {ms,path,stones,flags,bond:at(u),face,height:top+(rows-1)*gap+86};
}
