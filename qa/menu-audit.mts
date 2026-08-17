/**
 * Overlay menu behavioural guard.
 *
 * The fullscreen menu is the navigation on every viewport, so its failure modes
 * are not cosmetic: a broken focus trap strands keyboard users, and a scroll
 * lock that fails to *unlock* leaves the whole site frozen after a single
 * accidental tap.
 *
 * Every promise the menu makes is asserted here against a real browser:
 *
 *   1. Escape closes it
 *   2. background scroll is locked while open
 *   3. background scroll is RESTORED after close   <- the one that bites
 *   4. focus moves into the panel on open
 *   5. Tab is trapped: focus never lands on background content
 *   6. the close control is reachable by keyboard while open
 *   7. focus returns to the trigger on close
 *   8. preview photographs are not fetched until the menu is opened
 *   9. the bar reads correctly over BOTH hero tones, closed and open
 *  10. reduced motion still opens, still readable, nothing stuck invisible
 *  11. 390px: no horizontal overflow, tap targets >= 44px
 *
 *   node qa/menu-audit.mts
 */
import { chromium, type Browser, type Page } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

/** A page whose hero is dark, and one whose top is light. */
const DARK_HERO = "/";
const LIGHT_PAGE = "/experiences";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail: string) {
  if (ok) {
    passed++;
    console.log(`  ok    ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    failures.push(`${name} — ${detail}`);
    console.log(`  FAIL  ${name} — ${detail}`);
  }
}

const TRIGGER = 'header button[aria-controls="overlay-menu"]';
const PANEL = '[role="dialog"][aria-modal="true"]';

async function openMenu(page: Page) {
  await page.click(TRIGGER);
  await page.waitForSelector(PANEL, { state: "visible", timeout: 5000 });
  await page.waitForTimeout(700); // let the stagger settle
}

/** Describe whatever currently holds focus, in terms a human can read. */
const describeFocus = () =>
  ({
    tag: document.activeElement?.tagName ?? "(none)",
    text: (document.activeElement?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40),
    /** Is focus inside the modal panel, or has it escaped behind it? */
    inPanel: !!document.activeElement?.closest('[role="dialog"]'),
    inHeader: !!document.activeElement?.closest("header"),
  }) as { tag: string; text: string; inPanel: boolean; inHeader: boolean };

async function scrollAndReport(page: Page) {
  // Real wheel events: this project has already been bitten once by
  // window.scrollTo being silently ignored while a smooth-scroll library owns
  // the scroll position.
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(700);
  return page.evaluate(() => ({
    y: Math.round(window.scrollY),
    bodyOverflow: document.body.style.overflow,
  }));
}

/**
 * Does the overlay actually overlay?
 *
 * Nineteen behavioural assertions passed on a build where the panel was
 * `position: relative` — an in-flow block that added its own height to the
 * document and covered only the top 601px of an 844px phone screen. Every
 * assertion was about what the menu *did*; not one asked whether it was
 * *there*. Focus moved correctly, Escape worked, the tones were right, and a
 * quarter of the page was still showing underneath.
 */
async function auditCoverage(browser: Browser) {
  console.log("\n[coverage] the overlay actually covers the page");
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${DARK_HERO}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1500);

    // Scroll away from the top first: an in-flow panel only *looks* correct at
    // scroll 0 on a tall viewport.
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.wheel(0, 800);

    /* Wait for the scroller to actually settle before sampling. Lenis eases
       asymptotically, so a fixed pause leaves it still creeping a pixel or two
       — which reads as the menu having moved the page when it did not. Sample
       until two consecutive frames agree. */
    let settled = -1;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(200);
      const y = await page.evaluate(() => Math.round(window.scrollY));
      if (y === settled) break;
      settled = y;
    }

    const before = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      docHeight: document.documentElement.scrollHeight,
    }));

    await openMenu(page);

    const state = await page.evaluate(() => {
      const panel = document.querySelector('[role="dialog"]') as HTMLElement;
      const r = panel.getBoundingClientRect();
      const cx = Math.round(window.innerWidth / 2);
      // Hit-test the four corners plus the centre: whatever is topmost there
      // must belong to the panel.
      const probes: [number, number][] = [
        [cx, 4],
        [cx, Math.round(window.innerHeight / 2)],
        [cx, window.innerHeight - 4],
        [4, window.innerHeight - 4],
        [window.innerWidth - 4, window.innerHeight - 4],
      ];
      return {
        position: getComputedStyle(panel).position,
        rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) },
        viewport: { w: window.innerWidth, h: window.innerHeight },
        docHeight: document.documentElement.scrollHeight,
        y: Math.round(window.scrollY),
        outside: probes
          .map(([x, y]) => {
            const el = document.elementFromPoint(x, y);
            // The header legitimately sits above the panel.
            const ok = !el || panel.contains(el) || !!el.closest("header");
            return ok ? null : `(${x},${y})->${el?.tagName}.${(el?.className ?? "").toString().slice(0, 30)}`;
          })
          .filter(Boolean),
      };
    });

    check(
      `${w}x${h}: panel is position:fixed`,
      state.position === "fixed",
      `computed position "${state.position}"`,
    );
    check(
      `${w}x${h}: panel covers the whole viewport`,
      state.rect.top <= 0 && state.rect.bottom >= state.viewport.h - 1,
      `panel spans ${state.rect.top}..${state.rect.bottom} of a ${state.viewport.h}px viewport`,
    );
    check(
      `${w}x${h}: nothing behind the panel is hit-testable`,
      state.outside.length === 0,
      state.outside.length ? `page reachable at ${state.outside.join(", ")}` : "all probes hit the menu",
    );
    check(
      `${w}x${h}: opening does not grow the document`,
      state.docHeight === before.docHeight,
      `scrollHeight ${before.docHeight} -> ${state.docHeight}`,
    );
    check(
      `${w}x${h}: opening keeps the reader's place`,
      state.y === before.y,
      `scrollY ${before.y} -> ${state.y}`,
    );

    // The panel lingers for its exit fade — invisible, but it must not still
    // be swallowing clicks or focus.
    const urlBefore = page.url();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const midExit = await page.evaluate(() => {
      const panel = document.querySelector('[role="dialog"]') as HTMLElement | null;
      if (!panel) return { gone: true, inert: true, hitsPanel: false };
      const el = document.elementFromPoint(
        Math.round(window.innerWidth / 2),
        Math.round(window.innerHeight / 2),
      );
      return { gone: false, inert: panel.hasAttribute("inert"), hitsPanel: !!el && panel.contains(el) };
    });
    check(
      `${w}x${h}: the fading panel stops taking input`,
      midExit.gone || (midExit.inert && !midExit.hitsPanel),
      midExit.gone
        ? "panel already unmounted 150ms after Escape"
        : `inert=${midExit.inert}, centre still hits panel=${midExit.hitsPanel}`,
    );
    await page.waitForTimeout(600);
    check(
      `${w}x${h}: clicking mid-fade does not navigate`,
      page.url() === urlBefore,
      `url ${page.url() === urlBefore ? "unchanged" : `changed to ${page.url()}`}`,
    );

    await ctx.close();
  }
}

async function auditBackgroundHidden(browser: Browser) {
  console.log("\n[assistive tech] the page behind is hidden while open");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${DARK_HERO}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1200);
  await openMenu(page);

  const open = await page.evaluate(() => ({
    main: (document.querySelector("main") as HTMLElement | null)?.inert ?? null,
    footer: (document.querySelector("footer") as HTMLElement | null)?.inert ?? null,
    header: (document.querySelector("header") as HTMLElement | null)?.inert ?? null,
    navLabels: [...document.querySelectorAll("nav")]
      .filter((n) => !n.closest("[inert]"))
      .map((n) => n.getAttribute("aria-label")),
  }));

  check(
    "main and footer are inert while the menu is open",
    open.main === true && open.footer === true,
    `main.inert=${open.main}, footer.inert=${open.footer}`,
  );
  check(
    "the header stays live (it holds Close)",
    open.header === false,
    `header.inert=${open.header}`,
  );
  check(
    "no two exposed navigation landmarks share a name",
    new Set(open.navLabels).size === open.navLabels.length,
    `exposed nav labels: ${open.navLabels.map((l) => `"${l}"`).join(", ")}`,
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => document.querySelectorAll("[inert]").length);
  check(
    "inert is fully released after close",
    after === 0,
    `${after} element(s) still inert`,
  );

  await ctx.close();
}

async function auditBehaviour(browser: Browser) {
  console.log("\n[behaviour] escape, scroll lock, focus trap");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${DARK_HERO}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1200);

  // --- 2. locked while open -------------------------------------------------
  const beforeOpen = await page.evaluate(() => Math.round(window.scrollY));
  await openMenu(page);
  const whileOpen = await scrollAndReport(page);
  check(
    "background scroll is locked while open",
    whileOpen.y === beforeOpen,
    `scrollY ${beforeOpen} -> ${whileOpen.y} after a 1200px wheel (body.overflow="${whileOpen.bodyOverflow}")`,
  );

  // --- 4/6. focus landed inside, close control reachable --------------------
  const focusOnOpen = await page.evaluate(describeFocus);
  check(
    "focus moves into the panel on open",
    focusOnOpen.inPanel,
    `focus is on <${focusOnOpen.tag}> "${focusOnOpen.text}" (inPanel=${focusOnOpen.inPanel})`,
  );

  // Walk Tab all the way around and record every stop. A correct trap visits
  // only panel (or menu-chrome) elements and returns to where it started.
  const path: ReturnType<typeof describeFocus>[] = [];
  let reachedCloseControl = false;
  let escapedToBackground = false;
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    const where = await page.evaluate(describeFocus);
    path.push(where);
    if (where.inHeader && /close/i.test(where.text)) reachedCloseControl = true;
    if (!where.inPanel && !where.inHeader) escapedToBackground = true;
  }
  check(
    "Tab never lands on background content",
    !escapedToBackground,
    escapedToBackground
      ? `escaped to: ${path.filter((p) => !p.inPanel && !p.inHeader).map((p) => `<${p.tag}> "${p.text}"`).slice(0, 3).join(", ")}`
      : `${path.length} stops, all inside the modal or its header chrome`,
  );
  check(
    "the close control is reachable by keyboard while open",
    reachedCloseControl,
    reachedCloseControl
      ? "Tab reaches the Close button"
      : "Tab never reaches the Close button — Escape is the only way out",
  );

  // Focus can also be lost entirely (click the backdrop, return from browser
  // chrome). A trap that only fires on first/last cannot recover from that.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("Tab");
  await page.waitForTimeout(60);
  const afterBlur = await page.evaluate(describeFocus);
  check(
    "Tab recovers into the panel after focus is lost",
    afterBlur.inPanel || afterBlur.inHeader,
    `after blur + Tab, focus is on <${afterBlur.tag}> "${afterBlur.text}" (inPanel=${afterBlur.inPanel})`,
  );

  // --- 1. Escape closes -----------------------------------------------------
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const closed = await page.evaluate(() => !document.querySelector('[role="dialog"][aria-modal="true"]'));
  check("Escape closes the menu", closed, closed ? "panel unmounted" : "panel still present");

  // --- 7. focus restored ----------------------------------------------------
  const afterClose = await page.evaluate(describeFocus);
  check(
    "focus returns to the trigger on close",
    afterClose.inHeader,
    `focus is on <${afterClose.tag}> "${afterClose.text}"`,
  );

  // --- 3. THE ONE THAT BITES: scroll works again ----------------------------
  const afterCloseScroll = await scrollAndReport(page);
  check(
    "background scroll is restored after close",
    afterCloseScroll.y > beforeOpen,
    `scrollY ${beforeOpen} -> ${afterCloseScroll.y} after a 1200px wheel (body.overflow="${afterCloseScroll.bodyOverflow}")`,
  );

  // Repeated open/close must not accumulate a stuck lock either.
  for (let i = 0; i < 3; i++) {
    await openMenu(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
  }
  const overflowAfterCycles = await page.evaluate(() => document.body.style.overflow);
  check(
    "3 open/close cycles leave no stuck scroll lock",
    overflowAfterCycles !== "hidden",
    `body.style.overflow = "${overflowAfterCycles}"`,
  );

  await ctx.close();
}

async function auditLazyPreviews(browser: Browser) {
  console.log("\n[payload] preview photographs are not paid for until opened");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const imageRequests: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "image") imageRequests.push(decodeURIComponent(r.url()));
  });

  await page.goto(`${BASE}${DARK_HERO}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(2500);

  // Nav previews are the only consumer of these paths, so any request for one
  // before the menu opens is a preview loaded that nobody asked for.
  const previewPaths = await page.evaluate(async () => {
    const res = await fetch(location.href);
    const html = await res.text();
    const m = html.match(/\/images\/graded\/[a-z]\/[^"'\\\s]+\.jpg/g) ?? [];
    return [...new Set(m)];
  });

  const beforeOpen = imageRequests.length;
  await openMenu(page);
  await page.waitForTimeout(800);
  const afterOpen = imageRequests.length;

  check(
    "opening the menu costs no eager image downloads",
    afterOpen === beforeOpen,
    `${beforeOpen} image requests before open, ${afterOpen} after (previews should wait for hover)`,
  );

  /* Hover every item in turn and record the per-hover network delta.
   *
   * An earlier version of this check hovered only the FIRST item and asserted
   * that a request followed. It reported a false failure: that one preview had
   * already been fetched, so hovering it correctly produced no traffic. The
   * honest property is not "hovering causes a request" — it is "each item has
   * its own preview, and previews arrive on demand". */
  const perItem: string[] = [];
  const count = await page.locator(`${PANEL} nav ul li`).count();
  for (let i = 0; i < count; i++) {
    const before = imageRequests.length;
    await page.locator(`${PANEL} nav ul li`).nth(i).hover();
    await page.waitForTimeout(900);
    const added = imageRequests.slice(before).map((u) => (u.split("url=")[1] ?? u).split("&")[0]);
    perItem.push(added[added.length - 1] ?? "(cached)");
  }
  const distinct = new Set(perItem.filter((p) => p !== "(cached)"));
  check(
    "each menu item has its own preview, fetched on demand",
    distinct.size >= Math.max(1, count - 2),
    `${distinct.size} distinct previews fetched across ${count} items`,
  );

  console.log(`  note  ${previewPaths.length} distinct graded image paths appear in the home HTML`);
  await ctx.close();
}

/** WCAG relative luminance / contrast, so "legible" is a number not an opinion. */
function contrast(a: string, b: string) {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
    const f = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

async function auditTones(browser: Browser) {
  console.log("\n[tone] the bar reads correctly over both hero tones");
  for (const route of [DARK_HERO, LIGHT_PAGE]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1500);

    const closedState = await page.evaluate(() => {
      const h = document.querySelector("header")!;
      const link = h.querySelector("a")!;
      const hero = document.querySelector("[data-hero]") as HTMLElement | null;
      return {
        tone: hero?.dataset.heroTone ?? "(no hero)",
        headerBg: getComputedStyle(h).backgroundColor,
        wordmark: getComputedStyle(link).color,
      };
    });

    await openMenu(page);
    const openState = await page.evaluate(() => {
      const h = document.querySelector("header")!;
      const link = h.querySelector("a")!;
      const panel = document.querySelector('[role="dialog"]')!;
      return {
        wordmark: getComputedStyle(link).color,
        panelBg: getComputedStyle(panel).backgroundColor,
        triggerColor: getComputedStyle(h.querySelector("button")!).color,
      };
    });

    const ratio = contrast(openState.wordmark, openState.panelBg);
    check(
      `${route}: bar is legible over the open overlay`,
      ratio >= 4.5,
      `hero tone "${closedState.tone}"; closed wordmark ${closedState.wordmark} on ${closedState.headerBg}; open wordmark ${openState.wordmark} on panel ${openState.panelBg} = ${ratio.toFixed(2)}:1`,
    );

    const triggerRatio = contrast(openState.triggerColor, openState.panelBg);
    check(
      `${route}: menu trigger is legible while open`,
      triggerRatio >= 4.5,
      `${openState.triggerColor} on ${openState.panelBg} = ${triggerRatio.toFixed(2)}:1`,
    );

    await ctx.close();
  }
}

async function auditReducedMotion(browser: Browser) {
  console.log("\n[reduced motion] opens, readable, nothing stuck invisible");
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${DARK_HERO}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1200);
  await openMenu(page);

  const links = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[role="dialog"] nav ul li')];
    return items.map((li) => {
      const cs = getComputedStyle(li);
      return {
        label: (li.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30),
        opacity: Number(cs.opacity),
        transform: cs.transform,
      };
    });
  });

  const invisible = links.filter((l) => l.opacity < 0.99);
  check(
    "reduced motion: every menu item is fully visible",
    links.length > 0 && invisible.length === 0,
    invisible.length
      ? `${invisible.length}/${links.length} below full opacity: ${invisible.map((i) => `"${i.label}"@${i.opacity}`).join(", ")}`
      : `${links.length} items all at opacity 1`,
  );

  const untranslated = links.every((l) => l.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(l.transform));
  check(
    "reduced motion: no residual offset on menu items",
    untranslated,
    untranslated ? "all items at their final position" : `transforms: ${links.map((l) => l.transform).join(" | ")}`,
  );

  await ctx.close();
}

async function auditNarrow(browser: Browser) {
  console.log("\n[390] usable on a phone");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${DARK_HERO}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1200);
  await openMenu(page);

  const layout = await page.evaluate(() => {
    const targets = [...document.querySelectorAll('[role="dialog"] a')];
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      small: targets
        .map((a) => ({
          label: (a.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 24),
          h: Math.round(a.getBoundingClientRect().height),
        }))
        .filter((t) => t.h < 44),
      count: targets.length,
    };
  });

  check(
    "390: no horizontal overflow with the menu open",
    layout.scrollWidth <= layout.innerWidth + 1,
    `scrollWidth ${layout.scrollWidth} vs innerWidth ${layout.innerWidth}`,
  );
  check(
    "390: every menu target is at least 44px tall",
    layout.small.length === 0,
    layout.small.length
      ? `${layout.small.length}/${layout.count} too small: ${layout.small.map((s) => `"${s.label}" ${s.h}px`).join(", ")}`
      : `all ${layout.count} targets >= 44px`,
  );

  await ctx.close();
}

// ---------------------------------------------------------------------------

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();

// Each audit gets its own context so one failure cannot poison the next.
for (const [name, fn] of [
  ["coverage", auditCoverage],
  ["background hidden", auditBackgroundHidden],
  ["behaviour", auditBehaviour],
  ["lazy previews", auditLazyPreviews],
  ["tones", auditTones],
  ["reduced motion", auditReducedMotion],
  ["narrow", auditNarrow],
] as const) {
  try {
    await fn(browser);
  } catch (error) {
    failed++;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name} audit threw — ${message}`);
    console.log(`  ERROR ${name} audit threw — ${message.split("\n")[0]}`);
  }
}

await browser.close();

console.log(`\n${passed + failed} assertions, ${failed} failure(s)`);
if (failed === 0) {
  console.log("MENU AUDIT OK - the overlay menu keeps every promise it makes");
} else {
  console.log("MENU AUDIT FAILED");
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
}
