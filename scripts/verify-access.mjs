import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin='https://journal.gbaonvo.com';
const assets=(await fs.readdir('dist/assets')).filter(n=>/\.(js|css)$/.test(n));
const paths=['/','/api/account','/reference/may-2026-board.png','/reference/growth.png','/fonts/mona-sans-latin-wdth-normal.woff2',...assets.map(n=>`/assets/${n}`)];
for(const path of paths){
 const response=await fetch(origin+path,{redirect:'manual',headers:{'Cf-Access-Authenticated-User-Email':'gbao.n.vo@gmail.com','Cf-Access-Jwt-Assertion':'forged'}});
 assert.equal(response.status,302,`${path} must require sign-in`);
 assert.equal(new URL(response.headers.get('location')).hostname,'astoryapp.cloudflareaccess.com');
 console.log(`Protected: ${path}`);
}
const alternate=await fetch('https://project-reboot.gbao-n-vo.workers.dev',{redirect:'manual'});
assert(alternate.status>=400||alternate.status===302,'workers.dev must not expose the app');
console.log(`Alternate Worker URL: ${alternate.status}`);
