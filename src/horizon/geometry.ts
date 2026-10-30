// Horizon geometry (the life mind map): pure functions only, so every shape on the page can be unit-tested without a browser.
// Coordinates are CSS pixels inside each SVG. Nothing here reads the DOM.
export type Pt=[number,number];

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
// A hand-drawn Buzan mind map. "Me" sits in a soft cloud; each area of life is one thick, tapering branch that leaves
// the cloud, curves, then runs level so its name can be written along it the right way up. Past the name the branch
// splits, one twig after another, and every idea's words sit on their own short line. Time runs outward: a goal's
// twig ends nearest the branch, 5 years a little further, at 40 furthest.
export interface MindRowIn{h:number;base:number;w:number;horizon:number}
export interface MindAreaIn{rows:MindRowIn[];minH:number;nameW?:number}
export interface MindTwig{p0:Pt;c1:Pt;c2:Pt;p3:Pt;x:number;y:number;len:number;top:number}
export interface MindBranch{index:number;side:1|-1;p0:Pt;c1:Pt;c2:Pt;knee:Pt;tip:Pt;name:{x:number;y:number;w:number};top:number;bottom:number;room:number;twigs:MindTwig[]}
export interface MindOpts{width:number;height:number;mode?:'both'|'right'|'auto';twig?:number;stagger?:number;gap?:number;pad?:number;cloudW?:number;branchLen?:number;tail?:number;nameGap?:number;minRoom?:number}
export interface MindLayout{mode:'both'|'right';width:number;height:number;cloud:{cx:number;cy:number;w:number;h:number};branches:MindBranch[]}
const clampN=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
// Sizes that depend on the width and the area names: two-sided when every area keeps `minRoom` for its words, else
// one-sided. `rooms[i]` is how wide area i's words may run.
export function mindSizes(o:MindOpts,nameWs:number[]=[0]){
 const W=Math.max(280,o.width),pad=o.pad??16,twig=o.twig??20,stagger=o.stagger??8,tail=o.tail??26,nameGap=o.nameGap??10,minRoom=o.minRoom??110;
 const arm=(cw:number,bl:number,nw:number)=>cw/2+bl+nw+2*nameGap+tail+twig+3*stagger+pad;
 const cwB=o.cloudW??clampN(W*.22,220,330),blB=o.branchLen??clampN(W*.035,30,80);
 const bothRooms=nameWs.map(nw=>W/2-arm(cwB,blB,nw));
 const mode:'both'|'right'=o.mode&&o.mode!=='auto'?o.mode:Math.min(...bothRooms)>=minRoom?'both':'right';
 const cw=mode==='both'?cwB:(o.cloudW??clampN(W*.3,96,220)),bl=mode==='both'?blB:(o.branchLen??clampN(W*.05,24,60));
 const rooms=nameWs.map(nw=>Math.max(70,Math.floor(Math.min(320,mode==='both'?W/2-arm(cw,bl,nw):W-cw/2-pad-arm(cw,bl,nw)))));
 return {W,pad,twig,stagger,tail,nameGap,mode,cw,ch:Math.round(cw*.56),bl,rooms,room:Math.min(...rooms)};
}
// Two-sided: the first areas run down the right, the rest come back up the left (clockwise, like a clock face).
// Where to split is chosen by height, so both sides carry about the same amount of writing.
export function mindSplit(heights:number[],gap=0){const n=heights.length;if(n<2)return n;let best=Math.ceil(n/2),score=Infinity;
 for(let k=1;k<n;k++){const r=heights.slice(0,k).reduce((a,b)=>a+b,0)+gap*(k-1),l=heights.slice(k).reduce((a,b)=>a+b,0)+gap*(n-k-1),s=Math.max(r,l)+Math.abs(k-n/2)*.01;if(s<score-.5||(Math.abs(s-score)<=.5&&k===Math.ceil(n/2))){score=s;best=k;}}
 return best;}
export const mindSide=(i:number,split:number,mode:'both'|'right'):1|-1=>mode==='right'||i<split?1:-1;
export function mindLayout(areas:MindAreaIn[],o:MindOpts):MindLayout{
 const nameWs=areas.map(a=>a.nameW??0),s=mindSizes(o,nameWs.length?nameWs:[0]),n=areas.length,gap=o.gap??16;
 const bh=areas.map(a=>Math.max(a.minH,a.rows.reduce((t,r)=>t+r.h,0))),split=s.mode==='right'?n:mindSplit(bh,gap);
 const order=(side:1|-1)=>{const ids=areas.map((_,i)=>i).filter(i=>mindSide(i,split,s.mode)===side);return side===1?ids:ids.reverse();};
 const sum=(side:1|-1)=>{const ids=order(side);return ids.reduce((t,i)=>t+bh[i],0)+gap*Math.max(0,ids.length-1);};
 const H=Math.max(o.height,sum(1)+2*s.pad,sum(-1)+2*s.pad,s.ch+2*s.pad+40);
 const cx=s.mode==='both'?s.W/2:s.pad+s.cw/2,cy=H/2,branches:MindBranch[]=new Array(n);
 for(const side of [1,-1] as const){const ids=order(side);if(!ids.length)continue;
  // Spare height opens the gaps between areas (40-90px each, more on tall maps); each side's stack is centred on the cloud.
  const extra=H-2*s.pad-sum(side),spread=ids.length>1?Math.min(extra/(ids.length+1),clampN(H*.06,40,90)):0;let y=s.pad+(extra-spread*(ids.length-1))/2;
  // Roots are spread around the cloud's rim (top to bottom in reading order) and start a little inside it.
  const span=s.mode==='right'?1.2:1.0;
  ids.forEach((i,j)=>{const top=y,bottom=y+bh[i],hy=(top+bottom)/2,k=ids.length,a=k>1?-span+2*span*j/(k-1):clampN((hy-cy)/(s.ch*2),-.6,.6);
   const ca=Math.cos(a),sa=Math.sin(a),p0:Pt=[cx+side*(s.cw/2*.9-10)*ca,cy+(s.ch/2*.9-8)*sa];
   const knee:Pt=[cx+side*(s.cw/2+s.bl),hy],c1:Pt=[p0[0]+side*ca*s.bl*.7,p0[1]+sa*s.bl*.7],c2:Pt=[knee[0]-side*s.bl*.6,hy];
   const nw=nameWs[i]??0,level=nw+2*s.nameGap,tip:Pt=[knee[0]+side*(level+s.tail),hy];
   const rows=areas[i].rows,m=rows.length;let rt=top;
   // Twigs leave the branch one after another along its tail, the top one first, so they never fan from one point.
   const twigs=rows.map((r,q)=>{const rx=knee[0]+side*(level+s.tail*(m>1?.12+.8*q/(m-1):.5)),x=tip[0]+side*(s.twig+r.horizon*s.stagger),yy=rt+r.base;
    const t:MindTwig={p0:[rx,hy],c1:[rx+side*Math.min(12,Math.abs(x-rx)*.4),hy],c2:[x-side*s.twig*.6,yy],p3:[x,yy],x,y:yy,len:r.w+10,top:rt};rt+=r.h;return t;});
   branches[i]={index:i,side,p0,c1,c2,knee,tip,name:{x:knee[0]+side*level/2,y:hy,w:nw},top,bottom,room:s.rooms[i]??s.room,twigs};y=bottom+gap+spread;});}
 return {mode:s.mode,width:s.W,height:H,cloud:{cx,cy,w:s.cw,h:s.ch},branches};
}
// A branch's outline: thick where it leaves the cloud, tapering to thin at its tip, following its curve and level run.
export function branchPoints(b:{p0:Pt;c1:Pt;c2:Pt;knee:Pt;tip:Pt}):Pt[]{const curve=Array.from({length:17},(_,k)=>bez(b.p0,b.c1,b.c2,b.knee,k/16));
 const run=Array.from({length:10},(_,k)=>{const t=(k+1)/10;return [b.knee[0]+(b.tip[0]-b.knee[0])*t,b.knee[1]+Math.sin(t*Math.PI)*1.2] as Pt;});return [...curve,...run];}
export function taperedPoly(pts:Pt[],w0:number,w1:number,pow=.7):Pt[]{const n=pts.length,left:Pt[]=[],right:Pt[]=[];
 const cum=[0];for(let i=1;i<n;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const L=cum[n-1]||1;
 for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,w=(w0+(w1-w0)*Math.pow(cum[i]/L,pow))/2;
  left.push([pts[i][0]-dy/len*w,pts[i][1]+dx/len*w]);right.push([pts[i][0]+dy/len*w,pts[i][1]-dx/len*w]);}
 return [...left,...right.reverse()];}
export const spinePath=(b:{p0:Pt;c1:Pt;c2:Pt;knee:Pt;tip:Pt})=>{const f=(p:Pt)=>`${p[0].toFixed(1)} ${p[1].toFixed(1)}`;return `M${f(b.p0)} C${f(b.c1)} ${f(b.c2)} ${f(b.knee)} L${f(b.tip)}`;};
// A soft cloud: an ellipse with gentle scallops, closed so rough.js can trace it.
export function cloudPoints(cx:number,cy:number,w:number,h:number,bumps=9,n=90):Pt[]{
 return Array.from({length:n+3},(_,i)=>{const a=i/n*Math.PI*2,r=.92+.08*Math.abs(Math.sin(a*bumps/2));return [cx+Math.cos(a)*w/2*r,cy+Math.sin(a)*h/2*r] as Pt;});
}
export function bezLength(p0:Pt,c1:Pt,c2:Pt,p3:Pt,n=24){let len=0,prev=p0;for(let i=1;i<=n;i++){const p=bez(p0,c1,c2,p3,i/n);len+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);prev=p;}return len;}
