import {describe,it,expect,vi,afterEach} from 'vitest';
import {syncRequest} from '../worker/sync.mjs';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'};
const put=(path,body,headers={})=>new Request('https://journal.gbaonvo.com'+path,{method:'PUT',headers:{Origin:'https://journal.gbaonvo.com','X-Reboot-Sync':'1','Content-Type':'application/json',...headers},body});
afterEach(()=>vi.unstubAllGlobals());
describe('Server sync gateway',()=>{
 it('rejects missing configuration, cross-origin and unsupported methods',async()=>{expect((await syncRequest(new Request('https://journal.gbaonvo.com/api/sync'),{})).status).toBe(503);expect((await syncRequest(put('/api/sync','{}',{Origin:'https://evil.example'}),env)).status).toBe(403);expect((await syncRequest(new Request('https://journal.gbaonvo.com/api/sync',{method:'DELETE'}),env)).status).toBe(405);});
 it('returns an empty revision without exposing backend credentials',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json([])));const response=await syncRequest(new Request('https://journal.gbaonvo.com/api/sync'),env);expect(await response.json()).toEqual({revision:0,document:null});expect(fetch.mock.calls[0][1].headers.apikey).toBe(env.SUPABASE_SECRET_KEY);});
 it('validates documents and forwards revision conflicts',async()=>{expect((await syncRequest(put('/api/sync','{}'),env)).status).toBe(400);vi.stubGlobal('fetch',vi.fn(async()=>Response.json({conflict:true,revision:2})));const doc={schema:1,goals:Array(36).fill({}),journals:[],logs:[],journey:[]};expect((await syncRequest(put('/api/sync',JSON.stringify({revision:1,document:doc})),env)).status).toBe(409);});
 it('rejects oversized photos and wrong checksums',async()=>{const hash='0'.repeat(64);expect((await syncRequest(put('/api/sync/photos/'+hash,'not-an-image',{'Content-Type':'text/html'}),env)).status).toBe(415);expect((await syncRequest(put('/api/sync/photos/'+hash,'bytes',{'Content-Type':'image/png'}),env)).status).toBe(400);});
});
