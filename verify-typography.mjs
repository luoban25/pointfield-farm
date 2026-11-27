import {chromium} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[],measurements=[];
const assert=(v,name)=>{if(!v)throw Error(name);checks.push(name);};
try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4318/');
  await page.waitForFunction(()=>window.__radar?.pointCounts.length===10);
  await page.evaluate(()=>document.fonts.ready);
  assert(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='Pointfield UI'&&f.status==='loaded')),'local variable font loads');
  for(const [label,width,height] of [['desktop',1600,1000],['compact',1280,720],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    for(let i=0;i<10;i++) {
      await page.locator(`.model-buttons [data-scene="${i}"]`).click();
      await page.waitForTimeout(100);
      const layout=await page.evaluate(()=>{
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,right:r.right};};
        const copy=document.querySelector('.hero-copy'),h=document.querySelector('h1'),description=document.querySelector('.hero-description');
        const texts=[...document.querySelectorAll('.scene-metrics strong,.component-item small,.climate-reading small')].filter(e=>e.getClientRects().length);
        const clipped=texts.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent);
        const headline=[...h.querySelectorAll('span')].map(e=>{const range=document.createRange();range.selectNodeContents(e);return range.getBoundingClientRect().right>copy.getBoundingClientRect().right+1;});
        return {overflow:document.documentElement.scrollWidth>innerWidth,oneScreen:document.documentElement.scrollHeight<=innerHeight+1,clipped,headlineOverflow:headline.some(Boolean),h:rect(h),description:rect(description),font:getComputedStyle(h).fontFamily};
      });
      measurements.push({label,scene:i,...layout});
      assert(!layout.overflow&&!layout.clipped.length&&!layout.headlineOverflow&&layout.description.y>=layout.h.b,`${label} scene ${i}: text fits and paragraphs stay separate`);
      if(label!=='mobile')assert(layout.oneScreen,`${label} scene ${i}: homepage fits viewport`);
      if([0,1,2,9].includes(i)){
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:`verification/typography-${label}-${i}.png`,fullPage:true});
      }
    }
  }
  const offline=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'}),requests=[];
  offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await offline.goto(pathToFileURL(`${process.cwd()}/点域-全场景-双击打开.html`).href);
  await offline.waitForFunction(()=>window.__radar);
  await offline.evaluate(()=>document.fonts.ready);
  assert(await offline.evaluate(()=>[...document.fonts].some(f=>f.family==='Pointfield UI'&&f.status==='loaded')),'offline HTML embeds and loads the same font');
  assert(requests.length===0,'offline typography makes no external requests');
  assert(errors.length===0,'no browser or shader errors');
  await fs.writeFile('verification/typography-results.json',JSON.stringify({checks,errors,measurements},null,2));
  console.log(JSON.stringify({checks:checks.length,errors}));
}finally{await browser.close();}
