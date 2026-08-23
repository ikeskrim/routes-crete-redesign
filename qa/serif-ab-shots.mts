/**
 * The serif A/B, captured under identical conditions.
 *
 * Same viewport, same wait, same scroll position, same build — the ONLY
 * difference between the two frames is the typeface on the headlines. Anything
 * else that varied would make the comparison an argument about capture
 * conditions rather than about type.
 *
 * Sans is the live homepage; serif is /serif-preview, which renders the same
 * hero and the same positioning statement with the face applied to h1/h2 only.
 *
 *   node qa/serif-ab-shots.mts
 */
import { chromium, type Page } from "playwright";
import fs from "node:fs";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const OUT = "qa/screenshots/serif-ab";
fs.mkdirSync(OUT, { recursive: true });

/** Report the face actually in use, so a frame can never be mislabelled. */
async function facesOf(page: Page) {
  return page.evaluate(() => {
    const pick = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return "(none)";
      return getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "");
    };
    return { h1: pick("h1"), h2: pick("h2"), body: pick("p") };
  });
}

const browser = await chromium.launch();
await preflight(BASE, process.cwd() + "/qa");

const variants = [
  { name: "sans", path: "/" },
  { name: "serif", path: "/serif-preview" },
];

for (const vp of [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  for (const variant of variants) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      // Motion off: a headline mid-reveal is not a typeface comparison.
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${variant.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/${vp.label}-${variant.name}-01-hero.png` });

    // The positioning statement is the second h2 on both pages, and it is the
    // longest display line on the site — the one that shows what a face does
    // to a real sentence rather than to three words.
    await page.evaluate(() => {
      document.querySelector("#positioning")?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/${vp.label}-${variant.name}-02-statement.png` });

    const faces = await facesOf(page);
    console.log(
      `  ${vp.label.padEnd(8)} ${variant.name.padEnd(6)} h1=${faces.h1.padEnd(22)} h2=${faces.h2.padEnd(22)} body=${faces.body}`,
    );
    await ctx.close();
  }
}

await browser.close();
console.log(`\nframes -> ${OUT}/  (sans = live, serif = /serif-preview, headlines only)`);
