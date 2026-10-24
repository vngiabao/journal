// Horizon geometry: pure functions only, so every shape on the page can be unit-tested without a browser.
// Coordinates are CSS pixels inside each SVG. Nothing here reads the DOM.
export type Pt=[number,number];

// ---------------------------------------------------------------------------------------------- ridge
// Peaks stand in equal slots across the band. One extra slot holds the dashed "Add a goal" peak until there are ten.
export const peakSlots=(n:number,canAdd=true)=>Math.max(1,n+(canAdd&&n<10?1:0));
export interface Band{height:number;base:number;one:number;high:number;low:number}
// Desktop leaves headroom above the summits for two-line labels; the phone band shows numbered pennants only.
export const BAND_DESKTOP:Band={height:224,base:206,one:100,high:132,low:154};
// Short windows (1366x768): a lower band so the next stone and its action stay above the fold.
export const BAND_SHORT:Band={height:198,base:182,one:82,high:108,low:128};
export const BAND_PHONE:Band={height:132,base:118,one:40,high:66,low:84};
export interface Peak{index:number;x:number;summit:number;base:number;left:number;right:number;one:boolean;hill:Pt[]}
export interface Ridge{peaks:Peak[];add:{x:number;summit:number;hill:Pt[]}|null;line:Pt[];slot:number}

// Heights encode nothing but "the one": it is the tallest, the others alternate so their labels have room.
export function summitOf(i:number,oneIndex:number,band:Band){if(i===oneIndex)return band.one;let k=i;if(oneIndex>=0&&i>oneIndex)k=i-1;return k%2===0?band.high:band.low;}

export function ridgeLayout(n:number,width:number,oneIndex:number,band:Band,canAdd=true):Ridge{
 const slots=peakSlots(n,canAdd),slot=width/slots,b=band.base;
 const valley=(i:number)=>b-8-((i*37)%3)*3; // a little irregular, like a hand-drawn skyline
 const peaks:Peak[]=[],line:Pt[]=[[0,b-4]];
 const hillAt=(x:number,summit:number,vl:number,vr:number,left:number,right:number):Pt[]=>{
  const dl=vl-summit,dr=vr-summit;
  return [[left,vl],[x-slot*.23,summit+dl*.44],[x-slot*.06,summit+dl*.06],[x,summit],[x+slot*.07,summit+dr*.08],[x+slot*.21,summit+dr*.47],[right,vr]];
 };
 for(let i=0;i<n;i++){
  const x=(i+.5)*slot,summit=summitOf(i,oneIndex,band),left=i===0?0:i*slot,right=(i+1)*slot,vl=i===0?b-4:valley(i),vr=valley(i+1);
  const hill=hillAt(x,summit,vl,vr,left,right);
  peaks.push({index:i,x,summit,base:b,left,right,one:i===oneIndex,hill});
  line.push(...hill.slice(1));
 }
 let add:Ridge['add']=null;
 if(canAdd&&n<10){const x=(n+.5)*slot,summit=band.low+(band.base-band.low)*.25,vl=n===0?b-4:valley(n);add={x,summit,hill:hillAt(x,summit,vl,b-4,n*slot,width)};}
 line.push([width,b-4]);
 return {peaks,add,line,slot};
}
// The filled hill under a ridge segment, closed down to the base line.
export const hillPolygon=(hill:Pt[],base:number):Pt[]=>[...hill,[hill[hill.length-1][0],base],[hill[0][0],base]];
// Progress shading rises from the base: the top of the clip rectangle for `done` of `total`.
export function hatchTop(p:{summit:number;base:number},done:number,total:number){if(total<=0)return p.base;const f=Math.max(0,Math.min(1,done/total));return p.base-f*(p.base-p.summit);}

// ---------------------------------------------------------------------------------------------- labels
// Word-wraps text into at most `maxLines` lines no wider than `maxWidth`, with an ellipsis on the last one if it overflows.
export function wrapText(text:string,maxWidth:number,measure:(t:string)=>number,maxLines=2){
 const words=text.trim().split(/\s+/).filter(Boolean),lines:string[]=[];let line='';
 for(let w=0;w<words.length;w++){const tryLine=line?`${line} ${words[w]}`:words[w];
  if(measure(tryLine)<=maxWidth||!line){line=tryLine;continue;}
  lines.push(line);line=words[w];
  if(lines.length===maxLines){line='';const rest=words.slice(w).join(' ');lines[maxLines-1]=ellipsize(`${lines[maxLines-1]} ${rest}`,maxWidth,measure);return {lines,truncated:true};}
 }
 if(line)lines.push(line);
 let truncated=false;
 for(let i=0;i<lines.length;i++)if(measure(lines[i])>maxWidth){lines[i]=ellipsize(lines[i],maxWidth,measure);truncated=true;}
 return {lines,truncated};
}
export function ellipsize(t:string,maxWidth:number,measure:(t:string)=>number){if(measure(t)<=maxWidth)return t;let s=t;while(s.length>1&&measure(`${s.trimEnd()}…`)>maxWidth)s=s.slice(0,-1);return `${s.trimEnd()}…`;}

export interface LabelIn{x:number;bottom:number;text:string;priority:number}
export interface LabelOut{left:number;top:number;width:number;lines:string[];truncated:boolean;row:number}
// Places labels above their summits. A label that overlaps one already placed moves up a row; if it still
// collides it is cut to one line; if even that collides, it narrows to the room it has. No two boxes overlap.
export type Box={l:number;r:number;t:number;b:number};
// `obstacles` are boxes labels must also avoid (pennants, seals).
export function layoutLabels(items:LabelIn[],o:{maxWidth:number;lineHeight:number;rowStep:number;gap:number;bandWidth:number;measure:(t:string)=>number;obstacles?:Box[]}):LabelOut[]{
 const out:LabelOut[]=new Array(items.length),placed:Box[]=[...(o.obstacles??[])];
 const order=items.map((_,i)=>i).sort((a,b)=>items[b].priority-items[a].priority||a-b);
 const box=(x:number,w:number,bottom:number,lines:number,row:number)=>{const left=Math.max(0,Math.min(o.bandWidth-w,x-w/2)),b=bottom-row*o.rowStep;return {l:left,r:left+w,t:b-lines*o.lineHeight,b};};
 const hits=(q:{l:number;r:number;t:number;b:number})=>placed.some(p=>q.l<p.r+o.gap&&q.r+o.gap>p.l&&q.t<p.b&&q.b>p.t);
 for(const i of order){const it=items[i];
  const two=wrapText(it.text,o.maxWidth,o.measure,2),w2=Math.ceil(Math.max(...two.lines.map(o.measure),1));
  const one=wrapText(it.text,o.maxWidth,o.measure,1),w1=Math.ceil(Math.max(...one.lines.map(o.measure),1));
  const three=wrapText(it.text,o.maxWidth*.78,o.measure,3),w3=Math.ceil(Math.max(...three.lines.map(o.measure),1));
  const tries:[typeof two,number,number][]=[[two,w2,0],[two,w2,1],...(two.lines.length>1&&!three.truncated?[[three,w3,0],[three,w3,1]] as [typeof two,number,number][]:[]),[one,w1,0],[one,w1,1]];
  let done=false;
  for(const [wr,w,row] of tries){const q=box(it.x,w,it.bottom,wr.lines.length,row);if(!hits(q)){placed.push(q);out[i]={left:q.l,top:q.t,width:w,lines:wr.lines,truncated:wr.truncated||wr===one&&two.lines.length>1,row};done=true;break;}}
  if(done)continue;
  // Last resort: one line, as wide as the free gap around its own x on row 0.
  const b0=it.bottom,t0=b0-o.lineHeight,row=placed.filter(p=>t0<p.b&&b0>p.t);
  const leftWall=Math.max(0,...row.filter(p=>p.r<=it.x).map(p=>p.r+o.gap)),rightWall=Math.min(o.bandWidth,...row.filter(p=>p.l>=it.x).map(p=>p.l-o.gap));
  const w=Math.max(12,Math.min(w1,rightWall-leftWall)),left=Math.max(leftWall,Math.min(rightWall-w,it.x-w/2));
  const text=ellipsize(it.text,w,o.measure);placed.push({l:left,r:left+w,t:t0,b:b0});out[i]={left,top:t0,width:w,lines:[text],truncated:true,row:0};
 }
 return out;
}

// ---------------------------------------------------------------------------------------------- trail
// A smooth path through points (Catmull-Rom, converted to cubic Béziers).
export function catmullRom(p:Pt[],tension=.5){
 if(!p.length)return '';const f=(n:number)=>Number(n.toFixed(1));
 if(p.length<3)return p.map((q,i)=>`${i?'L':'M'}${f(q[0])} ${f(q[1])}`).join(' ');
 let d=`M${f(p[0][0])} ${f(p[0][1])}`;const k=tension/3;
 for(let i=0;i<p.length-1;i++){const p0=p[i-1]??p[i],p1=p[i],p2=p[i+1],p3=p[i+2]??p2;
  d+=` C${f(p1[0]+(p2[0]-p0[0])*k)} ${f(p1[1]+(p2[1]-p0[1])*k)} ${f(p2[0]-(p3[0]-p1[0])*k)} ${f(p2[1]-(p3[1]-p1[1])*k)} ${f(p2[0])} ${f(p2[1])}`;}
 return d;
}
// Which open steps are drawn: the first `max` from the next one up; the rest fold into "N more up the trail".
export function foldSteps<T>(open:T[],max:number,expanded=false){const shown=expanded?open:open.slice(0,max);return {shown,hidden:open.length-shown.length};}
export interface TrailIn{count:number;gutter:number;gap:number;top:number;bottom:number;mid?:number}
export interface TrailOut{height:number;stones:Pt[];head:Pt;topPoint:Pt;path:Pt[]}
// Stones climb from your feet: index 0 (the next step) is lowest, later steps wind up toward the peak.
export function trailLayout({count,gutter,gap,top,bottom,mid:ratio=.52}:TrailIn):TrailOut{
 const n=Math.max(0,count),height=top+Math.max(0,n-1)*gap+bottom,amp=Math.min(gutter*.16,26),mid=gutter*ratio;
 const stones:Pt[]=Array.from({length:n},(_,i)=>[mid+amp*Math.sin(i*1.3+.9),height-bottom-i*gap]);
 const head:Pt=[mid-amp*.6,height-14],topPoint:Pt=[mid+amp*.35,0];
 const path:Pt[]=[head,...stones,topPoint];
 return {height,stones,head,topPoint,path};
}

// ---------------------------------------------------------------------------------------------- map
// Cubic Bézier helpers for the mind map's branches.
export const bez=(p0:Pt,c1:Pt,c2:Pt,p3:Pt,t:number):Pt=>{const u=1-t;return [u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p3[1]];};
// A branch drawn as a filled shape: thick at the root, thin at the tip (Buzan's organic branches).
export function taperedOutline(p0:Pt,c1:Pt,c2:Pt,p3:Pt,w0:number,w1:number,samples=18):Pt[]{
 const left:Pt[]=[],right:Pt[]=[];
 for(let i=0;i<=samples;i++){const t=i/samples,a=bez(p0,c1,c2,p3,Math.max(0,t-.01)),b=bez(p0,c1,c2,p3,Math.min(1,t+.01)),p=bez(p0,c1,c2,p3,t);
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,w=(w0+(w1-w0)*Math.pow(t,.8))/2;
  left.push([p[0]+nx*w,p[1]+ny*w]);right.push([p[0]-nx*w,p[1]-ny*w]);}
 return [...left,...right.reverse()];
}

// ---------------------------------------------------------------------------------------------- life map
// A hand-drawn Buzan mind map. "Me" sits in a soft cloud; each area of life is one thick, tapering branch curving
// out to the left or the right; at its end it splits into thin twigs, and every idea's words sit on their own
// short line. Time runs outward: a goal's twig ends nearest the branch, 5 years a little further, at 40 furthest.
export interface MindRowIn{h:number;base:number;w:number;horizon:number}
export interface MindAreaIn{rows:MindRowIn[];minH:number}
export interface MindTwig{p0:Pt;c1:Pt;c2:Pt;p3:Pt;x:number;y:number;len:number;top:number}
export interface MindBranch{index:number;side:1|-1;p0:Pt;c1:Pt;c2:Pt;tip:Pt;top:number;bottom:number;twigs:MindTwig[]}
export interface MindOpts{width:number;height:number;mode?:'both'|'right'|'auto';twig?:number;stagger?:number;gap?:number;pad?:number;cloudW?:number;branchLen?:number}
export interface MindLayout{mode:'both'|'right';width:number;height:number;cloud:{cx:number;cy:number;w:number;h:number};branchLen:number;room:number;branches:MindBranch[]}
const clampN=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
// Sizes that depend only on the width: two-sided when each side keeps at least 170px for words, else one-sided.
export function mindSizes(o:MindOpts){
 const W=Math.max(300,o.width),pad=o.pad??16,twig=o.twig??26,stagger=o.stagger??14;
 const cwB=clampN(W*.19,190,290),blB=clampN(W*.11,90,190),roomB=W/2-cwB/2-blB-twig-3*stagger-pad-10;
 const mode:'both'|'right'=o.mode&&o.mode!=='auto'?o.mode:roomB>=170?'both':'right';
 const cw=o.cloudW??(mode==='both'?cwB:clampN(W*.24,140,220)),bl=o.branchLen??(mode==='both'?blB:clampN(W*.1,56,110));
 const room=mode==='both'?W/2-cw/2-bl-twig-3*stagger-pad-10:W-2*pad-cw-bl-twig-3*stagger-10;
 return {W,pad,twig,stagger,mode,cw,ch:Math.round(cw*.56),bl,room:Math.max(80,Math.floor(Math.min(320,room)))};
}
// Two-sided: the first areas run down the right, the rest come back up the left (clockwise, like a clock face).
// Where to split is chosen by height, so both sides carry about the same amount of writing.
export function mindSplit(heights:number[],gap=0){const n=heights.length;if(n<2)return n;let best=Math.ceil(n/2),score=Infinity;
 for(let k=1;k<n;k++){const r=heights.slice(0,k).reduce((a,b)=>a+b,0)+gap*(k-1),l=heights.slice(k).reduce((a,b)=>a+b,0)+gap*(n-k-1),s=Math.max(r,l)+Math.abs(k-n/2)*.01;if(s<score-.5||(Math.abs(s-score)<=.5&&k===Math.ceil(n/2))){score=s;best=k;}}
 return best;}
export const mindSide=(i:number,split:number,mode:'both'|'right'):1|-1=>mode==='right'||i<split?1:-1;
export function mindLayout(areas:MindAreaIn[],o:MindOpts):MindLayout{
 const s=mindSizes(o),n=areas.length,gap=o.gap??16;
 const bh=areas.map(a=>Math.max(a.minH,a.rows.reduce((t,r)=>t+r.h,0))),split=mindSplit(bh,gap);
 const order=(side:1|-1)=>{const ids=areas.map((_,i)=>i).filter(i=>mindSide(i,split,s.mode)===side);return side===1?ids:ids.reverse();};
 const sum=(side:1|-1)=>{const ids=order(side);return ids.reduce((t,i)=>t+bh[i],0)+gap*Math.max(0,ids.length-1);};
 const H=Math.max(o.height,sum(1)+2*s.pad,sum(-1)+2*s.pad,s.ch+2*s.pad+40);
 const cx=s.mode==='both'?s.W/2:s.pad+s.cw/2,cy=H/2,branches:MindBranch[]=new Array(n);
 for(const side of [1,-1] as const){const ids=order(side);if(!ids.length)continue;
  // Spare height opens the gaps between areas (up to 40px each), so a tall window gets air, not a squashed stack.
  const extra=H-2*s.pad-sum(side),spread=ids.length>1?Math.min(extra/(ids.length+1),40):0;let y=s.pad+(extra-spread*(ids.length-1))/2;
  for(const i of ids){const top=y,bottom=y+bh[i],hy=(top+bottom)/2,hx=cx+side*(s.cw/2+s.bl);
   const dy=clampN((hy-cy)*.5,-s.ch*.36,s.ch*.36),ex=Math.sqrt(Math.max(0,1-(dy/(s.ch/2))**2));
   const p0:Pt=[cx+side*(s.cw/2)*ex*.97,cy+dy],tip:Pt=[hx,hy],c1:Pt=[p0[0]+side*s.bl*.55,p0[1]],c2:Pt=[hx-side*s.bl*.5,hy];
   let rt=top;
   const twigs=areas[i].rows.map(r=>{const x=hx+side*(s.twig+r.horizon*s.stagger),yy=rt+r.base;
    const t:MindTwig={p0:tip,c1:[hx+side*s.twig*.5,hy],c2:[x-side*s.twig*.55,yy],p3:[x,yy],x,y:yy,len:r.w+10,top:rt};rt+=r.h;return t;});
   branches[i]={index:i,side,p0,c1,c2,tip,top,bottom,twigs};y=bottom+gap+spread;}}
 return {mode:s.mode,width:s.W,height:H,cloud:{cx,cy,w:s.cw,h:s.ch},branchLen:s.bl,room:s.room,branches};
}
// A soft cloud: an ellipse with gentle scallops, closed so rough.js can trace it.
export function cloudPoints(cx:number,cy:number,w:number,h:number,bumps=9,n=90):Pt[]{
 return Array.from({length:n+3},(_,i)=>{const a=i/n*Math.PI*2,r=.92+.08*Math.abs(Math.sin(a*bumps/2));return [cx+Math.cos(a)*w/2*r,cy+Math.sin(a)*h/2*r] as Pt;});
}
// A branch's centreline as path data, always written left to right so the area's name along it reads the right way up.
export function branchPath(b:{side:1|-1;p0:Pt;c1:Pt;c2:Pt;tip:Pt}){const f=(p:Pt)=>`${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
 return b.side===1?`M${f(b.p0)} C${f(b.c1)} ${f(b.c2)} ${f(b.tip)}`:`M${f(b.tip)} C${f(b.c2)} ${f(b.c1)} ${f(b.p0)}`;}
export function bezLength(p0:Pt,c1:Pt,c2:Pt,p3:Pt,n=24){let len=0,prev=p0;for(let i=1;i<=n;i++){const p=bez(p0,c1,c2,p3,i/n);len+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);prev=p;}return len;}
