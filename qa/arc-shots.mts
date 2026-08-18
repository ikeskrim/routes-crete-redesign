/**
 * Before/after of the homepage arc, eight sections into six.
 *
 * Like the contrast stills, "before" is not reconstructed locally — it is
 * captured from a still-Ready pre-restructure deployment, so the comparison is
 * two shipped builds. Both URLs are stamped with their build-commit, and the
 * stamp is recorded beside every frame, so a capture can never be quietly
 * attributed to the wrong build.
 *
 *   node qa/arc-shots.mts <before-url> <after-url>
 */
import { chromium, type Browser } from "playwright";
import fs from "node:fs";

const BEFORE = process.argv[2];
const AFTER = process.argv[3];
if (!BEFORE || !AFTER) {
  console.error("Usage: node qa/arc-shots.mts <before-url> <after-url>");
  process.exit(1);
}

const OUT = "qa/screenshots/arc";
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

/** The arc as data, not just pixels: what sections exist, in order. */
async function inventory(page: import("playwright").Page) {
  return page.evaluate(() => {
    const stamp =
      document.querySelector('meta[name="build-commit"]')?.getAttribute("content") ??
      "(unstamped)";
    /* TWO different counts, both true, reported separately so the digest
       never reads them as a contradiction:
         movements  = top-level sections of <main>  (what the arc guard asserts)
         structural = movements PLUS nested scenes  (what a scroller feels)
       The stacked why-us scene is nested inside the positioning section on
       purpose, so it is structural but not a movement of its own. */
    const movements = document.querySelectorAll("main > section").length;
    const sections = [...document.querySelectorAll("main section, main [data-stacked], main [data-scene]")]
      .map((s) => {
        const heading = s.querySelector("h1, h2")?.textContent ?? "";
        return {
          id: s.id || "(none)",
          heading: heading.replace(/\s+/g, " ").trim().slice(0, 42),
        };
      })
      // The pinned scenes render an outer section and an inner frame; collapse
      // repeats so the count reflects what a reader experiences.
      .filter((s, i, all) => i === 0 || s.heading !== all[i - 1].heading || s.id !== all[i - 1].id);
    return {
      stamp,
      movements,
      sections,
      docHeightVh: Math.round(
        (document.documentElement.scrollHeight / window.innerHeight) * 100,
      ),
      images: document.querySelectorAll("main img").length,
    };
  });
}

async function shoot(browser: Browser, label: string, base: string) {
  const results: Record<string, unknown> = {};
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2500);

    // Full page, so the whole arc is legible as one column.
    await page.screenshot({
      path: `${OUT}/${label}-${vp.name}-full.png`,
      fullPage: true,
    });
    // Above the fold, for the walkthrough.
    await page.screenshot({ path: `${OUT}/${label}-${vp.name}-fold.png` });

    const inv = await inventory(page);
    results[vp.name] = inv;
    if (vp.name === "desktop") {
      console.log(`\n${label}  build-commit=${inv.stamp}  ${base}`);
      console.log(
        `  ${inv.movements} movements (${inv.sections.length} structural incl. nested scenes), ` +
          `${inv.docHeightVh}vh tall, ${inv.images} images in <main>`,
      );
      inv.sections.forEach((s, i) =>
        console.log(`   ${String(i + 1).padStart(2, "0")}  #${s.id.padEnd(14)} ${s.heading}`),
      );
    }
    await ctx.close();
  }
  return results;
}

const browser = await chromium.launch();
const before = await shoot(browser, "before", BEFORE);
const after = await shoot(browser, "after", AFTER);
await browser.close();

fs.writeFileSync(
  `${OUT}/_inventory.json`,
  JSON.stringify({ before: { url: BEFORE, ...before }, after: { url: AFTER, ...after } }, null, 2),
);
console.log(`\nframes + _inventory.json -> ${OUT}/`);
