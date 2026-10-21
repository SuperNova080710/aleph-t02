import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { setup, snapshot, steer } from "./browser-helper.mjs";
const { browser, page, errors } = await setup();
let inputs = 0,
  restarts = 0;
const begin = Date.now();
try {
  await page.locator("#primary").click();
  while (Date.now() - begin < 600000) {
    const g = await snapshot(page);
    if (g.state === "win" || g.state === "lose") {
      await page.locator("#primary").click();
      restarts++;
    } else if (g.state === "paused") await page.locator("#primary").click();
    else {
      const direction = steer(g);
      if (direction) {
        await page.keyboard.press(direction < 0 ? "ArrowLeft" : "ArrowRight");
        inputs++;
      }
    }
    await page.waitForTimeout(100);
  }
  await page.locator("#restart").click();
  await page.keyboard.press("ArrowRight");
  const g = await snapshot(page);
  assert.equal(g.inputs, 1);
  assert.equal(g.state, "playing");
  assert.equal(errors.length, 0);
  const report = {
    test: "real-wall-clock-browser-soak",
    durationMs: Date.now() - begin,
    browser: browser.version(),
    viewport: { width: 1366, height: 768 },
    restarts,
    inputs,
    errors,
    postRunInputCount: g.inputs,
    pass: true,
  };
  await writeFile("docs/evidence/soak.json", JSON.stringify(report, null, 2));
  console.log(report);
} finally {
  await browser.close();
}
