// Operational verification. Load the ignored server env and a public anon key.
// Only a harmless one-pixel immutable test object is uploaded, never test journals.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY,anon=process.env.VITE_SUPABASE_ANON_KEY;
if(!url||!key||!anon)throw new Error('Load server env plus a public Supabase anon key');
const request=(path,secret=true,options={})=>fetch(url+path,{...options,headers:{apikey:secret?key:anon,...(secret?{}:{Authorization:`Bearer ${anon}`}),...options.headers}});
let response=await request('/rest/v1/reboot_sync_state?select=revision',false);assert([401,403].includes(response.status),'anon must not read Reboot');
response=await request('/rest/v1/rpc/reboot_sync_write',false,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expected_revision:0,new_document:{schema:1,goals:[]}})});assert([401,403].includes(response.status),'anon must not execute the write function');
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/N1cAAAAASUVORK5CYII=','base64'),hash=createHash('sha256').update(bytes).digest('hex'),path='/storage/v1/object/reboot-photos/'+hash;
response=await request(path,true,{method:'POST',headers:{'Content-Type':'image/png','x-upsert':'false'},body:bytes});if(!response.ok){const duplicate=await response.json();assert(duplicate.statusCode==='409'||duplicate.error==='Duplicate','photo upload failed');}
response=await request(path);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
response=await request(path,false);assert(response.status>=400,'anon must not read a private photo');
response=await request('/storage/v1/object/public/reboot-photos/'+hash,false);assert(response.status>=400,'bucket must not be public');
response=await request('/rest/v1/reboot_sync_state?select=revision');assert.equal(response.status,200);console.log('PASS: real Supabase anonymous table/RPC denial, private photo upload/download, and public photo denial. Cloud revisions:',(await response.json()).map(r=>r.revision));
