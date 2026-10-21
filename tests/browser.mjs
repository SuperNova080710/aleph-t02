import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { setup, snapshot, steer } from "./browser-helper.mjs";
const { browser, page, errors } = await setup({ clock: true });
const checks = [];
const ok = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
try {
  await mkdir("docs/evidence", { recursive: true });
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => {
      const box = document
        .querySelector(".game-controls")
        .getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        bottom: box.bottom,
        right: box.right,
        left: box.left,
      };
    });
    assert.equal(layout.overflow, false);
    assert.ok(layout.left >= 0 && layout.right <= width);
    if (width > 1000) assert.ok(layout.bottom <= height);
    await page.screenshot({
      path: `docs/evidence/viewport-${width}.png`,
      fullPage: true,
    });
    ok(`layout ${width}x${height}`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator("#primary").click();
  const before = await snapshot(page);
  const begin = Date.now();
  for (let i = 0; i < 10; i++)
    await page.keyboard.press(i % 2 ? "ArrowLeft" : "ArrowRight");
  const after = await snapshot(page);
  assert.equal(after.inputs - before.inputs, 10);
  assert.equal(after.x, before.x);
  assert.ok(Date.now() - begin < 1000);
  ok("10 inputs in <1s: exactly 10 movements");
  await page.clock.runFor(700);
  await page.keyboard.press("KeyP");
  const paused = await snapshot(page);
  await page.clock.runFor(5000);
  assert.deepEqual(await snapshot(page), paused);
  await page.keyboard.press("KeyP");
  await page.clock.runFor(100);
  assert.ok((await snapshot(page)).elapsed > paused.elapsed);
  ok("pause freeze and resume");
  const g1 = await snapshot(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  assert.deepEqual(await snapshot(page), g1);
  await page.keyboard.press("ArrowRight");
  assert.equal((await snapshot(page)).inputs, g1.inputs + 1);
  ok("resize preserves model and controls");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const blurred = await snapshot(page);
  assert.equal(blurred.state, "paused");
  await page.clock.runFor(1000);
  assert.deepEqual(await snapshot(page), blurred);
  await page.locator("#primary").click();
  await page.keyboard.press("ArrowLeft");
  assert.equal((await snapshot(page)).inputs, blurred.inputs + 1);
  ok("blur freezes and explicit resume works");
  await page.locator("#restart").click();
  for (let i = 0; i < 300 && (await snapshot(page)).state === "playing"; i++)
    await page.clock.runFor(100);
  if ((await snapshot(page)).state !== "lose") {
    // choose a collision by moving toward the nearest descending bug
    await page.locator("#restart").click();
    for (
      let i = 0;
      i < 300 && (await snapshot(page)).state === "playing";
      i++
    ) {
      const g = await snapshot(page);
      const b = g.bugs.at(-1);
      if (b) await page.keyboard.press(g.x < b.x ? "ArrowRight" : "ArrowLeft");
      await page.clock.runFor(100);
    }
  }
  assert.equal((await snapshot(page)).state, "lose");
  assert.match(await page.locator("#overlay-title").textContent(), /다시/);
  ok("real collision ends in failure");
  await page.locator("#reduced").check();
  assert.equal(
    await page
      .locator("#finish-effect")
      .evaluate((e) => e.classList.contains("fire")),
    false,
  );
  ok("effect disabled immediately");
  await page.locator("#primary").click();
  let fresh = await snapshot(page);
  assert.equal(fresh.inputs, 0);
  assert.equal(fresh.elapsed, 0);
  assert.equal(fresh.bugs.length, 0);
  ok("restart after failure resets round");
  let won = false;
  for (let attempt = 0; attempt < 6 && !won; attempt++) {
    await page.locator("#restart").click();
    for (
      let i = 0;
      i < 601 && (await snapshot(page)).state === "playing";
      i++
    ) {
      const d = steer(await snapshot(page));
      if (d) await page.keyboard.press(d < 0 ? "ArrowLeft" : "ArrowRight");
      await page.clock.runFor(50);
    }
    won = (await snapshot(page)).state === "win";
  }
  console.log("success trial", await snapshot(page));
  assert.ok(won);
  assert.equal((await snapshot(page)).elapsed, 30);
  ok("success at 30 seconds");
  await page.locator("#primary").click();
  fresh = await snapshot(page);
  assert.equal(fresh.elapsed, 0);
  assert.equal(fresh.score, 0);
  assert.equal(fresh.inputs, 0);
  ok("restart after success resets round");
  await page.reload();
  assert.equal(await page.locator("#best").textContent(), "30.0");
  ok("best survives reload");
  for (const raw of ["", "{bad", JSON.stringify({ version: 2, best: "99" })]) {
    await page.evaluate(
      (raw) => localStorage.setItem("bugDodger_v2", raw),
      raw,
    );
    await page.reload();
    assert.equal(await page.locator("#best").textContent(), "0.0");
    await page.locator("#primary").click();
    assert.equal((await snapshot(page)).state, "playing");
  }
  ok("empty and corrupt save recovery");
  await page.locator("#lab summary").click();
  await page
    .locator("#judgment")
    .fill("A와 R과 P를 입력해도 게임은 재시작하지 않아야 합니다.");
  const stable = await snapshot(page);
  await page.locator("#judgment").press("r");
  assert.deepEqual(await snapshot(page), stable);
  ok("typing does not trigger game shortcuts");
  await page.locator("#experiment").click();
  assert.equal((await snapshot(page)).speed, 1);
  const seed = (await snapshot(page)).seed;
  await page.locator("#restart").click();
  assert.equal((await snapshot(page)).seed, seed);
  ok("experiment restart keeps same seed and group");
  assert.deepEqual(errors, []);
  ok("zero browser errors");
  await writeFile(
    "docs/evidence/browser.json",
    JSON.stringify(
      {
        browser: browser.version(),
        checks,
        errors,
        pass: true,
        note: "Fast functional tests use Playwright clock; soak is separate real 600s run.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
