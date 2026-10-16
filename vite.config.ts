import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';

// Installable on iPhone from Safari (Share → Add to Home Screen): a manifest for the icon and full-screen launch,
// and a service worker that caches the whole app so it opens instantly and works offline. Data stays in IndexedDB.
export default defineConfig({plugins:[react(),VitePWA({
 registerType:'autoUpdate',
 injectRegister:null,
 includeAssets:['favicon.svg','icons/apple-touch-icon.png'],
 manifest:{
  id:'/',
  name:'Project Reboot',
  short_name:'Reboot',
  description:'Your personal system for discipline, reflection, and the uneven work of growth.',
  start_url:'/#Today',
  scope:'/',
  display:'standalone',
  orientation:'portrait',
  background_color:'#edf1f7',
  theme_color:'#172c49',
  icons:[
   {src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},
   {src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},
   {src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
  ],
 },
 workbox:{
  globPatterns:['**/*.{js,css,html,svg,webp,png,woff2}'],
  // The handwritten-board reference images load on demand rather than taking space offline.
  globIgnores:['reference/**'],
  maximumFileSizeToCacheInBytes:4*1024*1024,
  navigateFallback:'/index.html',
  // Account checks and Cloudflare Access sign-in always go to the network.
  navigateFallbackDenylist:[/^\/api\//,/^\/cdn-cgi\//],
  cleanupOutdatedCaches:true,
 },
})]});
