import rough from 'roughjs';
import type {Drawable,Options} from 'roughjs/bin/core';

// Hand-drawn chart marks. rough.js returns path data; colours come from CSS classes, so shapes use
// two marker colours: S for outlines, F for fills. Every shape takes a fixed seed so it never wobbles between renders.
const gen=rough.generator();
const S='#010101',F='#020202';
const o=(x:Options={}):Options=>({stroke:S,...x,...(x.fillStyle||x.fill?{fill:F}:{})});

export const sk={
 line:(x1:number,y1:number,x2:number,y2:number,x?:Options)=>gen.line(x1,y1,x2,y2,o(x)),
 rect:(x0:number,y0:number,w:number,h:number,x?:Options)=>gen.rectangle(x0,y0,w,h,o(x)),
 circle:(cx:number,cy:number,d:number,x?:Options)=>gen.circle(cx,cy,d,o(x)),
 curve:(p:[number,number][],x?:Options)=>gen.curve(p,o(x)),
 path:(p:[number,number][],x?:Options)=>gen.linearPath(p,o(x)),
 polygon:(p:[number,number][],x?:Options)=>gen.polygon(p,o(x)),
};

// A stable seed from any key, so the same mark is drawn the same way every time.
export const seedOf=(k:string)=>{let h=7;for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))%2147483647;return h||1;};

export function Rough({shape,className}:{shape:Drawable|null|false;className:string}){
 if(!shape)return null;
 return <g className={`rk ${className}`} pointerEvents="none">{gen.toPaths(shape).map((p,i)=>p.fill===F
  ?<path key={i} d={p.d} className="f" stroke="none"/>
  :<path key={i} d={p.d} className={p.stroke===F?'h':'s'} fill="none" strokeWidth={p.strokeWidth}/>)}</g>;
}
