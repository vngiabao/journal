import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin='https://journal.gbaonvo.com';
const builtAssets=await fs.readdir('dist/assets');
const assets=builtAssets.filter(n=>/\.(js|css)$/.test(n));
const font=builtAssets.find(n=>n.endsWith('.woff2'));
const art=await fs.readdir('dist/art');
const paths=['/','/api/account','/api/sync','/api/sync/photos/'+'0'.repeat(64),'/reference/may-2026-board.png','/reference/growth.png',...(font?[`/assets/${font}`]:[]),...art.map(n=>`/art/${n}`),...assets.map(n=>`/assets/${n}`)];
for(const path of paths){
 const response=await fetch(origin+path,{redirect:'manual',headers:{'Cf-Access-Authenticated-User-Email':'gbao.n.vo@gmail.com','Cf-Access-Jwt-Assertion':'forged'}});
 assert.equal(response.status,302,`${path} must require sign-in`);
 assert.equal(new URL(response.headers.get('location')).hostname,'astoryapp.cloudflareaccess.com');
 console.log(`Protected: ${path}`);
}
const alternate=await fetch('https://project-reboot.gbao-n-vo.workers.dev',{redirect:'manual'});
assert(alternate.status>=400||alternate.status===302,'workers.dev must not expose the app');
console.log(`Alternate Worker URL: ${alternate.status}`);
