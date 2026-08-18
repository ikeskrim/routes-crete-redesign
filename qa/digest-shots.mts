/**
 * The client digest: a walkthrough of the site as a reader meets it.
 *
 * Shot from the DEPLOYED production alias, never localhost, so every frame is
 * of a build the client can open themselves — and each frame records the
 * `build-commit` it came from, so a capture can never be attributed to the
 * wrong build.
 *
 * Three passes: desktop, 390, and reduced-motion. The reduced-motion pass is
 * not an afterthought — it is the variant a real fraction of visitors get, and
 * it should look designed rather than disabled.
 *
 *   node qa/digest-shots.mts            (against QA_BASE_URL or the alias)
 */
import { chromium, type Browser, type Page } from "playwright";
import fs from "node:fs";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "https://routes-crete-redesign.vercel.app";
const OUT = "qa/screenshots/digest";
fs.mkdirSync(OUT, { recursive: true });

const TRIGGER = 'header button[aria-controls="overlay-menu"]';

/** Scroll with real wheel events — Lenis ignores programmatic scrollTo. */
async function wheelTo(page: Page, selector: string) {
  await page.evaluate((sel) => {
    document.querySelector(sel)?.scrollIntoView({ block: "center" });
  }, selector);
  await page.waitForTimeout(1400);
}

async function walkthrough(browser: Browser, label: string, opts: {
  width: number;
  height: number;
  reduced?: boolean;
}) {
  const ctx = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    reducedMotion: opts.reduced ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  const shot = async (n: string) => {
    await page.screenshot({ path: `${OUT}/${label}-${n}.png` });
    console.log(`    ${label}-${n}.png`);
  };

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);

  const stamp = await page.evaluate(
    () =>
      document.querySelector('meta[name="build-commit"]')?.getAttribute("content") ??
      "(unstamped)",
  );
  console.log(`\n  ${label}  build-commit=${stamp}`);

  // 01 the hero, as it lands
  await shot("01-hero");

  // 02 the overlay menu, open
  await page.click(TRIGGER);
  await page.waitForTimeout(1300);
  await shot("02-menu-open");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);

  // 03 the positioning statement
  await wheelTo(page, "#positioning");
  await shot("03-positioning");

  // 04 the stacked why-us scene inside it
  await wheelTo(page, "[data-stacked]");
  await shot("04-stacked-scene");

  // 05 the journeys grid
  await wheelTo(page, "#experiences");
  await shot("05-journeys");

  // 06 the island map — and its photograph, on desktop where it exists
  const pin = page.locator('[aria-label="Kourtaliotis Gorge"]').first();
  if (await pin.count()) {
    await pin.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await shot("06-map");
    if (opts.width >= 1024) {
      const box = await pin.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1600);
        await shot("07-map-place-preview");
      }
    }
  }

  // 08 the signature scene
  await wheelTo(page, "#signature");
  await shot("08-signature");

  // 09 how it works
  await wheelTo(page, "#how-to-book");
  await shot("09-how-it-works");

  // 10 the footer as destination
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await shot("10-footer");

  await ctx.close();
  return stamp;
}

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();

const stamps: Record<string, string> = {};
stamps.desktop = await walkthrough(browser, "desktop", { width: 1440, height: 900 });
stamps.mobile = await walkthrough(browser, "mobile", { width: 390, height: 844 });
stamps.reduced = await walkthrough(browser, "reduced-motion", {
  width: 1440,
  height: 900,
  reduced: true,
});

// /credits deserves its own frame: it is the licensing promise made visible.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/credits`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/desktop-11-credits.png`, fullPage: true });
  console.log("    desktop-11-credits.png");
  await ctx.close();
}

await browser.close();

fs.writeFileSync(
  `${OUT}/_stamps.json`,
  JSON.stringify({ base: BASE, stamps, capturedAt: new Date().toISOString() }, null, 2),
);
const frames = fs.readdirSync(OUT).filter((f) => f.endsWith(".png"));
console.log(`\n${frames.length} frames -> ${OUT}/  (build ${stamps.desktop})`);
