/** Direction-checkpoint captures: stills + a short scroll filmstrip per candidate. */
import { chromium, type Page } from "playwright";
import fs from "node:fs/promises";
import { preflight } from "./preflight.mts";
import path from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const OUT = path.join(process.cwd(), "qa", "direction");
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    return true;
  });
  await page.waitForTimeout(1800);
}

async function scrollTo(page: Page, y: number, wait = 900) {
  await page.evaluate((t) => {
    const l = (window as unknown as { __lenis?: { scrollTo: (v: number, o?: object) => void } }).__lenis;
    if (l) l.scrollTo(t, { immediate: true });
    else window.scrollTo(0, t);
  }, y);
  await page.waitForTimeout(wait);
}

const browser = await chromium.launch();
await fs.mkdir(OUT, { recursive: true });
await preflight(BASE, OUT);

for (const variant of ["a", "b"]) {
  for (const [device, vp] of [
    ["desktop", DESKTOP],
    ["mobile", MOBILE],
  ] as const) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/design/${variant}`, { waitUntil: "load", timeout: 60_000 });
    await settle(page);

    await page.screenshot({ path: path.join(OUT, `${variant}-${device}-01-hero.png`) });

    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const max = h - vp.height;

    if (device === "desktop") {
      // Filmstrip through the whole draft.
      const frames = 8;
      for (let i = 1; i <= frames; i++) {
        await scrollTo(page, (max * i) / (frames + 1), 700);
        await page.screenshot({
          path: path.join(OUT, `${variant}-desktop-film-${String(i).padStart(2, "0")}.png`),
        });
      }
    } else {
      for (const pct of [30, 60, 85]) {
        await scrollTo(page, (max * pct) / 100);
        await page.screenshot({
          path: path.join(OUT, `${variant}-mobile-${pct}pct.png`),
        });
      }
    }
    await ctx.close();
    console.log(`  captured ${variant} ${device}`);
  }
}

await browser.close();
console.log(`\ndirection captures -> qa/direction/`);
