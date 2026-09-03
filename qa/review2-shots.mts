/**
 * Captures for the temporary /review-2 page.
 *
 * Shot from the DEPLOYED production alias, never localhost, so every frame is
 * of a build the client can open on his phone — and the build-commit is
 * recorded beside them, so a capture can never be attributed to the wrong
 * build.
 *
 * OWN CAPTURES ONLY. Nothing from qa/benchmark/ may ever appear here or on the
 * page: those are screenshots of someone else's site, kept for study and
 * gitignored precisely so they are never published.
 *
 *   node qa/review2-shots.mts
 */
import { chromium, type Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.QA_BASE_URL ?? "https://routes-crete-redesign.vercel.app";
const OUT = path.join(process.cwd(), "public", "review2-assets");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

await fs.mkdir(OUT, { recursive: true });

const stamp = await (async () => {
  const res = await fetch(BASE);
  const html = await res.text();
  return html.match(/name="build-commit" content="([^"]+)"/)?.[1] ?? "unknown";
})();
console.log(`capturing ${BASE} — build ${stamp}\n`);

const browser = await chromium.launch();

async function settle(page: Page, ms = 2200) {
  try {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(ms);
}

/** Scroll the route section to a given fraction of its own travel. */
async function routeAt(page: Page, fraction: number) {
  const box = await page.evaluate(() => {
    const label = [...document.querySelectorAll("p")].find(
      (p) => p.textContent?.trim() === "The route",
    );
    const section = label?.closest("section");
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
  if (!box) return false;
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }),
    box.top - 700 + (box.height + 700) * fraction,
  );
  await page.waitForTimeout(1000);
  return true;
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), quality: 78, type: "jpeg" });
  console.log(`  + ${name}.jpg`);
}

/** Element shot, for the chart on its own. */
async function shotChart(page: Page, name: string) {
  const handle = await page.evaluateHandle(() => {
    const p = document.querySelector('svg path[stroke="rgb(226,190,124)"]');
    return p?.closest("div") ?? null;
  });
  const element = handle.asElement();
  if (!element) return;
  await element.screenshot({ path: path.join(OUT, `${name}.jpg`), quality: 80, type: "jpeg" });
  console.log(`  + ${name}.jpg`);
}

/* ---------------------------------------------------------------- desktop */
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  await shot(page, "site-hero");

  /* The cards, with the vivid grade. Scrolled to the GRID rather than the
     section start — the section starts with its heading, and framing on that
     captured nothing but the top edge of the first two cards. */
  await page.evaluate(() => {
    const link = document.querySelector('a[href^="/experiences/"] .card-frame');
    link?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1600);
  await shot(page, "site-cards");

  await context.close();
}

/* ------------------------------------------------------- the route, drawn */
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto(`${BASE}/experiences/kourtaliotis-temple-of-nature`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);

  const fractions = [0.12, 0.3, 0.48, 0.66, 0.85];
  for (const [i, fraction] of fractions.entries()) {
    if (await routeAt(page, fraction)) await shotChart(page, `route-film-${i}`);
  }

  // The whole section, so the ledger beside the chart is legible.
  await page.evaluate(() => {
    const label = [...document.querySelectorAll("p")].find(
      (p) => p.textContent?.trim() === "The route",
    );
    label?.closest("section")?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1600);
  const section = await page.evaluateHandle(() => {
    const label = [...document.querySelectorAll("p")].find(
      (p) => p.textContent?.trim() === "The route",
    );
    return label?.closest("section") ?? null;
  });
  const element = section.asElement();
  if (element) {
    await element.screenshot({
      path: path.join(OUT, "route-section.jpg"),
      quality: 80,
      type: "jpeg",
    });
    console.log("  + route-section.jpg");
  }

  await context.close();
}

/* ------------------------------------------------ reduced motion, and 390 */
{
  const context = await browser.newContext({ viewport: DESKTOP, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${BASE}/experiences/kourtaliotis-temple-of-nature`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);
  await routeAt(page, 0.5);
  await shotChart(page, "route-reduced-motion");
  await context.close();
}

{
  const context = await browser.newContext({ viewport: MOBILE });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  await shot(page, "mobile-hero");

  await page.goto(`${BASE}/experiences/kourtaliotis-temple-of-nature`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);
  await routeAt(page, 0.7);
  await shot(page, "mobile-route");

  await context.close();
}

/* -------------------------------------- the place bands, in the day's order */
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto(`${BASE}/experiences/kourtaliotis-temple-of-nature`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);
  const captions = [
    "The waterfall in Kourtaliotiko Gorge",
    "The river running over rock in the gorge, oleander in flower",
    "Where the river reaches the sea at Preveli",
  ];
  for (const [i, caption] of captions.entries()) {
    const found = await page.evaluate((text) => {
      const node = [...document.querySelectorAll("figcaption, p, span")].find(
        (e) => e.textContent?.trim() === text,
      );
      if (!node) return false;
      node.scrollIntoView({ block: "center" });
      return true;
    }, caption);
    if (found) {
      await page.waitForTimeout(1500);
      await shot(page, `band-${i}`);
    }
  }
  await context.close();
}

/* ------------------------------------------------- 05  the overlay menu */
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  /* The mask reveal, caught mid-flight. Screenshots take time to encode, so
     these are the reveal at four points rather than four exact milliseconds —
     the point is that each row is rising out of its own clipped box, which is
     what the frames show. */
  await page.click("button[aria-expanded]");
  for (const [i, wait] of [60, 130, 260, 900].entries()) {
    await page.waitForTimeout(i === 0 ? wait : wait - [60, 130, 260, 900][i - 1]);
    await shot(page, `menu-reveal-${i}`);
  }

  /* The drifting photograph, on its own: the panel with a link hovered so the
     backdrop and the per-item preview are both visible. */
  const link = page.locator('nav[aria-label="Menu"] a').first();
  await link.hover();
  await page.waitForTimeout(1200);
  await shot(page, "menu-hovered");

  await context.close();
}

/* --------------------------------------------- 06  the horizontal journeys */
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  const track = await page.evaluate(() => {
    const el = document.querySelector('[style*="--track-h"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height, vh: window.innerHeight };
  });

  if (track) {
    for (const [i, fraction] of [0, 0.35, 0.7, 1].entries()) {
      await page.evaluate(
        (y) => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }),
        track.top + (track.height - track.vh) * fraction,
      );
      await page.waitForTimeout(900);
      await shot(page, `journeys-pan-${i}`);
    }
  }
  await context.close();
}

{
  /* 390: the same cards as an ordinary column. The pan does not run here —
     a pinned horizontal section fights the reader's own scroll gesture. */
  const context = await browser.newContext({ viewport: MOBILE });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  await page.evaluate(() => {
    document.querySelector('a[href^="/experiences/"] .card-frame')?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1400);
  await shot(page, "journeys-mobile");
  await context.close();
}

/* --------------------------------------------------- 07  the kinetic hero */
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  /* Both extremes of the pointer, so the drift can be compared. The movement
     is deliberately about ten pixels — it is meant to be felt, not watched —
     so the measured offset is printed here and quoted in the caption rather
     than left for the eye to guess at. */
  for (const [name, x, y] of [
    ["hero-kinetic-left", 140, 240],
    ["hero-kinetic-right", 1300, 720],
  ] as const) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(1100);
    const offset = await page.evaluate(() => {
      const el = document.querySelector("h1")?.parentElement;
      return el ? getComputedStyle(el).transform : "none";
    });
    console.log(`     ${name}: ${offset}`);
    await shot(page, name);
  }
  await context.close();
}

/* ------------------------------------------------------ 08  the grain layer */
{
  const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  /* A tight crop of a flat area, captured at 3x and saved as PNG.
     The layer runs at 0.028 opacity: JPEG would quantise it away entirely and
     at actual size it is felt rather than seen, so the honest way to show it
     is magnified and losslessly. The caption says so. */
  await page.screenshot({
    path: path.join(OUT, "grain-detail.png"),
    clip: { x: 900, y: 120, width: 300, height: 190 },
  });
  console.log("  + grain-detail.png (3x, PNG — the layer is 0.028 opacity)");
  await context.close();
}

/* ------------------------------------------------ 09  the photo hunt */
{
  /* The transfers page after the hunt: still the van at the top — that is
     the product — and three Rethymno bands below where there were none.
     The "before" frames (hunt-transfers-*-before.jpg) were captured from the
     previous deployment BEFORE this build was pushed, so the pair is two
     real deployments, not a reconstruction. */
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto(`${BASE}/transfers/private-transfers-rethymno`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);
  await shot(page, "hunt-transfers-hero-after");

  const captions = [
    "The Venetian Fortezza above Rethymno",
    "A lane in the old town of Rethymno",
    "The old Venetian harbour of Rethymno, at night",
  ];
  for (const [i, caption] of captions.entries()) {
    const found = await page.evaluate((text) => {
      const node = [...document.querySelectorAll("figcaption, p, span")].find(
        (e) => e.textContent?.trim() === text,
      );
      if (!node) return false;
      node.scrollIntoView({ block: "center" });
      return true;
    }, caption);
    if (found) {
      await page.waitForTimeout(1500);
      await shot(page, `hunt-transfers-band-${i}`);
    } else {
      console.log(`  ! band caption not found: ${caption}`);
    }
  }

  /* The taste call, both ways from the SAME deployed build: the hero as it
     ships (the van) and the hero with the harbour frame put in its place by
     swapping the image source in the DOM. A substitution, and labelled as one
     on the page — it shows the composition, not a build. */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  await shot(page, "hunt-transfers-hero-current");
  await page.evaluate(() => {
    const img = [...document.querySelectorAll("img")].find((i) =>
      /mercedes-v300/.test(decodeURIComponent(i.src)),
    );
    if (img) {
      img.srcset = "";
      img.src = "/images/graded/c/sourced/rethymno-harbour-dusk.jpg";
    }
  });
  await page.waitForTimeout(2600);
  await shot(page, "hunt-transfers-hero-proposed");
  await context.close();
}

{
  const context = await browser.newContext({ viewport: MOBILE });
  const page = await context.newPage();
  await page.goto(`${BASE}/transfers/private-transfers-rethymno`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);
  await page.evaluate(() => {
    const node = [...document.querySelectorAll("figcaption, p, span")].find(
      (e) => e.textContent?.trim() === "The old Venetian harbour of Rethymno, at night",
    );
    node?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1500);
  await shot(page, "hunt-transfers-mobile");
  await context.close();
}

await browser.close();

await fs.writeFile(
  path.join(OUT, "BUILD.txt"),
  `Captured from ${BASE}\nbuild-commit ${stamp}\n${new Date().toISOString()}\n\n` +
    `Own captures only. Nothing from qa/benchmark/ appears here or on /review-2.\n`,
);
console.log(`\ncaptured from build ${stamp} -> public/review2-assets/`);
