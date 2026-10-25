import {useSyncExternalStore} from 'react';
import {syncStatus,subscribeSync,enableSync,pauseSync,syncNow,resolveSync,recoveryBackup} from './sync';
import {download} from './storage';
export function CloudStatus(){const s=useSyncExternalStore(subscribeSync,syncStatus);if(location.hostname!=='journal.gbaonvo.com')return null;return <span className="sidebar-status" role="status">{s.phase==='off'?'Cloud sync off':s.phase==='synced'?'Cloud synced':s.phase==='syncing'?'Syncing…':s.phase==='offline'?'Offline · saved here':s.phase==='conflict'?'Sync needs review':'Sync needs attention'}</span>;}
export function CloudSync(){
 const s=useSyncExternalStore(subscribeSync,syncStatus);if(location.hostname!=='journal.gbaonvo.com')return null;
 const backup=async()=>{const data=await recoveryBackup();if(data)download('reboot-sync-recovery.json',JSON.stringify(data,null,2),'application/json');};
 return <section className="settings-section"><h2>Across your devices</h2>
  <p role="status">{s.message}</p>
  <p>Your journal, board, plans, training and photos sync privately through the shared Shiori project. Changes save here first and retry when you reconnect. Your first upload keeps a backup on this device.</p>
  {s.lastSync&&<p className="muted">Last successful sync: {new Date(s.lastSync).toLocaleString()}</p>}
  <div className="settings-actions">
   {s.phase==='off'?<button className="button" onClick={()=>void enableSync()}>Enable sync for this device</button>:s.phase!=='conflict'&&<><button className="button" disabled={s.phase==='syncing'} onClick={()=>void syncNow()}>Sync now</button><button className="button secondary" disabled={s.phase==='syncing'} onClick={()=>void pauseSync()}>Pause on this device</button></>}
   <button className="text-button" onClick={()=>void backup()}>Download recovery copies</button>
  </div>
  {s.phase==='conflict'&&<div className="restore-preview"><h3>Choose the copy to keep</h3><p>Download both copies first. Choosing a copy replaces the conflicting state; a recovery copy remains on this device. Other devices will merge their next changes against the chosen version.</p><div className="settings-actions"><button className="button secondary" onClick={()=>void resolveSync('local')}>Keep this device’s copy</button><button className="button secondary" onClick={()=>void resolveSync('cloud')}>Use the cloud copy</button></div></div>}
  <p className="muted">Cloudflare still allows only gbao.n.vo@gmail.com. Pausing or signing out does not erase local or cloud data. A reset or backup restore while sync is enabled will sync to your other devices.</p>
 </section>;
}
