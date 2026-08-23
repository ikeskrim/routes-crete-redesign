/**
 * Benchmark reference capture.
 *
 * Captures the reference site's composition and pacing so "more like the
 * benchmark" can be checked with eyes against our own captures at the same
 * viewport and comparable scroll positions.
 *
 * REFERENCE MATERIAL ONLY. Nothing captured here ships, and no asset, markup,
 * style or copy from the reference ever enters our codebase — we study the
 * rhythm and rebuild it with our own code, photography and words.
 *
 *   node qa/benchmark-shots.mts [url]
 */
import { chromium, type Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * The reference URL is supplied at call time and deliberately not hardcoded:
 * this repository is public, and naming someone else's site as a baked-in
 * default is neither necessary nor courteous.
 *
 *   node qa/benchmark-shots.mts https://example.com/
 */
const URL = process.argv[2] ?? process.env.QA_BENCHMARK_URL;
if (!URL) {
  console.error(
    "Usage: node qa/benchmark-shots.mts <url>   (or set QA_BENCHMARK_URL)",
  );
  process.exit(1);
}
/* One folder per reference site.
 *
 * This wrote every capture to qa/benchmark/bm-desktop-NN.png regardless of
 * which site it had just visited, so capturing a SECOND reference silently
 * destroyed the first. That is exactly what happened: a Fitzroy run
 * overwrote the alethia.earth frames, and alethia was the reference the
 * stacked scene's near-black ground was judged against. Nineteen files, all
 * named as though they were the originals, none of them were.
 *
 * A capture set that can be overwritten by the next capture is not a record.
 * The host name decides the folder now, so two references cannot collide. */
// globalThis.URL, because this file's own `const URL` (the target address)
// shadows the global constructor.
const SITE = new globalThis.URL(URL).hostname
  .replace(/^www\./, "")
  .replace(/[^a-z0-9]+/gi, "-");
const OUT = path.join(process.cwd(), "qa", "benchmark", SITE);
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function settle(page: Page, ms = 2500) {
  try {
    await page.evaluate(async () => {
      await document.fonts.ready;
      return true;
    });
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(ms);
}

async function scrollTo(page: Page, y: number, wait = 1100) {
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" as ScrollBehavior }), y);
  await page.waitForTimeout(wait);
}

const browser = await chromium.launch();
await fs.mkdir(OUT, { recursive: true });

let n = 0;
for (const [device, vp] of [
  ["desktop", DESKTOP],
  ["mobile", MOBILE],
] as const) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  await page.goto(URL, { waitUntil: "load", timeout: 120_000 });
  await settle(page, 6000);

  await page.screenshot({ path: path.join(OUT, `bm-${device}-00-hero.png`) });
  n++;

  // The reference does not scroll the window: documentElement.scrollHeight
  // equals the viewport, so programmatic scrollTo moves nothing and every
  // frame comes back identical. Drive it with real wheel events, which is
  // also closer to how a visitor actually experiences the pacing.
  const nativeHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const scrolls = nativeHeight <= vp.height + 50;
  console.log(
    `  ${device}: scrollHeight ${nativeHeight} vs viewport ${vp.height} -> ${
      scrolls ? "virtual scroller, using wheel" : "native scroll"
    }`,
  );

  await page.mouse.move(vp.width / 2, vp.height / 2);

  const steps = device === "desktop" ? 14 : 8;
  for (let i = 1; i <= steps; i++) {
    // Several smaller wheel ticks per frame reads more like real scrolling
    // than one large jump, and lets scroll-linked animation keep up.
    for (let k = 0; k < 5; k++) {
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(OUT, `bm-${device}-${String(i).padStart(2, "0")}.png`),
    });
    n++;
  }

  await ctx.close();
  console.log(`captured ${device}`);
}

await browser.close();
await fs.writeFile(
  path.join(OUT, "README.md"),
  `# Benchmark reference captures

Source: ${URL}
Captured: ${new Date().toISOString()}

Reference material for composition and pacing only. **Nothing here ships.**
No asset, markup, style or copy from the reference enters this codebase; we
study the rhythm and rebuild it with our own code, photography and words.

Untracked by git.
`,
);
console.log(`\n${n} reference frames -> qa/benchmark/`);
