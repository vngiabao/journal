import type {State} from './model';
import {readLocal,writeLocal,validateImport} from './storage';
import {mergeDocuments} from './sync-merge';

type Meta={enabled:boolean;base?:State;revision:number;lastSync?:string};
type Recovery={local:State;cloud:State;base?:State;revision:number;paths:string[];at:string};
export type SyncStatus={phase:'off'|'syncing'|'synced'|'offline'|'error'|'conflict';message:string;lastSync?:string;recovery?:Recovery};
let status:SyncStatus={phase:'off',message:'Sync is off for this device.'};
const listeners=new Set<()=>void>();
export const syncStatus=()=>status;
export function subscribeSync(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
function report(next:SyncStatus){status=next;listeners.forEach(fn=>fn());}
let get:undefined|(()=>State|null),apply:undefined|((state:State)=>Promise<void>),timer:ReturnType<typeof setTimeout>|undefined;
let settle:undefined|(()=>Promise<boolean>);
let running=false,queued=false;
// Keep this tab's acknowledged ancestor. Another tab can advance the durable
// metadata while this tab is still displaying its older copy.
let sessionMeta:Meta|undefined;
const hosted=()=>typeof location!=='undefined'&&location.hostname==='journal.gbaonvo.com';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
async function call(path:string,options:RequestInit={}){
 const response=await fetch(path,{...options,cache:'no-store',redirect:'error',credentials:'same-origin',signal:AbortSignal.timeout(30000),headers:{'X-Reboot-Sync':'1',...options.headers}});
 if(response.status===409)return {conflict:true};
 if(!response.ok){const data=await response.json().catch(()=>null);throw new Error(response.status===401||response.status===403?'Sign in again to resume syncing.':data?.error??'Sync could not connect. Your changes are saved on this device.');}
 return response;
}
async function json(path:string,options:RequestInit={}){const result=await call(path,options);return result instanceof Response?result.json():result;}
const photoCache=new Map<string,string>();
async function photoHash(data:string){const match=data.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/s);if(!match)throw new Error('Unsupported journal photo. Export a backup before trying again.');const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');return {hash,bytes,type:match[1]};}
async function pack(state:State){const copy=structuredClone(state);
 // Attachments also appear in the audit history; traverse the full document.
 async function walk(v:unknown):Promise<void>{if(!v||typeof v!=='object')return;for(const [key,value] of Object.entries(v)){if(key==='data'&&typeof value==='string'&&value.startsWith('data:image/')){const {hash,bytes,type}=await photoHash(value);if(!photoCache.has(hash)){await call(`/api/sync/photos/${hash}`,{method:'PUT',headers:{'Content-Type':type},body:new Blob([bytes])});photoCache.set(hash,value);} (v as Record<string,unknown>)[key]=`reboot-photo:${hash}`;}else await walk(value);}}
 await walk(copy);return copy;
}
async function unpack(state:State){const copy=structuredClone(state);
 async function walk(v:unknown):Promise<void>{if(!v||typeof v!=='object')return;for(const [key,value] of Object.entries(v)){if(key==='data'&&typeof value==='string'&&/^reboot-photo:[a-f0-9]{64}$/.test(value)){const hash=value.slice(13);let data=photoCache.get(hash);if(!data){const result=await call(`/api/sync/photos/${hash}`);if(!(result instanceof Response))throw new Error('Photo download failed.');const bytes=new Uint8Array(await result.arrayBuffer());const actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(actual!==hash)throw new Error('Photo checksum did not match.');let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);data=`data:${result.headers.get('Content-Type')?.split(';')[0]};base64,${btoa(binary)}`;photoCache.set(hash,data);} (v as Record<string,unknown>)[key]=data;}else await walk(value);}}
 await walk(copy);return validateImport(copy);
}
function hasData(s:State){return s.settings.onboarded||s.settings.name||s.settings.identity||s.settings.language!=='en'||s.settings.timezone!=='America/New_York'||s.edits.length||s.logs.length||s.journey.length||s.journals.length||s.proofs.length||(s.todos?.length??0)||(s.quotes?.length??0)||s.plan||s.training||s.workouts?.length||s.goals.some(g=>g.status!=='not-started');}
async function conflict(local:State,cloud:State,revision:number,paths:string[],base?:State){const recovery={local,cloud,base,revision,paths,at:new Date().toISOString()};await writeLocal('sync-recovery',recovery);report({phase:'conflict',message:'Both devices changed the same record. Both copies are saved for recovery.',recovery});}
export function requestSync(){if(!hosted())return;clearTimeout(timer);timer=setTimeout(()=>void syncNow(),1200);}
export function startSync(read:()=>State|null,update:(state:State)=>Promise<void>,waitForLocalSave:()=>Promise<boolean>){get=read;apply=update;settle=waitForLocalSave;let stopped=false;
 void (async()=>{const meta=await readLocal<Meta>('cloud-sync');const recovery=await readLocal<Recovery>('sync-recovery');if(stopped)return;sessionMeta=meta;if(recovery){report({phase:'conflict',message:'Review the two saved copies to resume sync.',recovery});return;}if(meta?.enabled)void syncNow();})();
 const focus=()=>void syncNow();window.addEventListener('online',focus);window.addEventListener('focus',focus);const interval=setInterval(()=>{if(document.visibilityState==='visible')void syncNow();},30000);
 return()=>{stopped=true;clearInterval(interval);window.removeEventListener('online',focus);window.removeEventListener('focus',focus);get=undefined;apply=undefined;settle=undefined;};
}
export async function enableSync(){if(!get?.())return;const old=await readLocal<Meta>('cloud-sync');if(!await readLocal('sync-first-backup'))await writeLocal('sync-first-backup',structuredClone(get!()));sessionMeta={...old,enabled:true,revision:old?.revision??0};await writeLocal('cloud-sync',sessionMeta);await syncNow();}
export async function pauseSync(){const meta=await readLocal<Meta>('cloud-sync');await writeLocal('cloud-sync',{...meta,enabled:false,revision:meta?.revision??0});report({phase:'off',message:'Sync paused on this device. Local saves continue.'});}
export async function syncNow(){
 if(!hosted()||!get||!apply||status.phase==='conflict')return;
 if(running){queued=true;return;}running=true;
 if(status.phase!=='off')report({phase:'syncing',message:'Syncing…',lastSync:status.lastSync});
 try{
  const run=async()=>{
   const durable=await readLocal<Meta>('cloud-sync');if(!durable?.enabled){report({phase:'off',message:'Sync is off for this device.',lastSync:durable?.lastSync});return;}if(!get||!apply)return;const meta=sessionMeta??durable;
   if(!navigator.onLine){report({phase:'offline',message:'Offline. Changes will sync when you reconnect.',lastSync:meta.lastSync});return;}
   report({phase:'syncing',message:'Syncing…',lastSync:meta.lastSync});
   for(let attempt=0;attempt<4;attempt++){
    const remote=await json('/api/sync');const cloud=remote.document?await unpack(remote.document):null;
    const local=structuredClone(get!()!);let next=local;
    if(cloud){
     // A fresh device downloads the account; two independently used devices need explicit review.
     if(!meta.base){if(!hasData(local))next=cloud;else if(!same(local,cloud)){await conflict(local,cloud,remote.revision,['/first-sync']);return;}}
     else{const merged=mergeDocuments(meta.base,local,cloud);if(merged.conflicts.length){await conflict(local,cloud,remote.revision,merged.conflicts,meta.base);return;}next=validateImport(merged.value);}
    }
    let result={revision:remote.revision,updatedAt:remote.updatedAt};
    if(!cloud||!same(next,cloud)){
     const packed=await pack(next);const response=await json('/api/sync',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:remote.revision,document:packed})});if(response.conflict)continue;result=response;
    }
    const fresh=await readLocal<Meta>('cloud-sync');if(!fresh?.enabled)return;
    if(settle&&!await settle())throw new Error('Local storage failed. Export a backup before continuing sync.');
    // Preserve edits typed while the request was in flight. No await may occur
    // between reading the latest React state and applying its rebased copy.
    const current=get!()!;const rebase=mergeDocuments(local,current,next);
    if(rebase.conflicts.length){await conflict(current,next,result.revision,rebase.conflicts,local);return;}
    const latest=validateImport(rebase.value);
    // Persist received data before acknowledging its baseline. A crash must never
    // turn a missing local download into an intentional deletion on the next run.
    if(!same(current,latest))await apply!(latest);
    if(!(await readLocal<Meta>('cloud-sync'))?.enabled)return;
    const at=new Date().toISOString();sessionMeta={enabled:true,revision:result.revision,base:next,lastSync:at};await writeLocal('cloud-sync',sessionMeta);
    const pending=!same(get!(),next);
    report({phase:pending?'syncing':'synced',message:pending?'Saved here. Syncing your latest changes…':'Synced across your devices.',lastSync:at});if(pending)requestSync();return;
   }
   throw new Error('Another device is saving. Your local changes are safe; try Sync now again.');
  };
  if(navigator.locks)await navigator.locks.request('reboot-cloud-sync',run);else await run();
 }catch(error){report({phase:navigator.onLine?'error':'offline',message:error instanceof Error?error.message:'Sync failed. Your local data is safe.'});}
 finally{running=false;if(queued){queued=false;requestSync();}}
}
export async function resolveSync(which:'local'|'cloud'){
 const recovery=await readLocal<Recovery>('sync-recovery');if(!recovery||!get||!apply)return;
 // Keep the full recovery snapshot even after resolution; only clear the active flag.
 const current=get();if(!current)return;
 await writeLocal('sync-last-recovery',{...recovery,local:current});
 const chosen=recovery.base?mergeDocuments(recovery.base,which==='local'?current:recovery.cloud,which==='local'?recovery.cloud:current).value:which==='cloud'?recovery.cloud:current;
 await apply(validateImport(chosen));
 await writeLocal('sync-recovery',undefined);
 sessionMeta={enabled:true,revision:recovery.revision,base:recovery.cloud};await writeLocal('cloud-sync',sessionMeta);
 report({phase:'syncing',message:'Resuming sync…'});await syncNow();
}
export async function recoveryBackup(){return await readLocal<Recovery>('sync-recovery')??await readLocal<Recovery>('sync-last-recovery')??{firstDeviceBackup:await readLocal<State>('sync-first-backup')};}
