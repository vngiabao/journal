import {createRemoteJWKSet, jwtVerify} from 'jose';
import {syncRequest} from './sync.mjs';

export const OWNER_EMAIL = 'gbao.n.vo@gmail.com';
const keySets = new Map();
const headers = {
 'Cache-Control':'private, no-store',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'X-Frame-Options':'DENY',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
};
function secured(response) {
 const result=new Response(response.body,response);
 for(const [key,value] of Object.entries(headers))result.headers.set(key,value);
 return result;
}
export async function authenticate(request, env, keys) {
 const domain=env.ACCESS_TEAM_DOMAIN;
 if(!domain||!env.ACCESS_AUD||!/^[-a-z0-9]+\.cloudflareaccess\.com$/.test(domain))return {status:503};
 // Static-asset routing may omit the assertion header. The Access cookie
 // contains the same signed application JWT and must pass every check below.
 const cookie=request.headers.get('Cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith('CF_Authorization='))?.slice('CF_Authorization='.length);
 const token=request.headers.get('Cf-Access-Jwt-Assertion')||cookie;
 if(!token)return {status:401};
 try {
  if(!keys){
   if(!keySets.has(domain))keySets.set(domain,createRemoteJWKSet(new URL(`https://${domain}/cdn-cgi/access/certs`)));
   keys=keySets.get(domain);
  }
  const {payload}=await jwtVerify(token,keys,{issuer:`https://${domain}`,audience:env.ACCESS_AUD,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
  if(payload.email!==OWNER_EMAIL)return {status:403};
  return {status:200,email:payload.email};
 }catch{return {status:403};}
}
export async function handleRequest(request,env,keys) {
 // All static files go through this check, even if the edge Access policy is removed.
 const auth=await authenticate(request,env,keys);
 if(auth.status!==200)return secured(new Response(auth.status===503?'Private journal access is being configured.':'Sign in through Cloudflare Access to open this private journal.',{status:auth.status}));
 if(new URL(request.url).pathname.startsWith('/api/sync'))return secured(await syncRequest(request,env));
 if(new URL(request.url).pathname==='/api/account')return secured(Response.json({email:auth.email,provider:'Cloudflare Access',storage:'browser'}));
 if(!['GET','HEAD'].includes(request.method))return secured(new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}}));
 return secured(await env.ASSETS.fetch(request));
}
// Cloudflare passes ExecutionContext as argument three, not a test JWKS.
export default {fetch(request,env){return handleRequest(request,env);}};
