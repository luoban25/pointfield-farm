import {chromium} from '@playwright/test';
import {morphPosition} from './src/shaders.js';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
const checks=[],errors=[];const assert=(v,name)=>{if(!v)throw Error(name);checks.push(name);};
const names=['丘陵农场','水塔水量','大棚状态','矿坑','储罐','港口','柱阵','天文台','空间站','海上风电'];
const b=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const listen=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
try{
  const reduced=await b.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});listen(reduced);await reduced.goto('http://127.0.0.1:4318/');await reduced.waitForFunction(()=>window.__radar?.pointCounts.length===10);
  assert((await reduced.evaluate(()=>window.__radar.pointCounts)).every(n=>n===180000),'all ten scenes keep the same particle budget');
  assert(await reduced.locator('.model-buttons [data-scene]').count()===10,'ten scene buttons are available in one rail');
  for(let i=0;i<10;i++){
    await reduced.locator(`.model-buttons [data-scene="${i}"]`).click();
    assert(await reduced.evaluate(()=>window.__radar.active)===i&&await reduced.locator('#scene-name').innerText()===names[i],`${names[i]} loads with matching scene identity`);
    assert(await reduced.locator('.model-buttons [aria-pressed="true"]').count()===1,`${names[i]} has one selected entry`);
    if(i>=3){assert(await reduced.locator('.component-item').count()===3,`${names[i]} has its own three-part model overview`);assert(await reduced.locator('#scan-monitor').isHidden(),`${names[i]} uses model facts without sensor readings`);}
  }
  await reduced.locator('#next-model').click();assert(await reduced.evaluate(()=>window.__radar.active)===0,'next model wraps from wind to farm');
  await reduced.evaluate(()=>window.__radar.switchScene(9));await reduced.setViewportSize({width:390,height:844});await reduced.waitForTimeout(200);
  const visible=await reduced.locator('.model-buttons').evaluate(e=>{const button=e.querySelector('[aria-pressed="true"]'),a=e.getBoundingClientRect(),r=button.getBoundingClientRect();return r.left>=a.left-1&&r.right<=a.right+1;});
  assert(visible,'selected scene stays visible when resizing to mobile');
  assert(!await reduced.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'ten-model homepage fits mobile without horizontal page overflow');
  await reduced.evaluate(()=>{window.scrollTo(0,0);window.__radar.switchScene(0);});assert(await reduced.evaluate(()=>scrollY)===0,'scene rail scrolling preserves mobile page position');
  const page=await b.newPage({viewport:{width:1600,height:1000}});listen(page);await page.goto('http://127.0.0.1:4318/');await page.waitForFunction(()=>window.__radar);
  await page.locator('.model-buttons [data-scene="9"]').click();await page.waitForFunction(()=>window.__radar.morphProgress===1);const first=await page.evaluate(()=>window.__radar.getMovingSnapshot());await page.waitForTimeout(450);const second=await page.evaluate(()=>window.__radar.getMovingSnapshot());
  assert(second.time>first.time&&Math.hypot(...second.position.map((v,i)=>v-first.position[i]))>.003,'offshore blades keep moving in the merged homepage');
  await page.locator('#pause').click();const frozen=await page.evaluate(()=>window.__radar.getMovingSnapshot());await page.waitForTimeout(350);assert(await page.evaluate(()=>window.__radar.getMovingSnapshot().time)===frozen.time,'pause freezes wind geometry');
  await page.evaluate(()=>window.__radar.config.speed=0);await page.locator('#pause').click();const time=await page.evaluate(()=>window.__radar.modelTime);await page.waitForTimeout(300);assert(await page.evaluate(()=>window.__radar.modelTime)>time,'zero scan speed still lets wind blades rotate');
  const windInterrupt=await page.evaluate(()=>{const moving=window.__radar.getMovingSnapshot(),before=window.__radar.getTransitionSnapshot(moving.index);window.__radar.switchScene(8);return {before,after:window.__radar.getTransitionSnapshot(moving.index)};});
  const expected=new Float32Array(windInterrupt.before.from.length);for(let i=0;i<windInterrupt.before.seeds.length;i++)morphPosition(windInterrupt.before.from,windInterrupt.before.to,windInterrupt.before.seeds[i],windInterrupt.before.progress,expected,i*3);
  const jump=Math.max(...expected.map((v,i)=>Math.abs(v-windInterrupt.after.from[i])));assert(jump<.00001,'switching away from animated blades preserves their current pose');
  await page.waitForFunction(()=>window.__radar.morphProgress>.35&&window.__radar.morphProgress<.75);await page.locator('.model-buttons [data-scene="6"]').click();await page.waitForFunction(()=>window.__radar.morphProgress===1);await page.locator('#settings-toggle').click();await page.locator('#speed').fill('0.32');await page.locator('#close-settings').click();const top=await page.evaluate(()=>window.__radar.scan);await page.waitForTimeout(350);const lower=await page.evaluate(()=>window.__radar.scan);
  assert(lower.vertical===1&&lower.reveal===0&&lower.height<top.height,'pillar array retains its continuous downward slice');
  await page.locator('.model-buttons [data-scene="3"]').click();await page.waitForFunction(()=>window.__radar.morphProgress===1);assert(await page.evaluate(()=>window.__radar.scan.vertical===0&&window.__radar.scan.reveal===0),'industrial radial scenes restore volumetric sweeping after pillars');
  const offline=await b.newPage({reducedMotion:'reduce'}),requests=[];listen(offline);offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await offline.goto(pathToFileURL(`${process.cwd()}/点域-全场景-双击打开.html`).href);await offline.waitForFunction(()=>window.__radar?.pointCounts.length===10);await offline.locator('.model-buttons [data-scene="9"]').click();assert(await offline.evaluate(()=>window.__radar.active===9&&window.__radar.paused)&&requests.length===0,'ten-scene standalone HTML works offline with reduced motion');
  assert(errors.length===0,'no catalog browser or shader errors');
  await fs.writeFile('verification/catalog-results.json',JSON.stringify({checks,errors,windInterruptedJump:jump},null,2));console.log(JSON.stringify({checks:checks.length,errors,windInterruptedJump:jump}));
}finally{await b.close();}
