/**
 * Visual QA harness.
 *
 * Headless Chromium runs requestAnimationFrame, IntersectionObserver and
 * ScrollTrigger normally, so everything scroll-driven — Ken Burns, line masks,
 * pinned scrubbed scenes, nav state, sticky CTAs — is genuinely exercisable.
 *
 *   node qa/visual-check.mts              # everything
 *   node qa/visual-check.mts mobile hero  # only matching capture names
 *
 * Defaults to the production server on :3009 (`npm start`), which is both
 * faster and closer to what ships than the dev server.
 */
import { chromium, type Browser, type Page } from "playwright";
import fs from "node:fs/promises";
import { preflight } from "./preflight.mts";
import path from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const OUT = path.join(process.cwd(), "qa", "screenshots");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const ROUTES = {
  home: "/",
  listing: "/experiences",
  kourtaliotis: "/experiences/kourtaliotis-temple-of-nature",
  tradition: "/experiences/heart-of-cretan-tradition",
  transfers: "/transfers",
  transfer: "/transfers/private-transfers-rethymno",
  contact: "/contact",
  notFound: "/this-route-does-not-exist",
};

const filters = process.argv.slice(2).map((a) => a.toLowerCase());
const wanted = (name: string) =>
  filters.length === 0 || filters.some((f) => name.toLowerCase().includes(f));

let captured = 0;

async function shot(page: Page, name: string, fullPage = false) {
  if (!wanted(name)) return;
  try {
    await page.screenshot({
      path: path.join(OUT, `${name}.png`),
      fullPage,
      timeout: fullPage ? 120_000 : 20_000,
      animations: "allow",
    });
    captured++;
    console.log(`  + ${name}.png`);
  } catch (err) {
    console.log(`  ! ${name}.png — ${(err as Error).message.split("\n")[0]}`);
  }
}

/** Position the scroll deterministically through Lenis, then let it settle. */
async function scrollTo(page: Page, y: number, settle = 700) {
  await page.evaluate((target) => {
    const lenis = (
      window as unknown as { __lenis?: { scrollTo: (v: number, o?: object) => void } }
    ).__lenis;
    if (lenis) lenis.scrollTo(target, { immediate: true });
    else window.scrollTo(0, target);
  }, y);
  await page.waitForTimeout(settle);
}

async function scrollPct(page: Page, pct: number, viewportH: number, settle = 700) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await scrollTo(page, ((height - viewportH) * pct) / 100, settle);
}

/**
 * Wait for fonts + images near the viewport.
 *
 * Every callback returns a primitive on purpose: document.fonts.ready resolves
 * to a FontFaceSet and image load handlers resolve to Events, and returning
 * either from page.evaluate stalls forever trying to serialise it. Images far
 * below the fold are lazy and never fire load until scrolled to, so only
 * nearby ones are awaited — and even that is capped.
 */
async function settleLoad(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    return true;
  });
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    const near = [...document.querySelectorAll("img")].filter((img) => {
      if (img.complete) return false;
      const rect = img.getBoundingClientRect();
      return rect.top < window.innerHeight * 1.5 && rect.bottom > -window.innerHeight;
    });
    await Promise.race([
      Promise.all(
        near.map(
          (img) =>
            new Promise<void>((res) => {
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            }),
        ),
      ),
      new Promise<void>((res) => setTimeout(res, 6000)),
    ]);
    return true;
  });
  await page.waitForTimeout(300);
}

const allErrors: string[] = [];

async function openPage(
  browser: Browser,
  route: string,
  viewport: { width: number; height: number },
  opts: { reducedMotion?: "reduce" | "no-preference" } = {},
) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: opts.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();

  page.on("console", (m) => {
    if (m.type() === "error") allErrors.push(`[${route}] ${m.text()}`);
  });
  page.on("pageerror", (e) => allErrors.push(`[${route}] ${String(e)}`));

  // NOT networkidle: the dev server holds an HMR websocket open, so "no
  // network activity" never happens and the wait hangs forever.
  await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60_000 });
  await settleLoad(page);
  return { context, page };
}

async function run() {
  await fs.mkdir(OUT, { recursive: true });
  await preflight(BASE, OUT);
  const browser = await chromium.launch();

  /* ------------------------------------------------------ home: desktop */
  console.log("\nhome — desktop");
  {
    const { context, page } = await openPage(browser, ROUTES.home, DESKTOP);
    await shot(page, "home-desktop-01-hero-on-load");
    await shot(page, "home-desktop-nav-over-hero");
    await scrollTo(page, DESKTOP.height * 1.4);
    await shot(page, "home-desktop-nav-solid");
    for (const pct of [15, 30, 45, 60, 75, 90, 100]) {
      await scrollPct(page, pct, DESKTOP.height);
      await shot(page, `home-desktop-scroll-${String(pct).padStart(3, "0")}pct`);
    }
    await context.close();
  }

  /* -------------------------------------- home: pinned scene filmstrip */
  console.log("\nhome — pinned scene filmstrip (wheel-driven)");
  {
    const { context, page } = await openPage(browser, ROUTES.home, DESKTOP);
    const start = await page.evaluate(() => {
      const el = document.querySelector("[data-scene]");
      return el ? window.scrollY + el.getBoundingClientRect().top : null;
    });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await scrollTo(page, Math.max(0, (start ?? height * 0.35) - 200));
    await page.mouse.move(DESKTOP.width / 2, DESKTOP.height / 2);

    // Real wheel events, so these frames reflect genuine user scrolling
    // through Lenis rather than a programmatic jump.
    for (let i = 0; i < 12; i++) {
      await shot(page, `home-filmstrip-${String(i).padStart(2, "0")}`);
      await page.mouse.wheel(0, 360);
      await page.waitForTimeout(240);
    }
    await context.close();
  }

  /* ------------------------------------------------------- home: mobile */
  console.log("\nhome — mobile");
  {
    const { context, page } = await openPage(browser, ROUTES.home, MOBILE);
    await shot(page, "home-mobile-01-hero-on-load");
    for (const pct of [30, 60, 90]) {
      await scrollPct(page, pct, MOBILE.height);
      await shot(page, `home-mobile-scroll-${String(pct).padStart(3, "0")}pct`);
    }
    await scrollTo(page, 0);
    const toggle = page.locator('button[aria-controls="mobile-menu"]');
    if (await toggle.count()) {
      await toggle.first().click();
      await page.waitForTimeout(700);
      await shot(page, "home-mobile-menu-open");
    }
    await context.close();
  }

  /* ----------------------------------------------- experiences listing */
  console.log("\nlisting — /experiences");
  {
    const { context, page } = await openPage(browser, ROUTES.listing, DESKTOP);
    await shot(page, "listing-desktop-01-top");
    await scrollPct(page, 55, DESKTOP.height);
    await shot(page, "listing-desktop-02-cards");
    await context.close();
  }
  {
    const { context, page } = await openPage(browser, ROUTES.listing, MOBILE);
    await shot(page, "listing-mobile-01-top");
    await scrollPct(page, 45, MOBILE.height);
    await shot(page, "listing-mobile-02-cards");
    await context.close();
  }

  /* ------------------------------------------------------ detail pages */
  for (const [key, route] of [
    ["kourtaliotis", ROUTES.kourtaliotis],
    ["tradition", ROUTES.tradition],
    ["transfer", ROUTES.transfer],
  ] as const) {
    console.log(`\ndetail — ${key}`);
    {
      const { context, page } = await openPage(browser, route, DESKTOP);
      await shot(page, `${key}-desktop-01-hero`);
      await scrollPct(page, 12, DESKTOP.height);
      await shot(page, `${key}-desktop-02-facts-and-cta`);
      await scrollPct(page, 32, DESKTOP.height);
      await shot(page, `${key}-desktop-03-story`);
      await scrollPct(page, 62, DESKTOP.height);
      await shot(page, `${key}-desktop-04-mid`);
      await scrollPct(page, 84, DESKTOP.height);
      await shot(page, `${key}-desktop-05-gallery`);

      // Open the lightbox on the first gallery thumbnail.
      const thumb = page.locator('#gallery button[aria-label^="View image"]');
      if (await thumb.count()) {
        await thumb.first().click();
        await page.waitForTimeout(1100);
        await shot(page, `${key}-desktop-06-lightbox`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      }
      await context.close();
    }
    {
      const { context, page } = await openPage(browser, route, MOBILE);
      await shot(page, `${key}-mobile-01-hero`);
      // Scroll past the hero so the sticky request bar appears.
      await scrollPct(page, 25, MOBILE.height);
      await shot(page, `${key}-mobile-02-sticky-cta`);
      await scrollPct(page, 70, MOBILE.height);
      await shot(page, `${key}-mobile-03-gallery`);
      await context.close();
    }
  }

  /* ------------------------------------- transfers index, contact, 404 */
  console.log("\ntransfers index / contact / 404");
  {
    const { context, page } = await openPage(browser, ROUTES.transfers, DESKTOP);
    await shot(page, "transfers-desktop-01-top");
    await scrollPct(page, 40, DESKTOP.height);
    await shot(page, "transfers-desktop-02-spread");
    await context.close();
  }
  {
    const { context, page } = await openPage(browser, ROUTES.transfers, MOBILE);
    await shot(page, "transfers-mobile-01-top");
    await context.close();
  }
  {
    const { context, page } = await openPage(browser, ROUTES.contact, DESKTOP);
    await shot(page, "contact-desktop-01-channels");
    // The Monday.com iframe is third-party; give it room, then capture
    // whatever it rendered rather than failing the run.
    await scrollPct(page, 45, DESKTOP.height, 3500);
    await shot(page, "contact-desktop-02-form");
    await context.close();
  }
  {
    const { context, page } = await openPage(browser, ROUTES.contact, MOBILE);
    await shot(page, "contact-mobile-01-channels");
    await context.close();
  }
  {
    const { context, page } = await openPage(browser, ROUTES.notFound, DESKTOP);
    await shot(page, "notfound-desktop-01");
    await context.close();
  }
  {
    const { context, page } = await openPage(browser, ROUTES.notFound, MOBILE);
    await shot(page, "notfound-mobile-01");
    await context.close();
  }

  /* --------------------------------------- featured frame on the listing */
  console.log("\nfeatured frame");
  {
    const { context, page } = await openPage(browser, ROUTES.listing, DESKTOP);
    const figure = page.locator("figure").first();
    if (await figure.count()) {
      await figure.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1800);
      await shot(page, "featured-frame-desktop");
    }
    await context.close();
  }

  /* ---------------------------------------------------- reduced motion */
  console.log("\nreduced motion");
  for (const [key, route] of [
    ["home", ROUTES.home],
    ["kourtaliotis", ROUTES.kourtaliotis],
  ] as const) {
    const { context, page } = await openPage(browser, route, DESKTOP, {
      reducedMotion: "reduce",
    });
    await shot(page, `reduced-${key}-01-top`);
    await scrollPct(page, 40, DESKTOP.height);
    await shot(page, `reduced-${key}-02-mid`);
    await context.close();
  }

  await browser.close();

  console.log(`\n${captured} screenshot(s) -> qa/screenshots/`);
  if (allErrors.length) {
    console.log(`\n! ${allErrors.length} console error(s):`);
    [...new Set(allErrors)].slice(0, 20).forEach((e) => console.log(`   ${e.slice(0, 240)}`));
    process.exitCode = 1;
  } else {
    console.log("no console errors");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
