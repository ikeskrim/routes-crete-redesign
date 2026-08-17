/**
 * Overlay menu filmstrips for the client digest.
 *
 * The menu is a motion piece, so a single "open" frame says nothing about how
 * it arrives. Each strip samples the same open gesture at fixed offsets from
 * the click, so the stagger is legible as a sequence rather than described in
 * prose.
 *
 * Captured:
 *   desktop-dark      1440, over the dark home hero — closed -> open
 *   desktop-light     1440, over a light page top — closed -> open
 *   desktop-hover     1440, the per-item preview arriving on hover
 *   mobile            390,  the same gesture on a phone
 *   reduced-motion    1440, prefers-reduced-motion: a plain fade, no stagger
 *
 *   node qa/menu-shots.mts
 */
import { chromium, type Browser } from "playwright";
import fs from "node:fs";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const OUT = "qa/screenshots/menu";

const TRIGGER = 'header button[aria-controls="overlay-menu"]';

/** Offsets from the click, in ms — the stagger runs ~0.08 + 7*0.055 + 0.8s. */
const FRAMES = [0, 120, 260, 420, 700, 1100];

fs.mkdirSync(OUT, { recursive: true });

async function strip(
  browser: Browser,
  name: string,
  {
    route,
    width,
    height,
    reduced = false,
    hover = false,
  }: { route: string; width: number; height: number; reduced?: boolean; hover?: boolean },
) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  // Let the hero settle so the bar's tone has resolved before we shoot.
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${OUT}/${name}-00-closed.png` });

  /* Fire the click without awaiting it so the frames land *during* the
   * transition, and label every frame with the time it was ACTUALLY taken.
   *
   * A screenshot is not free — each one costs 150-300ms on a 1440x900 page,
   * and the animation keeps running while it is being encoded. Naming frames
   * after their intended offset produced a strip whose "260ms" frame was
   * really taken near a second in, with the stagger already finished. A
   * filmstrip that misreports its own timebase is worse than no filmstrip. */
  const t0 = Date.now();
  const click = page.click(TRIGGER);
  const taken: number[] = [];
  for (const at of FRAMES) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const stamp = Date.now() - t0;
    await page.screenshot({ path: `${OUT}/${name}-t${String(stamp).padStart(4, "0")}ms.png` });
    taken.push(stamp);
  }
  await click;
  console.log(`    frames at ${taken.map((t) => `${t}ms`).join(", ")} (measured, not nominal)`);

  if (hover) {
    // The per-item preview is the menu's one piece of photography — show it
    // arriving, and show a second item to prove they differ.
    const items = page.locator('[role="dialog"] nav ul li');
    for (const i of [1, 4]) {
      await items.nth(i).hover();
      await page.waitForTimeout(1100);
      const label = (await items.nth(i).innerText()).replace(/\s+/g, " ").trim().slice(0, 20);
      await page.screenshot({ path: `${OUT}/${name}-hover-${i}.png` });
      console.log(`    hover ${i} — ${label}`);
    }
  }

  console.log(`  ${name.padEnd(16)} ${width}x${height}${reduced ? "  (reduced motion)" : ""}`);
  await ctx.close();
}

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();

await strip(browser, "desktop-dark", { route: "/", width: 1440, height: 900, hover: true });
await strip(browser, "desktop-light", { route: "/experiences", width: 1440, height: 900 });
await strip(browser, "mobile", { route: "/", width: 390, height: 844 });
await strip(browser, "reduced-motion", { route: "/", width: 1440, height: 900, reduced: true });

await browser.close();

const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".png"));
console.log(`\n${files.length} frames written to ${OUT}/`);
