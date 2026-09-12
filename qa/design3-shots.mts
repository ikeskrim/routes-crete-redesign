/**
 * Captures for the temporary /design-3 page — TEMPORARY, deleted with it.
 *
 * Shot from the DEPLOYED production alias, never localhost, so every frame is
 * of a build the client can open on his phone — and the build-commit is
 * written beside the frames in manifest.json, so a capture can never be
 * attributed to the wrong build.
 *
 * OWN CAPTURES ONLY. Nothing from qa/benchmark/ may ever appear here or on the
 * page: those are screenshots of someone else's site, kept for study and
 * gitignored precisely so they are never published.
 *
 * Identical for all three drafts, because the client is comparing them: the
 * same two viewports, the same settle, reduced motion on so every entrance is
 * at its end state, and the same two frames each — the first screen, and the
 * whole draft top to bottom. Each draft is also asserted noindex and marked,
 * before anything is captured.
 *
 *   node qa/design3-shots.mts
 */
import { chromium, type Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "https://routes-crete-redesign.vercel.app";
const OUT = path.join(process.cwd(), "public", "design3-assets");
const DRAFTS = ["a", "b", "c"] as const;
const VIEWPORTS = [
  { key: "desktop", viewport: { width: 1440, height: 900 }, scale: 1 },
  { key: "mobile", viewport: { width: 390, height: 844 }, scale: 2 },
] as const;

await fs.mkdir(OUT, { recursive: true });
await preflight(BASE, process.cwd() + "/qa");

let failed = 0;
const frames: { draft: string; viewport: string; kind: string; file: string }[] = [];

/* The commit every frame below is of. */
const stamps = new Set<string>();
for (const draft of DRAFTS) {
  const res = await fetch(`${BASE}/design-3/${draft}`);
  const html = await res.text();
  const commit = html.match(/name="build-commit" content="([^"]+)"/)?.[1] ?? "unknown";
  const noindex = /<meta name="robots" content="noindex, ?nofollow"/.test(html);
  const marked = html.includes("data-draft-page");
  console.log(`/design-3/${draft}: ${res.status}, build ${commit}, noindex ${noindex}, marked ${marked}`);
  if (res.status !== 200 || !noindex || !marked) failed++;
  stamps.add(commit);
}
if (stamps.size !== 1) {
  console.log(`FAIL  the three drafts report different builds: ${[...stamps].join(", ")}`);
  failed++;
}
const commit = [...stamps][0];

async function settle(page: Page) {
  try {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(1800);
}

/* Walk the page once so every in-view reveal and every lazy image has fired,
   then return to the top — a full-page frame must not capture placeholders. */
async function walk(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = await page.evaluate(() => Math.round(window.innerHeight * 0.6));
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(1200);
}

const browser = await chromium.launch();
for (const draft of DRAFTS) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: vp.viewport,
      deviceScaleFactor: vp.scale,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/design-3/${draft}`, { waitUntil: "load", timeout: 60_000 });
    await settle(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 1) {
      console.log(`FAIL  ${draft} ${vp.key}: ${overflow}px of horizontal overflow`);
      failed++;
    }

    const fold = `${draft}-${vp.key}-fold.jpg`;
    await page.screenshot({ path: path.join(OUT, fold), type: "jpeg", quality: 80 });
    frames.push({ draft, viewport: vp.key, kind: "fold", file: fold });
    console.log(`  + ${fold}`);

    await walk(page);
    const full = `${draft}-${vp.key}-full.jpg`;
    await page.screenshot({ path: path.join(OUT, full), type: "jpeg", quality: 74, fullPage: true });
    frames.push({ draft, viewport: vp.key, kind: "full", file: full });
    console.log(`  + ${full}`);

    await context.close();
  }
}
await browser.close();

await fs.writeFile(
  path.join(OUT, "manifest.json"),
  JSON.stringify({ base: BASE, commit, capturedAt: new Date().toISOString(), frames }, null, 2) + "\n",
);
console.log(`\nmanifest.json — build ${commit}, ${frames.length} frames`);

if (failed === 0) {
  console.log("DESIGN-3 CAPTURES OK");
} else {
  console.log(`DESIGN-3 CAPTURES: ${failed} failure(s)`);
  process.exitCode = 1;
}
