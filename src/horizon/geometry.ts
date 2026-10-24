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
// A life wheel: angle is the area of life, distance from the centre is time. Rings (inner to outer): this year,
// 5 years, 10 years, at 40. Drawn as ellipses so the wheel uses a wide window instead of leaving empty margins.
export const LIFE_RING_F=[.46,.65,.83,1];
// Odd counts put the first area at the top; even counts turn by half a slot. Either way the bottom of the wheel
// falls between two branches, which is where the ring names sit.
export const areaAngle=(i:number,n:number)=>-Math.PI/2+(n%2===0?Math.PI/n:0)+i*2*Math.PI/Math.max(1,n);
export interface LifeBranch{index:number;angle:number;cos:number;sin:number;p0:Pt;c1:Pt;c2:Pt;tip:Pt;cross:Pt[]}
export interface LifeGeo{width:number;height:number;cx:number;cy:number;rx:number;ry:number;rings:{rx:number;ry:number}[];centre:{w:number;h:number};branches:LifeBranch[]}
export function lifeLayout({areas:n,width,height,padX=220,padTop=88,padBottom=40}:{areas:number;width:number;height:number;padX?:number;padTop?:number;padBottom?:number}):LifeGeo{
 // Never taller than wide: when the width runs out first, the wheel stays round and only takes the height it needs.
 const W=Math.max(320,width),rxA=Math.max(110,(W-2*padX)/2),ry=Math.max(110,Math.min(rxA,(Math.max(320,height)-padTop-padBottom)/2)),rx=Math.min(rxA,ry*1.75),H=padTop+2*ry+padBottom;
 const cx=W/2,cy=padTop+ry,rings=LIFE_RING_F.map(f=>({rx:rx*f,ry:ry*f}));
 const at=(f:number,a:number):Pt=>[cx+rx*f*Math.cos(a),cy+ry*f*Math.sin(a)];
 const er=(p:Pt)=>Math.hypot((p[0]-cx)/rx,(p[1]-cy)/ry);
 const branches:LifeBranch[]=[];
 for(let i=0;i<n;i++){const a=areaAngle(i,n),bend=(i%2?1:-1)*.07;
  const p0=at(.2,a),c1=at(.5,a+bend),c2=at(.8,a-bend*.6),tip=at(1.045,a);
  // Where the branch meets each ring: sample the curve and take the first point at or past the ring.
  const cross=LIFE_RING_F.map(f=>{let prev=p0;for(let k=1;k<=60;k++){const p=bez(p0,c1,c2,tip,k/60);if(er(p)>=f){const r0=er(prev),r1=er(p),t=r1===r0?1:(f-r0)/(r1-r0);return [prev[0]+(p[0]-prev[0])*t,prev[1]+(p[1]-prev[1])*t] as Pt;}prev=p;}return at(f,a);});
  branches.push({index:i,angle:a,cos:Math.cos(a),sin:Math.sin(a),p0,c1,c2,tip,cross});}
 return {width:W,height:H,cx,cy,rx,ry,rings,centre:{w:Math.min(300,rx*.6),h:Math.min(176,ry*.5)},branches};
}
// Which side of its ring crossing a label sits on. Labels on the outer ring above or below the centre stack
// over or under the point; everything else reads outward, to the right or the left.
export function nodeSide(cos:number,sin:number,outer:boolean):'left'|'right'|'up'|'down'{if(outer&&Math.abs(cos)<.3)return sin<0?'up':'down';return cos>=-.05?'right':'left';}
// A closed, slightly irregular ellipse for rough.js to trace (a hand-drawn ring, never a perfect circle).
export function ellipsePoints(cx:number,cy:number,rx:number,ry:number,seed=0,n=36):Pt[]{return Array.from({length:n+3},(_,i)=>{const a=i/n*Math.PI*2+seed*.37,w=1+Math.sin(i*1.7+seed)*.006;return [cx+Math.cos(a)*rx*w,cy+Math.sin(a)*ry*w] as Pt;});}

export interface NodeIn{key:string;anchor:Pt;side:'left'|'right'|'up'|'down';variants:{w:number;h:number}[];gap?:number;lane?:Box;alt?:'left'|'right';altFrom?:number}
export interface NodeOut{key:string;variant:number;box:Box;overlap:boolean;side:NodeIn['side']}
// Places labels next to their ring crossings in the order given (most important first). Each node tries its richest
// variant first, nudged a little along its side; if nothing fits it folds to a smaller variant ("+2"). Boxes stay
// inside the canvas and never overlap each other or the obstacles unless even the smallest variant cannot fit.
// A node's `lane` (the first line's spot beside its own point) is kept free for it until it is placed, so an earlier,
// taller label on the same branch cannot swallow a later ring's point.
export function placeNodes(nodes:NodeIn[],o:{width:number;height:number;gap?:number;pad?:number;obstacles?:Box[]}):NodeOut[]{
 const pad=o.pad??6,placed:Box[]=[...(o.obstacles??[])],out:NodeOut[]=[];
 const boxAt=(n:NodeIn,w:number,h:number,shift:number,side=n.side):Box=>{const [x,y]=n.anchor,gap=n.gap??o.gap??14;let l:number,t:number;
  if(side==='right'){l=x+gap;t=y-h/2+shift;}else if(side==='left'){l=x-gap-w;t=y-h/2+shift;}else if(side==='up'){l=x-w/2+shift;t=y-gap-h;}else{l=x-w/2+shift;t=y+gap;}
  l=Math.max(0,Math.min(o.width-w,l));t=Math.max(0,Math.min(o.height-h,t));return {l,t,r:l+w,b:t+h};};
 const lanes=new Map(nodes.filter(n=>n.lane).map(n=>[n.key,n.lane!]));
 const over=(q:Box,p:Box)=>q.l<p.r+pad&&q.r+pad>p.l&&q.t<p.b+pad&&q.b+pad>p.t;
 const hits=(q:Box,self:string)=>placed.some(p=>over(q,p))||[...lanes].some(([k,p])=>k!==self&&over(q,p));
 for(const n of nodes){let done=false;lanes.delete(n.key);const shifts=n.side==='left'||n.side==='right'?[0,-14,14,-28,28,-44,44,-60,60]:[0,-24,24,-48,48,-72,72];
  // A label may read to the other side of its branch when the outward side is taken (from variant `altFrom` on).
  for(let v=0;v<n.variants.length&&!done;v++){const {w,h}=n.variants[v];for(const side of n.alt&&v>=(n.altFrom??0)?[n.side,n.alt]:[n.side]){for(const s of shifts){const q=boxAt(n,w,h,s,side);if(!hits(q,n.key)){placed.push(q);out.push({key:n.key,variant:v,box:q,overlap:false,side});done=true;break;}}if(done)break;}}
  if(!done){const v=n.variants.length-1,q=boxAt(n,n.variants[v].w,n.variants[v].h,0);placed.push(q);out.push({key:n.key,variant:v,box:q,overlap:true,side:n.side});}}
 return out;
}
