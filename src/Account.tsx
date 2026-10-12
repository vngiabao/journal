import {useEffect,useState} from 'react';

export function Account(){
 const [email,setEmail]=useState(''),[error,setError]=useState(false);
 const hosted=location.hostname==='journal.gbaonvo.com';
 useEffect(()=>{
  if(!hosted)return;
  const controller=new AbortController();
  fetch('/api/account',{signal:controller.signal,cache:'no-store',redirect:'error'})
   .then(async r=>{if(!r.ok)throw new Error('Session unavailable');const account=await r.json();if(account.email!=='gbao.n.vo@gmail.com')throw new Error('Unexpected identity');setEmail(account.email);})
   .catch(()=>{if(!controller.signal.aborted)setError(true);});
  return()=>controller.abort();
 },[hosted]);
 if(!hosted)return null;
 return <section className="settings-section"><h2>Your account</h2>
  <p role="status">{error?'Your session could not be checked. Reload this page to sign in again.':email?<>Signed in as <strong>{email}</strong></>:'Checking your sign-in…'}</p>
  <p className="muted">Cloudflare Access permits only gbao.n.vo@gmail.com. Your journal stays in this browser; signing in on another device does not sync your entries.</p>
  <a className="button secondary" href="/cdn-cgi/access/logout">Sign out</a>
  <p className="muted">Signing out ends access to the website. It does not erase entries saved in this browser profile.</p>
 </section>;
}
