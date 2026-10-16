// Visual QA: seeds clearly-labelled SAMPLE data into an isolated browser profile and captures every page.
// Never touches your real browser data. Usage: node tests/visual.mjs [outDir] [baseUrl]
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const out=process.argv[2]??'.impeccable/review',base=process.argv[3]??'http://127.0.0.1:5174/';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
async function seedSample(page){await page.evaluate(async()=>{
 const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('project-reboot',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
 const db=await open(),get=k=>new Promise(res=>{const r=db.transaction('state').objectStore('state').get(k);r.onsuccess=()=>res(r.result);});
 const s=await get('private');const fmt=d=>d.toLocaleDateString('en-CA',{timeZone:'America/New_York'});const day=n=>{const d=new Date();d.setDate(d.getDate()-n);return fmt(d);};
 const start=day(24);for(const g of s.goals){g.start=start;g.versions[0].effective=start;}
 for(const id of ['36','11','02','32','23','07','08','21','16','20','15','22'])s.goals.find(g=>g.id===id).status='active';
 s.goals.find(g=>g.id==='36').pinned=true;s.goals.find(g=>g.id==='16').pinned=true;s.goals.find(g=>g.id==='23').pinned=true;
 const L=(goalId,n,p={})=>s.logs.push({id:crypto.randomUUID(),goalId,run:1,date:day(n),state:'success',createdAt:day(n),updatedAt:day(n),...p});
 for(let n=1;n<=9;n++)L('36',n);for(let n=1;n<=4;n++)L('32',n);L('32',6);L('02',1);L('02',2);L('02',3,{state:'failed'});
 L('11',1,{tasks:['Exercise A','Exercise B']});L('11',0,{tasks:['Exercise A'],state:'partial'});
 for(const n of [0,2,3])L('23',n);for(const n of [1,2,3,4,8,9,10])L('07',n);L('08',1,{value:3.5});L('08',2,{value:4});
 L('21',20,{value:80.4});L('21',12,{value:79.6});L('21',3,{value:79.1});L('16',15,{stage:'Applications',title:''});L('16',6,{stage:'Interviews',title:''});
 const moves=[[24,3,'',false],[23,2],[22,-4,'NVIDIA interview went badly',true,'Doubt'],[21,-3],[19,2],[18,4],[17,-6,'Ghosted after two rounds',true,'Burnout'],[15,1],[14,3],[13,2],[12,5,'Finished the YC draft',true,'Small win'],[10,-2],[9,1],[8,-1],[6,4,'Back to the gym',true,'Restart'],[5,2],[4,3],[3,-1],[2,5],[1,3]];
 s.journey=moves.map(([n,delta,note='',milestone=false,tag])=>({date:day(n),delta,note,milestone,...(tag?{tag}:{})}));
 const d4=s.journey.find(m=>m.date===day(4));const ms=[{delta:-2,note:'SAMPLE: Morning felt heavy, skipped the run.'},{delta:3,note:'SAMPLE: Got a reply from a recruiter.'},{delta:2,note:'SAMPLE: Gym anyway, then cooked dinner.'}];d4.moments=ms.map((m,i)=>({id:crypto.randomUUID(),delta:m.delta,note:m.note,at:new Date(Date.now()-(3-i)*3600e3).toISOString()}));d4.delta=3;d4.note='';
 for(const id of ['01','02','03','04','05','06','27'])s.goals.find(g=>g.id===id).status='completed';
 s.proofs=[{kind:'attempt',text:'SAMPLE: Made it to round two at a chip company',n:17},{kind:'attempt',text:'SAMPLE: Interviewed for a hardware role',n:22},{kind:'win',text:'SAMPLE: Shipped a feature real users asked for',n:12},{kind:'lesson',text:'SAMPLE: Prepare system design out loud, not in my head',n:21},{kind:'win',text:'SAMPLE: Nine nights of meditation in a row',n:1}].map(p=>({id:crypto.randomUUID(),date:day(p.n),kind:p.kind,text:p.text,createdAt:day(p.n)}));
 s.journals=[{date:day(1),kind:'daily',mood:'Good',goals:[],attachments:[],updatedAt:day(1),text:'SAMPLE ENTRY. Slow start, but I kept the promises that mattered. Gym after work, then an hour on the application.\n\nWhat went well?\nI did not open my phone for the first fifteen minutes.'},{date:day(2),kind:'daily',mood:'Okay',goals:[],attachments:[],updatedAt:day(2),text:'SAMPLE ENTRY. Tired. Wrote anyway.'}];
 const nd=n=>{const d=new Date();d.setDate(d.getDate()-n);return fmt(d);};s.todos=[['SAMPLE: Send two applications',0,true],['SAMPLE: Gym at 6',0,false],['SAMPLE: Call Mom',0,false],['SAMPLE: Finish YC answers',-1,false]].map(([text,n,done])=>({id:crypto.randomUUID(),date:nd(n),text,done,createdAt:nd(0)}));
 s.quotes=[{id:crypto.randomUUID(),date:nd(2),text:'SAMPLE: Winners don’t make excuses when the other side is playing the game.'}];s.settings.onboarded=true;s.settings.identity='SAMPLE: I am someone who keeps the promises I make to myself.';
 await new Promise(res=>{const t=db.transaction('state','readwrite');t.objectStore('state').put(s,'private');t.oncomplete=res;});db.close();});}
const pages=['Today','Reboot Board','Journey','Journal','Review','Settings'];
for(const [w,h,tag] of [[1440,900,'desktop'],[820,1100,'tablet'],[390,844,'mobile']]){
 const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(`${tag}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`${tag}: ${m.text()}`);});
 await page.goto(base);await page.waitForSelector('.sidebar');await seedSample(page);
 for(const p of pages){await page.goto(base+'#'+encodeURIComponent(p));await page.reload();await page.waitForSelector('.page-footer');await page.waitForTimeout(450);await page.screenshot({path:`${out}/${tag}-${p.replace(' ','-').toLowerCase()}.png`,fullPage:true});}
 if(tag==='desktop'){await page.goto(base+'#Reboot%20Board');await page.reload();await page.waitForTimeout(300);await page.screenshot({path:`${out}/desktop-classic.png`,fullPage:true});await page.getByRole('button',{name:'Week',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:`${out}/desktop-weekly.png`,fullPage:false});}
 await context.close();
}
await browser.close();
console.log(errors.length?`Errors:\n${[...new Set(errors)].join('\n')}`:'No page errors');
