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
 *
 * Every failed group is printed as `failedGroups: …` and fails the run
 * (C+ SPEC §I.1, S1q).
 *
 * New C+ groups (§D.4, §G.1, §I.1; on at S9 through qa/cplus-stage.mts),
 * asserted whatever capture filter is given:
 *   sticky           at 1440 the why-us row 1 (`#why-us article`) and the
 *                    first Kourtaliotis place break (`[data-band="place"]`)
 *                    are scrolled to 50 % of their plate height; the sticky
 *                    text must sit at masthead + 20vh (± 2 px) and at
 *                    masthead + 2.5rem (± 2 px). A hidden-overflow ancestor
 *                    fails it as "sticky top drifts".
 *   Fitzroy touch    in `hasTouch` contexts at 1180 x 820 and 390 x 844 the
 *                    fine-pointer query must not match; every
 *                    `ul[data-journeys] > li` is as wide as the list (± 1),
 *                    each plate's edges follow the §D.4 default-branch table
 *                    (± 1), each entry has one img, nothing overflows.
 *   reduced preview  reduced motion, 1440: 200 ms after hovering menu item 2
 *                    the visible preview is at opacity 1 with no transform
 *                    on it or any ancestor inside the dialog.
 */
import { chromium, type Browser, type Page } from "playwright";
import fs from "node:fs/promises";
import { cplusS9, cplusS9Line } from "./cplus-stage.mts";
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
const failedGroups: string[] = [];

/**
 * Scroll a section into view by SELECTOR, not by page percentage.
 *
 * Fixed percentages silently stopped pointing at the thing they were meant to
 * capture the moment the page grew — a stacked scene added three viewports and
 * every rung landed somewhere else. Targeting the element means a layout change
 * can never quietly invalidate a capture again.
 */
async function shotAt(
  page: Page,
  selector: string,
  name: string,
  { offset = 0, settle = 1100 }: { offset?: number; settle?: number } = {},
) {
  const found = await page.evaluate(
    ({ sel, off }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const y = window.scrollY + el.getBoundingClientRect().top + off;
      const lenis = (
        window as unknown as { __lenis?: { scrollTo: (v: number, o?: object) => void } }
      ).__lenis;
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
      return true;
    },
    { sel: selector, off: offset },
  );

  if (!found) {
    console.log(`  ! ${name} — selector not found: ${selector}`);
    failedGroups.push(`${name} (missing ${selector})`);
    return;
  }
  await page.waitForTimeout(settle);
  await shot(page, name);
}

/** One capture group must never take down the rest of the run. */
async function group(label: string, fn: () => Promise<void>) {
  console.log(`
${label}`);
  try {
    await fn();
  } catch (err) {
    const msg = (err as Error).message.split(/\r?\n/)[0];
    console.log(`  ! GROUP FAILED: ${label} — ${msg}`);
    failedGroups.push(`${label}: ${msg}`);
  }
}

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
    // The 404 page is captured on purpose, and asking a server for a route
    // that does not exist logs a console error by definition. Counting it
    // made this script exit 1 on every clean run, which is the fastest way to
    // teach a reader to ignore its exit code.
    const expected404 =
      route.includes("this-route-does-not-exist") && m.text().includes("404");
    if (m.type() === "error" && !expected404)
      allErrors.push(`[${route}] ${m.text()}`);
  });
  page.on("pageerror", (e) => allErrors.push(`[${route}] ${String(e)}`));

  // NOT networkidle: the dev server holds an HMR websocket open, so "no
  // network activity" never happens and the wait hangs forever.
  // NOT "load" either: /contact embeds a third-party form whose iframe can
  // stall for minutes, and waiting on it once aborted an entire run.
  await page.goto(`${BASE}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await settleLoad(page);
  return { context, page };
}

/* ------------------------------------------------ C+ S9 groups (§I.1) */

const STICKY_TOLERANCE_PX = 2;
const EDGE_TOLERANCE_PX = 1;

/**
 * Scroll `row` so that it has moved 50 % of its plate's height past the
 * point where its sticky text first sticks, then read where that text is.
 */
async function stickyAt(
  page: Page,
  rowSelector: string,
  label: string,
  expectedTop: (masthead: number, vh: number, rem: number) => number,
  expectedName: string,
) {
  const before = await page.evaluate((sel) => {
    const row = document.querySelector(sel);
    if (!row) return { found: false } as const;
    const sticky = [row, ...row.querySelectorAll("*")].find((el) => getComputedStyle(el).position === "sticky");
    const img = row.querySelector("img");
    const header = document.querySelector("header[data-site-chrome]");
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return {
      found: true,
      sticky: !!sticky,
      stickyTag: sticky ? `${sticky.tagName.toLowerCase()}.${String(sticky.className).slice(0, 30)}` : "",
      declaredTop: sticky ? parseFloat(getComputedStyle(sticky).top) : NaN,
      rowTop: window.scrollY + row.getBoundingClientRect().top,
      plateH: img ? img.getBoundingClientRect().height : 0,
      masthead: header ? header.getBoundingClientRect().height : 0,
      vh: window.innerHeight,
      rem,
    } as const;
  }, rowSelector);

  if (!before.found) {
    failedGroups.push(`sticky: ${label} missing (${rowSelector})`);
    return;
  }
  if (!before.sticky) {
    failedGroups.push(`sticky: no position: sticky element in ${label}`);
    return;
  }
  if (!(before.plateH > 0)) {
    failedGroups.push(`sticky: ${label} has no plate to measure against`);
    return;
  }
  const expected = expectedTop(before.masthead, before.vh, before.rem);
  console.log(
    `  sticky ${label}: ${before.stickyTag} declared top ${before.declaredTop}px, expected ${expectedName} = ${expected.toFixed(1)}px`,
  );
  if (Math.abs(before.declaredTop - expected) > STICKY_TOLERANCE_PX) {
    failedGroups.push(
      `sticky top drifts: ${label} declares top ${before.declaredTop}px, expected ${expectedName} = ${expected.toFixed(1)} ± ${STICKY_TOLERANCE_PX}`,
    );
  }

  const stickAt = Number.isFinite(before.declaredTop) ? before.declaredTop : expected;
  await scrollTo(page, before.rowTop + before.plateH * 0.5 - stickAt, 900);
  const after = await page.evaluate((sel) => {
    const row = document.querySelector(sel)!;
    const sticky = [row, ...row.querySelectorAll("*")].find((el) => getComputedStyle(el).position === "sticky")!;
    const clipping: string[] = [];
    for (let n = sticky.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (!["visible", "clip"].includes(cs.overflowX) || !["visible", "clip"].includes(cs.overflowY)) {
        clipping.push(`${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ""} (overflow ${cs.overflowX} ${cs.overflowY})`);
      }
    }
    return {
      top: sticky.getBoundingClientRect().top,
      rowTop: row.getBoundingClientRect().top,
      clipping,
    };
  }, rowSelector);
  const drift = after.top - expected;
  console.log(
    `  sticky ${label} at 50 % of its plate: text top ${after.top.toFixed(1)}px (row top ${after.rowTop.toFixed(1)}px), drift ${drift.toFixed(1)}px`,
  );
  if (Math.abs(drift) > STICKY_TOLERANCE_PX) {
    failedGroups.push(
      `sticky top drifts: ${label} text top ${after.top.toFixed(1)} vs ${expectedName} ${expected.toFixed(1)} ± ${STICKY_TOLERANCE_PX}` +
        (after.clipping.length ? ` (scroll container above it: ${after.clipping.join(", ")})` : ""),
    );
  }
  await shot(page, `sticky-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`);
}

async function stickyGroups(browser: Browser) {
  await group("C+ sticky — desktop", async () => {
    {
      const { context, page } = await openPage(browser, ROUTES.home, DESKTOP);
      await stickyAt(page, "#why-us article", "why-us row 1", (m, vh) => m + 0.2 * vh, "masthead + 20vh");
      await context.close();
    }
    {
      const { context, page } = await openPage(browser, ROUTES.kourtaliotis, DESKTOP);
      await stickyAt(page, '[data-band="place"]', "place break 1", (m, _vh, rem) => m + 2.5 * rem, "masthead + 2.5rem");
      await context.close();
    }
  });
}

async function fitzroyTouchGroups(browser: Browser) {
  for (const viewport of [
    { width: 1180, height: 820 },
    { width: 390, height: 844 },
  ]) {
    const tag = `hasTouch ${viewport.width}`;
    await group(`C+ Fitzroy index — ${tag}`, async () => {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: viewport.width < 768,
      });
      try {
        const page = await context.newPage();
        page.on("pageerror", (e) => allErrors.push(`[${ROUTES.home} ${tag}] ${String(e)}`));
        await page.goto(`${BASE}${ROUTES.home}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await settleLoad(page);
        const r = await page.evaluate((tol) => {
          const fine = matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches;
          const ul = document.querySelector("ul[data-journeys]");
          if (!ul) return { fine, found: false } as const;
          const cs = getComputedStyle(ul);
          const tracks = [...cs.gridTemplateColumns.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((m) => parseFloat(m[1]));
          const gap = parseFloat(cs.columnGap) || 0;
          const box = ul.getBoundingClientRect();
          const x0 = box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
          const start = (k: number) => x0 + tracks.slice(0, k).reduce((a, b) => a + b, 0) + k * gap;
          const end = (k: number) => start(k) + tracks[k];
          const cols = tracks.length - 2;
          const fullStart = start(0);
          const fullEnd = end(tracks.length - 1);
          const col = (j: number) => ({ start: start(j), end: end(j) });
          const expected = (n: number): [number, number, string] => {
            const r = n % 3;
            if (cols >= 12) {
              if (r === 1) return [fullStart, col(5).end, "full-start / col 6"];
              if (r === 2) return [col(6).start, fullEnd, "col 6 / full-end"];
              return [fullStart, col(8).end, "full-start / col 9"];
            }
            if (cols >= 8) {
              if (r === 1) return [fullStart, col(5).end, "full-start / col 6"];
              if (r === 2) return [col(3).start, fullEnd, "col 3 / full-end"];
              return [fullStart, col(6).end, "full-start / col 7"];
            }
            if (r === 1) return [fullStart, fullEnd, "full-start / full-end"];
            if (r === 2) return [col(2).start, fullEnd, "col 2 / full-end"];
            return [fullStart, col(3).end, "full-start / col 4"];
          };
          const entries = [...ul.children].filter((c) => c.tagName === "LI");
          const problems: string[] = [];
          entries.forEach((li, i) => {
            const n = i + 1;
            const lb = li.getBoundingClientRect();
            if (lb.width < box.width - tol) problems.push(`entry width < ul width: entry ${n} is ${lb.width.toFixed(1)} px, ul ${box.width.toFixed(1)} px`);
            const imgs = li.querySelectorAll("img").length;
            if (imgs !== 1) problems.push(`entry ${n} has ${imgs} img (one per journey expected)`);
            const plate = [...li.children].find((c) => c.querySelector("img")) ?? null;
            if (!plate) {
              problems.push(`entry ${n} has no plate`);
              return;
            }
            const pb = plate.getBoundingClientRect();
            const [left, right, area] = expected(n);
            if (Math.abs(pb.left - left) > tol || Math.abs(pb.right - right) > tol) {
              problems.push(
                `plate edge ≠ placement: entry ${n} plate ${pb.left.toFixed(1)}–${pb.right.toFixed(1)}, ${area} is ${left.toFixed(1)}–${right.toFixed(1)}`,
              );
            }
          });
          return {
            fine,
            found: true,
            cols,
            entries: entries.length,
            problems,
            scrollWidth: document.documentElement.scrollWidth,
            vw: Math.min(window.innerWidth, document.documentElement.clientWidth),
          } as const;
        }, EDGE_TOLERANCE_PX);

        if (r.fine) failedGroups.push(`Fitzroy touch layout (${tag}): instrument, the context still matches the fine-pointer query`);
        if (!r.found) {
          failedGroups.push(`Fitzroy touch layout (${tag}): ul[data-journeys] missing`);
          return;
        }
        console.log(`  ${tag}: ${r.entries} entries on a ${r.cols}-column grid, ${r.problems.length} problem(s), scrollWidth ${r.scrollWidth} vs ${r.vw}`);
        if (r.entries === 0) failedGroups.push(`Fitzroy touch layout (${tag}): no entries`);
        for (const p of r.problems) {
          const kind = p.match(/^([^:]+): (.*)$/);
          failedGroups.push(kind ? `Fitzroy touch layout: ${kind[1]} (${tag}): ${kind[2]}` : `Fitzroy touch layout (${tag}): ${p}`);
        }
        if (r.scrollWidth > r.vw + 1) failedGroups.push(`Fitzroy touch layout (${tag}): horizontal overflow, scrollWidth ${r.scrollWidth} vs ${r.vw}`);
        await page.evaluate(() => document.querySelector("ul[data-journeys]")?.scrollIntoView({ block: "start" }));
        await page.waitForTimeout(600);
        await shot(page, `fitzroy-touch-${viewport.width}`);
      } finally {
        await context.close();
      }
    });
  }
}

async function reducedMenuPreviewGroup(browser: Browser) {
  await group("C+ menu preview — desktop-reduced", async () => {
    const { context, page } = await openPage(browser, ROUTES.home, DESKTOP, { reducedMotion: "reduce" });
    try {
      const toggle = page.locator('button[aria-controls="overlay-menu"]');
      if (!(await toggle.count())) {
        failedGroups.push("reduced-motion menu preview: menu trigger missing");
        return;
      }
      await toggle.first().click();
      await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 5_000 });
      await page.waitForTimeout(300);
      const item = page.locator('[role="dialog"] nav a').nth(1);
      if (!(await item.count())) {
        failedGroups.push("reduced-motion menu preview: menu item 2 missing");
        return;
      }
      await item.hover();
      await page.waitForTimeout(200);
      const previews = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return [];
        return [...dialog.querySelectorAll("img")]
          .filter((img) => !img.closest("nav"))
          .map((img) => {
            const chain: Element[] = [];
            for (let n: Element | null = img; n && n !== dialog.parentElement; n = n.parentElement) chain.push(n);
            let opacity = 1;
            const transforms: string[] = [];
            for (const el of chain) {
              const cs = getComputedStyle(el);
              opacity *= parseFloat(cs.opacity);
              if (cs.transform !== "none" || (cs.scale && cs.scale !== "none") || (cs.translate && cs.translate !== "none")) {
                transforms.push(`<${el.tagName}${el.className ? `.${String(el.className).split(" ")[0]}` : ""}> ${cs.transform !== "none" ? cs.transform : `scale ${cs.scale} translate ${cs.translate}`}`);
              }
            }
            const box = img.getBoundingClientRect();
            return { opacity, transforms, visible: opacity > 0.01 && box.width > 0 && box.height > 0 };
          });
      });
      const visible = previews.filter((p) => p.visible);
      console.log(`  ${previews.length} preview img(s) in the dialog, ${visible.length} visible 200 ms after hovering item 2`);
      if (!visible.length) failedGroups.push("reduced-motion menu preview: no visible preview 200 ms after hovering item 2");
      for (const p of visible) {
        if (p.transforms.length) failedGroups.push(`reduced-motion menu preview: preview transform ≠ none: ${p.transforms.join("; ")}`);
        if (p.opacity < 0.99) failedGroups.push(`reduced-motion menu preview: preview opacity ≠ 1 (${p.opacity.toFixed(2)})`);
      }
      await shot(page, "menu-preview-desktop-reduced");
    } finally {
      await context.close();
    }
  });
}

async function run() {
  await fs.mkdir(OUT, { recursive: true });
  console.log(cplusS9Line());
  await preflight(BASE, OUT);
  const browser = await chromium.launch();

  if (cplusS9()) {
    console.log("\nC+ groups");
    await stickyGroups(browser);
    await fitzroyTouchGroups(browser);
    await reducedMenuPreviewGroup(browser);
  }

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
    const toggle = page.locator('button[aria-controls="overlay-menu"]');
    if (await toggle.count()) {
      await toggle.first().click();
      await page.waitForTimeout(700);
      await shot(page, "home-mobile-menu-open");
    }
    await context.close();
  }


  /* ------------------------------ motion patterns, targeted by selector */
  for (const [device, vp] of [["desktop", DESKTOP], ["mobile", MOBILE]] as const) {
    for (const motion of ["normal", "reduce"] as const) {
      const tag = motion === "reduce" ? `${device}-reduced` : device;
      await group(`motion patterns — ${tag}`, async () => {
        const { context, page } = await openPage(browser, ROUTES.home, vp, {
          reducedMotion: motion === "reduce" ? "reduce" : "no-preference",
        });

        // Marquee: framed so the band fills the shot.
        await shotAt(page, "[data-marquee]", `pattern-marquee-${tag}`, {
          offset: -(vp.height / 2) + 90,
        });

        // Stacked panels: a short filmstrip through the hold so the
        // statement change and the ledger advance are both visible.
        const stacked = await page.evaluate(() => {
          const el = document.querySelector("[data-stacked]");
          if (!el) return null;
          return {
            top: window.scrollY + el.getBoundingClientRect().top,
            height: (el as HTMLElement).offsetHeight,
          };
        });

        if (!stacked) {
          failedGroups.push(`stacked scene missing (${tag})`);
        } else {
          const frames = motion === "reduce" ? 2 : 6;
          for (let i = 0; i < frames; i++) {
            await scrollTo(page, stacked.top + (stacked.height * i) / frames, 900);
            await shot(page, `pattern-stacked-${tag}-${String(i).padStart(2, "0")}`);
          }
        }

        await context.close();
      });
    }
  }

  /* ------------------------------- overlay menu: open + close, both tones */
  for (const [device, vp] of [["desktop", DESKTOP], ["mobile", MOBILE]] as const) {
    for (const motion of ["normal", "reduce"] as const) {
      const tag = motion === "reduce" ? `${device}-reduced` : device;
      await group(`overlay menu — ${tag}`, async () => {
        const { context, page } = await openPage(browser, ROUTES.home, vp, {
          reducedMotion: motion === "reduce" ? "reduce" : "no-preference",
        });
        const toggle = page.locator('button[aria-controls="overlay-menu"]');
        if (!(await toggle.count())) {
          failedGroups.push(`menu trigger missing (${tag})`);
          await context.close();
          return;
        }

        // Opening filmstrip: the stagger is the point.
        await toggle.first().click();
        for (const [i, wait] of [140, 200, 260, 700].entries()) {
          await page.waitForTimeout(wait);
          await shot(page, `menu-open-${tag}-${String(i).padStart(2, "0")}`);
        }

        // Hover a link so the preview is exercised (desktop only).
        if (device === "desktop" && motion === "normal") {
          const link = page.locator('[role="dialog"] nav a').first();
          if (await link.count()) {
            await link.hover();
            await page.waitForTimeout(1100);
            await shot(page, `menu-preview-${tag}`);
          }
        }

        // ESC closes.
        await page.keyboard.press("Escape");
        await page.waitForTimeout(700);
        await shot(page, `menu-closed-${tag}`);
        await context.close();
      });
    }
  }

  /* Nav inversion over a LIGHT hero has no route to prove it against right
     now: the direction drafts that carried the only light hero are gone, and
     no real page has one yet. Proof lives in git at d282948; this group
     returns when the restructure gives a real page a light hero. */

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
  let failed = false;
  if (allErrors.length) {
    console.log(`\n! ${allErrors.length} console error(s):`);
    [...new Set(allErrors)].slice(0, 20).forEach((e) => console.log(`   ${e.slice(0, 240)}`));
    failed = true;
  } else {
    console.log("no console errors");
  }
  /* A group that failed used to be pushed here and never read: a missing
     [data-stacked] scene or menu trigger, or a group that threw, still ended
     in exit 0 (SPEC §I.1, visual-check row). Every entry is printed, and any
     entry fails the run. */
  if (reportFailedGroups()) failed = true;
  else console.log("no failed groups");
  if (failed) {
    console.log("\nVISUAL CHECK FAILED");
    process.exitCode = 1;
  } else {
    console.log("\nVISUAL CHECK OK");
  }
}

function reportFailedGroups(): boolean {
  if (!failedGroups.length) return false;
  console.log(`\n! ${failedGroups.length} failed group(s):`);
  for (const g of failedGroups) console.log(`   failedGroups: ${g}`);
  return true;
}

run().catch((err) => {
  console.error(err);
  // Groups that failed before the crash are still reported.
  reportFailedGroups();
  console.log("\nVISUAL CHECK FAILED");
  process.exit(1);
});
