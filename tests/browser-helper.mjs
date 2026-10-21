import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
export async function setup({
  clock = false,
  viewport = { width: 1366, height: 768 },
} = {}) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  // Test-only read access. No test globals or cheat modes are shipped in application files.
  await page.route("**/src/app.js", async (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body:
        (await readFile(new URL("../src/app.js", import.meta.url), "utf8")) +
        "\nwindow.__inspect=()=>JSON.parse(JSON.stringify(game));",
    }),
  );
  if (clock) {
    await page.clock.install({ time: new Date("2026-10-21T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-21T00:00:00Z"));
    await page.addInitScript(() => {
      crypto.getRandomValues = (array) => {
        array.fill(3);
        return array;
      };
    });
  }
  await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173");
  return { browser, page, errors };
}
export async function snapshot(page) {
  return page.evaluate(() => window.__inspect());
}
export function steer(g) {
  const threats = g.bugs
    .filter((b) => b.y > 260 && b.y < 480)
    .sort((a, b) => b.y - a.y);
  const nearest = threats[0];
  if (!nearest) return 0;
  if (g.x < nearest.x + nearest.w + 8 && g.x + 36 > nearest.x - 8) {
    const candidates = [-1, 1]
      .map((d) => {
        const x = Math.max(0, Math.min(444, g.x + d * 24));
        let risk = 0;
        for (const b of threats)
          if (x < b.x + b.w + 8 && x + 36 > b.x - 8) risk += b.y;
        return { d, risk, space: Math.abs(x - (nearest.x + 16)) };
      })
      .sort((a, b) => a.risk - b.risk || b.space - a.space);
    return candidates[0].d;
  }
  return 0;
}
