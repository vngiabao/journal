// Three-way reconciliation: deletion is a change, not a missing upload.
// Disjoint fields/records merge. Same-field edits stop for explicit recovery.
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const key=(v:unknown)=>object(v)?typeof v.id==='string'?v.id:typeof v.date==='string'?`${v.date}|${v.kind??''}`:null:null;
export function mergeDocuments<T>(base:T|undefined,local:T,cloud:T):{value:T;conflicts:string[]}{
 const conflicts:string[]=[];
 function merge(b:unknown,l:unknown,r:unknown,path:string):unknown{
  if(equal(l,r)||equal(b,r))return structuredClone(l);
  if(equal(b,l))return structuredClone(r);
  if(Array.isArray(l)&&Array.isArray(r)&&(l.length+r.length>0)&&[...l,...r].every(v=>key(v)!==null)){
   const map=(a:unknown)=>new Map((Array.isArray(a)?a:[]).map(v=>[key(v),v]));const bm=map(b),lm=map(l),rm=map(r);
   return [...new Set([...lm.keys(),...rm.keys()])].map(k=>merge(bm.get(k),lm.get(k),rm.get(k),`${path}/${k}`)).filter(v=>v!==undefined);
  }
  if(object(l)&&object(r)&&(b===undefined||object(b))){
   const result:Record<string,unknown>={};for(const k of new Set([...Object.keys(l),...Object.keys(r)])){
    // A Journey day's total is derived from its moments, not a conflicting field.
    if(k==='delta'&&Array.isArray(l.moments)&&Array.isArray(r.moments))continue;
    const v=merge(object(b)?b[k]:undefined,l[k],r[k],`${path}/${k}`);if(v!==undefined)result[k]=v;
   }
   if(Array.isArray(result.moments))result.delta=result.moments.reduce((sum,m)=>sum+Number(m.delta),0);
   return result;
  }
  // Coalesced edit-history records are supplementary; both full states remain in recovery backups.
  if(!path.startsWith('/edits/'))conflicts.push(path||'/');
  return structuredClone(l);
 }
 return {value:merge(base,local,cloud,'') as T,conflicts};
}
