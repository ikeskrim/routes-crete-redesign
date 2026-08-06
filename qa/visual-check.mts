/**
 * Visual QA harness.
 *
 * Headless Chromium runs requestAnimationFrame, IntersectionObserver and
 * ScrollTrigger normally, so everything scroll-driven — Ken Burns, line masks,
 * pinned scrubbed scenes, nav state — is genuinely exercisable here.
 *
 *   node qa/visual-check.mts            # everything
 *   node qa/visual-check.mts hero nav   # only matching capture groups
 *
 * Requires the dev server on http://localhost:3003.
 */
import { chromium, type Browser, type Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3003";
const OUT = path.join(process.cwd(), "qa", "screenshots");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const filters = process.argv.slice(2).map((a) => a.toLowerCase());
const wanted = (name: string) =>
  filters.length === 0 || filters.some((f) => name.toLowerCase().includes(f));

let captured = 0;

async function shot(page: Page, name: string, fullPage = false) {
  if (!wanted(name)) return;
  const file = path.join(OUT, `${name}.png`);
  try {
    await page.screenshot({
      path: file,
      fullPage,
      // A full-page shot of the whole homepage is enormous; don't let one
      // slow capture stall the entire run.
      timeout: fullPage ? 120_000 : 20_000,
      animations: "allow",
    });
    captured++;
    console.log(`  ✓ ${name}.png`);
  } catch (err) {
    console.log(`  ✗ ${name}.png — ${(err as Error).message.split("\n")[0]}`);
  }
}

/** Position the scroll deterministically through Lenis, then let things settle. */
async function scrollTo(page: Page, y: number, settle = 700) {
  await page.evaluate((target) => {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (v: number, o?: object) => void } })
      .__lenis;
    if (lenis) lenis.scrollTo(target, { immediate: true });
    else window.scrollTo(0, target);
  }, y);
  await page.waitForTimeout(settle);
}

async function pageHeight(page: Page) {
  return page.evaluate(() => document.documentElement.scrollHeight);
}

/**
 * Wait for fonts + all currently-requested images before shooting.
 *
 * Every callback below returns a primitive on purpose: `document.fonts.ready`
 * resolves to a FontFaceSet and image `load` handlers resolve to Events, and
 * returning either from page.evaluate stalls forever trying to serialise them.
 */
async function settleLoad(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    return true;
  });
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    // Only images near the viewport. Lazy images further down are
    // `complete === false` and never fire `load` until scrolled to, so
    // awaiting all of them would hang. Capped as a second safety net.
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

async function openPage(browser: Browser, viewport: { width: number; height: number }, opts: { reducedMotion?: "reduce" | "no-preference" } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: opts.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();

  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  // NOT networkidle: the Next dev server holds an HMR websocket open, so
  // "no network activity" never happens and the wait hangs forever.
  await page.goto(BASE, { waitUntil: "load", timeout: 60_000 });
  await settleLoad(page);
  return { context, page, errors };
}

async function run() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const allErrors: string[] = [];

  /* ---------------------------------------------------------- desktop */
  console.log("\ndesktop 1440x900");
  {
    const { context, page, errors } = await openPage(browser, DESKTOP);

    // Hero exactly as it lands, then the whole page.
    await shot(page, "desktop-01-hero-on-load");
    await shot(page, "desktop-02-full-page", true);

    // Nav over the hero vs. after scrolling away from it.
    await shot(page, "desktop-nav-over-hero");
    await scrollTo(page, DESKTOP.height * 1.4);
    await shot(page, "desktop-nav-solid");

    // Indexed scroll positions across the whole page.
    const height = await pageHeight(page);
    const max = height - DESKTOP.height;
    for (const pct of [0, 15, 30, 45, 60, 75, 90, 100]) {
      await scrollTo(page, (max * pct) / 100);
      await shot(page, `desktop-scroll-${String(pct).padStart(3, "0")}pct`);
    }

    // Reveal mid-states: step in small increments across a band where
    // sections are entering the viewport.
    for (let i = 0; i < 4; i++) {
      await scrollTo(page, max * (0.16 + i * 0.035), 260);
      await shot(page, `desktop-reveal-mid-${i + 1}`);
    }

    allErrors.push(...errors);
    await context.close();
  }

  /* ------------------------------------------- pinned scene filmstrip */
  console.log("\nfilmstrip — pinned signature scene (wheel-driven)");
  {
    const { context, page, errors } = await openPage(browser, DESKTOP);

    // Find the pinned scene; fall back to a sensible band if absent.
    const start = await page.evaluate(() => {
      const el = document.querySelector("[data-scene]");
      if (!el) return null;
      return window.scrollY + el.getBoundingClientRect().top;
    });

    const height = await pageHeight(page);
    const from = start ?? height * 0.35;

    await scrollTo(page, Math.max(0, from - 200));
    await page.mouse.move(DESKTOP.width / 2, DESKTOP.height / 2);

    // Real wheel events, so the capture reflects genuine user scrolling
    // through Lenis rather than a programmatic jump.
    const FRAMES = 14;
    for (let i = 0; i < FRAMES; i++) {
      await shot(page, `filmstrip-${String(i).padStart(2, "0")}`);
      await page.mouse.wheel(0, 320);
      await page.waitForTimeout(240);
    }

    allErrors.push(...errors);
    await context.close();
  }

  /* ----------------------------------------------------------- mobile */
  console.log("\nmobile 390x844");
  {
    const { context, page, errors } = await openPage(browser, MOBILE);

    await shot(page, "mobile-01-hero-on-load");
    await shot(page, "mobile-02-full-page", true);

    const height = await pageHeight(page);
    const max = height - MOBILE.height;
    for (const pct of [15, 30, 45, 60, 75, 90, 100]) {
      await scrollTo(page, (max * pct) / 100);
      await shot(page, `mobile-scroll-${String(pct).padStart(3, "0")}pct`);
    }

    // Fullscreen menu.
    await scrollTo(page, 0);
    const toggle = page.locator('button[aria-controls="mobile-menu"]');
    if (await toggle.count()) {
      await toggle.first().click();
      await page.waitForTimeout(700);
      await shot(page, "mobile-03-menu-open");
    }

    allErrors.push(...errors);
    await context.close();
  }

  /* ---------------------------------------------------- reduced motion */
  console.log("\nreduced motion");
  {
    const { context, page, errors } = await openPage(browser, DESKTOP, {
      reducedMotion: "reduce",
    });
    await shot(page, "reduced-01-hero-on-load");
    await shot(page, "reduced-02-full-page", true);

    const height = await pageHeight(page);
    await scrollTo(page, (height - DESKTOP.height) * 0.5);
    await shot(page, "reduced-03-mid-page");

    allErrors.push(...errors);
    await context.close();
  }

  await browser.close();

  console.log(`\n${captured} screenshot(s) → qa/screenshots/`);
  if (allErrors.length) {
    console.log(`\n⚠ ${allErrors.length} console error(s):`);
    [...new Set(allErrors)].slice(0, 20).forEach((e) => console.log(`   ${e.slice(0, 200)}`));
    process.exitCode = 1;
  } else {
    console.log("no console errors");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
