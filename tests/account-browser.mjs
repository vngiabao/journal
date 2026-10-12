// Tests this app locally under its production hostname, with a mocked identity endpoint.
// Does not contact the deployed site or read any real browser profile.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
let badIdentity=false;
await context.route('https://journal.gbaonvo.com/**',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname==='/api/account')return route.fulfill({json:{email:badIdentity?'someone@gmail.com':'gbao.n.vo@gmail.com',provider:'Cloudflare Access',storage:'browser'}});
 const response=await fetch(`http://127.0.0.1:5174${url.pathname}${url.search}`);
 return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('https://journal.gbaonvo.com/#Settings');
await page.getByText('Signed in as',{exact:false}).waitFor();
assert.match(await page.locator('main').innerText(),/gbao\.n\.vo@gmail\.com/);
assert.equal(await page.getByRole('link',{name:'Sign out',exact:true}).getAttribute('href'),'/cdn-cgi/access/logout');
await page.screenshot({path:'test-results/account-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
await page.locator('.sidebar').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
await page.screenshot({path:'test-results/account-mobile.png',fullPage:true});
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
badIdentity=true;await page.reload();
await page.getByText('Your session could not be checked. Reload this page to sign in again.').waitFor();
await page.goto('https://journal.gbaonvo.com/#%invalid');
await page.getByRole('heading',{level:1,name:/^(Good|Still)/}).waitFor();
await page.goto('https://journal.gbaonvo.com/#Journal');
await page.getByRole('link',{name:'Skip to content'}).focus();
await page.keyboard.press('Enter');
await page.getByRole('textbox',{name:'Journal entry',exact:true}).waitFor();
assert.deepEqual(errors,[]);
await browser.close();console.log('PASS: account display, sign-out target, identity error, mobile layout, malformed hash and skip navigation. Identity was mocked locally.');
