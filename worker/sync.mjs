const OWNER='gbao.n.vo@gmail.com';
const MAX_DOC=16*1024*1024,MAX_PHOTO=3*1024*1024;
const json=(body,status=200)=>Response.json(body,{status});
async function limited(request,max){
 if(Number(request.headers.get('Content-Length'))>max)throw new Error('too-large');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new Error('too-large');}chunks.push(value);}
 const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
export async function syncRequest(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY)return json({error:'Cloud sync is not configured yet.'},503);
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.SUPABASE_URL))return json({error:'Invalid sync configuration.'},503);
 if(!['GET','PUT'].includes(request.method))return json({error:'Method not allowed'},405);
 if(request.method==='PUT'&&(request.headers.get('Origin')!==url.origin||request.headers.get('X-Reboot-Sync')!=='1'))return json({error:'Same-origin sync required.'},403);
 const api=async(path,options={})=>fetch(env.SUPABASE_URL+path,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,...(env.SUPABASE_SECRET_KEY.startsWith('eyJ')?{Authorization:`Bearer ${env.SUPABASE_SECRET_KEY}`} : {}),...options.headers},signal:AbortSignal.timeout(20000)});
 try{
  if(path==='/api/sync'){
   if(request.method==='GET'){
    const response=await api('/rest/v1/reboot_sync_state?owner=eq.'+encodeURIComponent(OWNER)+'&select=revision,document,updated_at');
    if(!response.ok)throw new Error('backend');const row=(await response.json())[0];
    return json(row?{revision:row.revision,document:row.document,updatedAt:row.updated_at}:{revision:0,document:null});
   }
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
   let body;try{body=JSON.parse(new TextDecoder().decode(await limited(request,MAX_DOC)));}catch(e){return json({error:e.message==='too-large'?'Journal exceeds the 16 MB sync limit. Export a backup.':'Invalid JSON.'},e.message==='too-large'?413:400);}
   const d=body.document;
   if(!Number.isSafeInteger(body.revision)||body.revision<0||!d||d.schema!==1||!Array.isArray(d.goals)||d.goals.length!==36||!Array.isArray(d.journals)||!Array.isArray(d.logs)||!Array.isArray(d.journey))return json({error:'Invalid journal document.'},400);
   const response=await api('/rest/v1/rpc/reboot_sync_write',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expected_revision:body.revision,new_document:d})});
   if(!response.ok)throw new Error('backend');const result=await response.json();return json(result,result.conflict?409:200);
  }
  const match=path.match(/^\/api\/sync\/photos\/([a-f0-9]{64})$/);if(!match)return json({error:'Not found'},404);
  const location='/storage/v1/object/reboot-photos/'+match[1];
  if(request.method==='GET'){
   const response=await api(location);if(!response.ok)return json({error:'Photo could not be downloaded.'},response.status===404?404:502);
   return new Response(response.body,{headers:{'Content-Type':response.headers.get('Content-Type')??'application/octet-stream'}});
  }
  const type=request.headers.get('Content-Type');if(!['image/png','image/jpeg','image/webp'].includes(type))return json({error:'PNG, JPG or WebP required.'},415);
  let bytes;try{bytes=await limited(request,MAX_PHOTO);}catch{return json({error:'Photo exceeds 3 MB.'},413);}
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==match[1])return json({error:'Photo checksum mismatch.'},400);
  const response=await api(location,{method:'POST',headers:{'Content-Type':type,'x-upsert':'false'},body:bytes});
  if(!response.ok&&response.status!==409){const error=await response.json().catch(()=>({}));if(error.statusCode!=='409'&&error.error!=='Duplicate')throw new Error('backend');}
  return json({saved:true});
 }catch{return json({error:'Cloud sync is unavailable. Your changes remain on this device. Try again.'},502);}
}
