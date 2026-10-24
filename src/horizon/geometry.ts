// Horizon geometry: pure functions only, so every shape on the page can be unit-tested without a browser.
// Coordinates are CSS pixels inside each SVG. Nothing here reads the DOM.
export type Pt=[number,number];

// ---------------------------------------------------------------------------------------------- ridge
// Peaks stand in equal slots across the band. One extra slot holds the dashed "Add a goal" peak until there are ten.
export const peakSlots=(n:number,canAdd=true)=>Math.max(1,n+(canAdd&&n<10?1:0));
export interface Band{height:number;base:number;one:number;high:number;low:number}
// Desktop leaves headroom above the summits for two-line labels; the phone band shows numbered pennants only.
export const BAND_DESKTOP:Band={height:224,base:206,one:100,high:132,low:154};
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
  const tries:[typeof two,number,number][]=[[two,w2,0],[two,w2,1],[one,w1,0],[one,w1,1]];
  let done=false;
  for(const [wr,w,row] of tries){const q=box(it.x,w,it.bottom,wr.lines.length,row);if(!hits(q)){placed.push(q);out[i]={left:q.l,top:q.t,width:w,lines:wr.lines,truncated:wr.truncated||wr!==two&&two.lines.length>1,row};done=true;break;}}
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
export interface MapBranch{index:number;side:1|-1;p0:Pt;c1:Pt;c2:Pt;tip:Pt;w0:number;label:{x:number;y:number;width:number;align:'left'|'right';below?:boolean}}
export interface MapTwig{p0:Pt;c1:Pt;c2:Pt;tip:Pt;label:{x:number;y:number;width:number;align:'left'|'right'}}
export interface MapLayout{mode:'both'|'stack';width:number;height:number;centre:{x:number;y:number;w:number;h:number};branches:MapBranch[];twigs:MapTwig[]}
// Two-sided radial map on wide screens (goal 1 at the top right, clockwise); on narrow screens a trunk down the
// left with goals growing right. Twigs hang off the focused goal only. Positions of goals never depend on focus,
// so refocusing never moves the branches, only the twigs.
export function mapLayout({n,focus,twigs,width,oneIndex}:{n:number;focus:number;twigs:number;width:number;oneIndex:number}):MapLayout{
 const W=Math.max(280,width),cw=Math.max(170,Math.min(240,W*.18)),half=W/2,bl=Math.min(330,half-cw/2-56-170);
  // Each side keeps 170px beyond the tips for the focused goal's twigs; below 170px of branch, switch to the trunk layout.
 if(bl>=170&&n>0){
  const right=Math.ceil(n/2),m=Math.max(right,n-right),H=Math.max(460,m*96+96,twigs*32+120),cx=half,cy=H/2;
  const branches:MapBranch[]=[];
  for(let i=0;i<n;i++){const side:1|-1=i<right?1:-1,k=side===1?i:n-1-i,count=side===1?right:n-right;
   const gapY=count>1?Math.min(104,(H-110)/(count-1)):0,dy=(k-(count-1)/2)*gapY,ty=cy+dy;
   const p0:Pt=[cx+side*cw*.44,cy+dy*.2],tip:Pt=[cx+side*(cw/2+bl-Math.abs(dy)*.1),ty];
   const c1:Pt=[p0[0]+side*bl*.09,p0[1]],c2:Pt=[p0[0]+side*bl*.07,ty];
   const from=p0[0]+side*bl*.1,lw=Math.abs(tip[0]-from);
   branches.push({index:i,side,p0,c1,c2,tip,w0:i===oneIndex?20:15,label:{x:side===1?from:tip[0],y:ty,width:lw,align:side===1?'right':'left',below:dy>1}});}
  const tw:MapTwig[]=[],b=branches[focus];
  if(b&&twigs>0){const gap=32,span=(twigs-1)*gap;let y0=b.tip[1]-span/2;y0=Math.max(24,Math.min(H-24-span,y0));
   for(let j=0;j<twigs;j++){const ty=y0+j*gap,p0:Pt=[b.tip[0]-b.side*4,b.tip[1]],tip:Pt=[b.tip[0]+b.side*46,ty];
    const lx=tip[0]+b.side*8,lw=b.side===1?W-lx-8:lx-8;
    tw.push({p0,c1:[p0[0]+b.side*18,p0[1]],c2:[tip[0]-b.side*20,ty],tip,label:{x:b.side===1?lx:8,y:ty,width:Math.min(lw,260),align:b.side===1?'left':'right'}});}}
  return {mode:'both',width:W,height:H,centre:{x:cx,y:cy,w:cw,h:118},branches,twigs:tw};
 }
 // Narrow: a trunk down the left edge, each goal a branch growing right, the focused one's twigs hanging below it.
 const x0=18,row=66,twigGap=36,branches:MapBranch[]=[],tw:MapTwig[]=[];let y=48;
 for(let i=0;i<n;i++){
  const ty=y,L=Math.min(W-x0-56,340),p0:Pt=[x0,ty-row*.55],tip:Pt=[x0+L,ty];
  branches.push({index:i,side:1,p0,c1:[x0+2,ty-6],c2:[x0+26,ty],tip,w0:i===oneIndex?13:10,label:{x:x0+26,y:ty,width:L-26,align:'left'}});
  y+=row;
  if(i===focus&&twigs>0){for(let j=0;j<twigs;j++){const yy=ty+12+(j+1)*twigGap-8,a:Pt=[x0+40,ty+2],tip2:Pt=[x0+66,yy];
   tw.push({p0:a,c1:[x0+42,ty+12],c2:[x0+46,yy],tip:tip2,label:{x:x0+74,y:yy,width:W-x0-74-8,align:'left'}});}
   y+=twigs*twigGap+6;}
 }
 return {mode:'stack',width:W,height:Math.max(y-row+40,120),centre:{x:x0,y:0,w:0,h:0},branches,twigs:tw};
}
