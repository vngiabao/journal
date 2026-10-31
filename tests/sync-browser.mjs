// Two isolated browser devices, real client + Worker, simulated Supabase only.
// No production journal, credentials, cookies, or databases are accessed.
import {chromium} from '@playwright/test';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {handleRequest,OWNER_EMAIL} from '../worker/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='https://journal.gbaonvo.com',local='http://127.0.0.1:5174';
const nativeFetch=globalThis.fetch;let revision=0,document=null;const photos=new Map();
globalThis.fetch=async(url,options={})=>{
 if(!String(url).startsWith('https://synctest.supabase.co'))return nativeFetch(url,options);
 const path=new URL(url).pathname;
 if(path.includes('/storage/')){const key=path.split('/').at(-1);if(options.method==='POST'){photos.set(key,{bytes:options.body,type:options.headers['Content-Type']});return Response.json({saved:true});}const photo=photos.get(key);return photo?new Response(photo.bytes,{headers:{'Content-Type':photo.type}}):new Response('',{status:404});}
 if(path.includes('/rpc/')){const body=JSON.parse(options.body);if(body.expected_revision!==revision)return Response.json({conflict:true,revision});document=body.new_document;revision++;return Response.json({revision,updatedAt:new Date().toISOString()});}
 return Response.json(document?[{revision,document,updated_at:new Date().toISOString()}]:[]);
};
const pair=await generateKeyPair('RS256'),jwk=await exportJWK(pair.publicKey);jwk.kid='test';const keys=createLocalJWKSet({keys:[jwk]});
const env={ACCESS_TEAM_DOMAIN:'sync-test.cloudflareaccess.com',ACCESS_AUD:'sync-test',SUPABASE_URL:'https://synctest.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'};
const token=await new SignJWT({email:OWNER_EMAIL}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://'+env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setSubject('test').setIssuedAt().setExpirationTime('1h').sign(pair.privateKey);
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
async function device(){const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(()=>{for(const k of ['reboot-tour-v1','reboot-tour-journal','reboot-tour-horizon','reboot-tour-progress','reboot-tour-review','reboot-tour-board'])localStorage.setItem(k,'done');localStorage.setItem('reboot-daily-open','1');});
 await context.route('https://journal.gbaonvo.com/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname;if(path.startsWith('/api/')){const response=await handleRequest(new Request(req.url(),{method:req.method(),headers:{...req.headers(),'Cf-Access-Jwt-Assertion':token},body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}),env,keys);return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});}const response=await nativeFetch(local+new URL(req.url()).pathname+new URL(req.url()).search);await route.fulfill({status:response.status,headers:{'Content-Type':response.headers.get('Content-Type')??'text/plain'},body:Buffer.from(await response.arrayBuffer())});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/#Settings');await page.getByRole('heading',{name:'Across your devices'}).waitFor();return {context,page};}
const a=await device(),b=await device();
const nav=async(d,name)=>d.page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true}).click();
async function synced(d){await nav(d,'Settings');const section=d.page.locator('section').filter({has:d.page.getByRole('heading',{name:'Across your devices',exact:true})});if(await section.getByRole('button',{name:'Enable sync for this device'}).count())await section.getByRole('button',{name:'Enable sync for this device'}).click();else await section.getByRole('button',{name:'Sync now',exact:true}).click();await section.getByText('Synced across your devices.',{exact:true}).waitFor();}
async function read(d){return d.page.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('project-reboot');r.onsuccess=()=>resolve(r.result);});const s=await new Promise(resolve=>{const r=db.transaction('state').objectStore('state').get('private');r.onsuccess=()=>resolve(r.result);});db.close();return s;});}
try{
 await nav(a,'Journal');await a.page.getByRole('textbox',{name:'Journal entry',exact:true}).fill('TEST: A first journal');await a.page.waitForTimeout(250);assert.equal(document,null,'nothing uploads before enabling');await synced(a);assert.equal(document.journals[0].text,'TEST: A first journal');await synced(b);assert.equal((await read(b)).journals[0].text,'TEST: A first journal');
 await a.context.setOffline(true);await nav(a,'Journal');await a.page.getByRole('textbox',{name:'Journal entry',exact:true}).fill('TEST: A offline edit');await a.page.waitForTimeout(1500);
 await nav(b,'Today');{const skip=b.page.getByRole('button',{name:/^Skip the (plan|check-in) and show my list$/});await skip.waitFor();await skip.click();}await b.page.getByRole('textbox',{name:'Add something for today',exact:true}).fill('TEST: B todo');await b.page.getByRole('textbox',{name:'Add something for today',exact:true}).press('Enter');await synced(b);
 await a.context.setOffline(false);await synced(a);await synced(b);assert.equal((await read(b)).journals[0].text,'TEST: A offline edit');assert((await read(a)).todos.some(t=>t.text==='TEST: B todo'));
 // Photo upload, private download, and rehydration into a portable local backup.
 await nav(a,'Journal');const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/N1cAAAAASUVORK5CYII=','base64');await a.page.locator('input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});await a.page.locator('.attachments img').waitFor();await synced(a);await synced(b);assert.equal(photos.size,1);assert((await read(b)).journals[0].attachments[0].data.startsWith('data:image/png;base64,'));assert(document.journals[0].attachments[0].data.startsWith('reboot-photo:'));
 await a.context.setOffline(true);await b.context.setOffline(true);for(const [d,text] of [[a,'TEST: conflict A'],[b,'TEST: conflict B']]){await nav(d,'Journal');await d.page.getByRole('textbox',{name:'Journal entry',exact:true}).fill(text);await d.page.waitForTimeout(250);}
 await a.context.setOffline(false);await synced(a);await b.context.setOffline(false);await nav(b,'Settings');await b.page.getByRole('heading',{name:'Choose the copy to keep'}).waitFor();assert.equal((await read(b)).journals[0].text,'TEST: conflict B');await b.page.getByRole('button',{name:'Use the cloud copy',exact:true}).click();await b.page.getByText('Synced across your devices.',{exact:true}).waitFor();assert.equal((await read(b)).journals[0].text,'TEST: conflict A');await b.page.reload();await b.page.getByText('Synced across your devices.',{exact:true}).waitFor();
 await fs.mkdir('test-results',{recursive:true});await b.page.screenshot({path:'test-results/sync-desktop.png',fullPage:true});await b.page.setViewportSize({width:390,height:844});await b.page.screenshot({path:'test-results/sync-mobile.png',fullPage:true});assert(await b.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS: opt-in, two-device round trip, offline merge, private photos, conflict recovery, reload and mobile layout. Supabase was simulated; production data untouched.');
}finally{await browser.close();globalThis.fetch=nativeFetch;}
