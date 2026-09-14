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
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "https://routes-crete-redesign.vercel.app";
const OUT = path.join(process.cwd(), "public", "design3-assets");
/* "c-plus" is the C+ draft, captured beside C for the /design-3 comparison. */
const DRAFTS = ["a", "b", "c", "c-plus"] as const;
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
  console.log(`FAIL  the drafts report different builds: ${[...stamps].join(", ")}`);
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

/* The whole draft as one JPEG, captured in clipped segments and stitched.
   Chromium paints nothing past about 16,384 device px in a single capture, so
   one fullPage screenshot of a tall page at ×2 comes back blank white below
   about 8,192 CSS px (the C+ phone draft is about 13,200 CSS px, 26,400 device
   px). A segment of 8,000 CSS px stays under that limit at ×2. Every draft and
   viewport goes through this same path; a page shorter than one segment is a
   single capture. sharp is the image library next/image already installs. */
const SEGMENT = 8000;
async function fullFrame(page: Page, scale: number, file: string, quality: number) {
  const { width, height } = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  const parts: { input: Buffer; top: number; left: number }[] = [];
  let top = 0;
  for (let y = 0; y < height; y += SEGMENT) {
    const input = await page.screenshot({
      type: "png",
      fullPage: true,
      clip: { x: 0, y, width, height: Math.min(SEGMENT, height - y) },
    });
    const meta = await sharp(input).metadata();
    parts.push({ input, top, left: 0 });
    top += meta.height ?? 0;
  }
  await sharp({
    create: { width: Math.round(width * scale), height: top, channels: 3, background: "#ffffff" },
    limitInputPixels: false,
  })
    .composite(parts)
    .jpeg({ quality })
    .toFile(file);
  return { segments: parts.length, height: top, expected: Math.round(height * scale) };
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
    const shot = await fullFrame(page, vp.scale, path.join(OUT, full), 74);
    if (shot.height !== shot.expected) {
      console.log(`FAIL  ${full}: stitched ${shot.height}px of ${shot.expected}px`);
      failed++;
    }
    frames.push({ draft, viewport: vp.key, kind: "full", file: full });
    console.log(`  + ${full} (${shot.segments} segment${shot.segments === 1 ? "" : "s"}, ${shot.height}px)`);

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
