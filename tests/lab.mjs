import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {setup,snapshot} from './browser-helper.mjs';
const {browser,page,errors}=await setup({clock:true});const checks=[];
try{
 await page.locator('#lab summary').click();await page.locator('#experiment').click();
 for(let trial=0;trial<20;trial++){
  const g=await snapshot(page);assert.equal(g.speed,trial<10?1:.8);assert.equal(g.seed,20261021+(trial%10)*7919);
  // Stationary input policy deliberately exercises both successful and failed completion.
  for(let t=0;t<301&&(await snapshot(page)).state==='playing';t++)await page.clock.runFor(100);
  assert.ok(['win','lose'].includes((await snapshot(page)).state));
  const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('bugDodger_v2')).records);assert.equal(records.length,trial+1);
  if(trial<19)await page.locator('#primary').click();
 }
 checks.push('UI experiment completes all A/B seeds exactly once; 10 + 10 records');
 const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('bugDodger_v2')).records);
 assert.equal(records.filter(r=>r.group==='A').length,10);assert.equal(records.filter(r=>r.group==='B').length,10);
 assert.match(await page.locator('#comparison').textContent(),/A 1.0×: 10\/10판/);assert.match(await page.locator('#comparison').textContent(),/B 0.8×: 10\/10판/);
 await page.locator('#judgment').fill('자동 UI 검사 기록 — 학생 직접 판단이 아닙니다.');
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(exported.records.length,20);assert.equal(exported.studentJudgment,'자동 UI 검사 기록 — 학생 직접 판단이 아닙니다.');checks.push('JSON export contains all 20 records and exact judgment text');
 await page.reload();assert.match(await page.locator('#comparison').textContent(),/10\/10/);checks.push('20 records survive reload');
 await page.locator('#primary').click();assert.equal(await page.locator('#finish-effect').evaluate(e=>e.classList.contains('fire')),false);checks.push('start does not trigger terminal effect');
 for(let t=0;t<301&&(await snapshot(page)).state==='playing';t++)await page.clock.runFor(100);
 assert.equal(await page.locator('#finish-effect').evaluate(e=>e.classList.contains('fire')),true);await page.locator('#reduced').check();assert.equal(await page.locator('#finish-effect').evaluate(e=>e.classList.contains('fire')),false);checks.push('terminal effect appears only on completion and clears instantly');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('reduced')),true);checks.push('OS reduced motion is honored');
 await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}});});await page.reload();assert.match(await page.locator('#save-status').textContent(),/アクセス|접근 제한/);await page.locator('#primary').click();await page.keyboard.press('ArrowRight');assert.equal((await snapshot(page)).inputs,1);checks.push('denied localStorage still permits gameplay');
 assert.deepEqual(errors,[]);await writeFile('docs/evidence/lab.json',JSON.stringify({browser:browser.version(),checks,errors,pass:true,source:'automated-browser-UI-test-not-human-play'},null,2));console.log(checks);
}finally{await browser.close();}
