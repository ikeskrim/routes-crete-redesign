/**
 * Overlay menu behavioural guard.
 *
 * The fullscreen menu is the navigation on every viewport, so its failure modes
 * are not cosmetic: a broken focus trap strands keyboard users, and a scroll
 * lock that fails to *unlock* leaves the whole site frozen after a single
 * accidental tap.
 *
 * Every promise the menu makes is asserted here against a real browser, at
 * 1440x900 AND at 390x844 (the menu is the navigation on both):
 *
 *   1. Escape closes it
 *   2. background scroll is locked while open — real wheel events over the
 *      header as well as over the panel
 *   3. background scroll is RESTORED after close   <- the one that bites
 *   4. focus moves into the panel on open
 *   5. Tab is trapped: focus never lands on background content
 *   6. the close control — the element that opened the menu — is reachable by
 *      keyboard while open
 *   7. focus returns to the element that opened the menu on close
 *   8. preview photographs are not fetched until the menu is opened
 *   9. the bar reads correctly over the open panel, measured on the pixels
 *      actually painted behind it
 *  10. reduced motion still opens, still readable, nothing stuck invisible
 *  11. 390px: no horizontal overflow, tap targets >= 44px (the Close included)
 *  12. a real click during the exit fade is not taken by the fading panel
 *  13. nothing is left inert, visible or focusable after close
 *
 *   node qa/menu-audit.mts            (QA_BASE_URL, default localhost:3009)
 *
 * C+ S1q instrument replacements (SPEC §I.1, §I.3). Each replaces an
 * instrument, never a property:
 *   - contrast: canvas-composite, the text-contrast.mts:115-123 method, instead
 *     of regex-parsing colour strings;
 *   - M7: a real click 150 ms after Escape, instead of no click at all;
 *   - M11: excludes only a closed, invisible, unfocusable panel from the inert
 *     count, and fails a closed panel left visible or focusable;
 *   - M15/M18: track the element that opened the menu, not "anything in the
 *     header";
 *   - M20: computed overflow of html AND body plus a wheel test, instead of
 *     body's inline style;
 *   - every per-viewport audit runs at 1440 and at 390.
 */
import { chromium, type Browser, type Page } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

/** A page whose hero is dark, and one whose top is light. */
const DARK_HERO = "/";
const LIGHT_PAGE = "/experiences";

/** The two viewports every per-viewport audit runs at. */
const VIEWPORTS = [
  [1440, 900],
  [390, 844],
] as const;
type Viewport = (typeof VIEWPORTS)[number];

/** WCAG AA for the bar's text over the open panel. Never lowered. */
const CONTRAST_FLOOR = 4.5;

/** Minimum tap target height at 390. Never lowered. */
const TARGET_MIN = 44;

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

/* A click that lands before React has hydrated the header is simply lost: the
 * server-rendered button has no handler yet, so the dialog never opens and the
 * 5 s wait below times out. On the deployment, under machine load, hydration
 * occasionally landed later than the ~1.2 s this audit used to wait. Measured
 * 2026-09-13 with interleaved A/B runs on two immutable deployments:
 *   - 8 runs a side: medians of 275 ms (36854c0) and 298 ms (2b2d00d), with
 *     one run at 1,589 ms;
 *   - 20 runs a side: medians of 380 ms and 277 ms, slowest runs 822 ms and
 *     1,006 ms.
 * No CSP violation and no error in any of the 56 opens. It was not a
 * regression: two audit runs lost the race, which says nothing about the menu
 * itself.
 *
 * So the audit waits until React has attached its props to the trigger node
 * before making its ONE click. A menu that does not open after that single
 * click is still a failure — nothing about the check is relaxed. The
 * `__reactProps$` key is a React internal; if it ever disappears, this wait
 * times out at 15 s and the audit fails loudly rather than passing quietly.
 *
 * The node that receives the click is remembered as the OPENER
 * (`window.__menuAuditOpener`). Focus-return and Close-reachability are
 * asserted against that exact element (M15/M18), not against "whatever sits
 * in the header": a menu that forgot to restore focus but left it on the
 * wordmark used to pass, because the wordmark is in the header too. */
async function openMenu(page: Page) {
  await page.waitForFunction(
    (selector) => {
      const node = document.querySelector(selector);
      return !!node && Object.keys(node).some((key) => key.startsWith("__reactProps$"));
    },
    TRIGGER,
    { timeout: 15_000 },
  );
  await page.evaluate((selector) => {
    (window as Window & { __menuAuditOpener?: Element | null }).__menuAuditOpener =
      document.querySelector(selector);
  }, TRIGGER);
  await page.click(TRIGGER);
  await page.waitForSelector(PANEL, { state: "visible", timeout: 5000 });
  await page.waitForTimeout(700); // let the stagger settle
}

/** Describe whatever currently holds focus, in terms a human can read. */
const describeFocus = () => {
  const active = document.activeElement;
  const opener = (window as Window & { __menuAuditOpener?: Element | null }).__menuAuditOpener;
  return {
    tag: active?.tagName ?? "(none)",
    text: (active?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40),
    /** Is focus inside the modal panel, or has it escaped behind it? */
    inPanel: !!active?.closest('[role="dialog"]'),
    inHeader: !!active?.closest("header"),
    /** Is focus on the exact node that was clicked to open the menu? */
    isOpener: !!opener && active === opener,
    openerConnected: !!opener && opener.isConnected,
  };
};
type FocusReport = ReturnType<typeof describeFocus>;

/** Scroll position and the COMPUTED overflow of both scroll roots. */
const readScroll = () => ({
  y: Math.round(window.scrollY),
  maxY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  htmlOverflow: getComputedStyle(document.documentElement).overflowY,
  bodyOverflow: getComputedStyle(document.body).overflowY,
});

/** Wait until two consecutive samples of scrollY agree (Lenis eases). */
async function settleScroll(page: Page) {
  let settled = -1;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(200);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === settled) break;
    settled = y;
  }
}

async function wheelAt(page: Page, x: number, y: number, dy: number) {
  // Real wheel events: this project has already been bitten once by
  // window.scrollTo being silently ignored while a smooth-scroll library owns
  // the scroll position.
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, dy);
  await page.waitForTimeout(700);
  return page.evaluate(readScroll);
}

async function scrollAndReport(page: Page, [w, h]: Viewport) {
  // Today's point at 1440 (700, 500); the centre at narrower widths.
  const x = w >= 1440 ? 700 : Math.round(w / 2);
  const y = w >= 1440 ? 500 : Math.round(h / 2);
  return wheelAt(page, x, y, 1200);
}

/**
 * Wheel the page while the menu is open, at every place a reader's pointer
 * can be: over the header, over the middle of the panel and near its foot.
 *
 * Wheeling only over the panel proved nothing about the lock. The panel's own
 * scroller carries `data-lenis-prevent`, so Lenis ignores wheels whose path
 * crosses it whether or not it has been stopped, and body overflow blocks the
 * native gesture. A menu that never called `__lenis.stop()` therefore passed
 * — while a wheel over the header, where Lenis does listen, scrolled the page
 * programmatically behind the open menu.
 */
async function wheelWhileOpen(page: Page, [w, h]: Viewport) {
  const headerMid = await page.evaluate(() => {
    const r = document.querySelector("header")?.getBoundingClientRect();
    return r && r.height > 0 ? Math.round(r.top + r.height / 2) : 20;
  });
  const points: [string, number, number][] = [
    ["over the header", Math.round(w / 2), Math.max(2, headerMid)],
    ["over the panel centre", Math.round(w / 2), Math.round(h / 2)],
    ["near the panel foot", Math.round(w / 2), h - 8],
  ];
  const start = await page.evaluate(readScroll);
  const moved: string[] = [];
  let last = start;
  for (const [where, x, y] of points) {
    const before = last.y;
    last = await wheelAt(page, x, y, 1200);
    if (last.y !== before) moved.push(`${where}: scrollY ${before} -> ${last.y}`);
  }
  return { start, end: last, moved };
}

/**
 * Canvas-composite contrast of one element's text against the pixels actually
 * painted behind it — the text-contrast.mts:115-123 method.
 *
 * The regex parser this replaces pulled the first three numbers out of the
 * computed colour strings. Tailwind v4 opacity modifiers compile to
 * color-mix(), which Chromium serialises as `color(srgb …)` / `oklab(…)` with
 * 0–1 channels, and a transparent panel read as black. So now:
 *   - hide only the element, screenshot its box: that is the backdrop;
 *   - resolve the text colour — any colour space — to sRGB bytes + alpha on a
 *     1x1 canvas, composite it over every backdrop pixel, and take the WORST
 *     pixel;
 *   - also resolve the panel's own computed background the same way, require
 *     it to be opaque, and take the text-over-panel pair.
 * The reported ratio is the lower of the two, so it can never be kinder than
 * the colour-pair reading it replaces.
 */
async function canvasContrast(page: Page, selector: string) {
  const info = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    const panel = document.querySelector('[role="dialog"]') as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.floor(r.left));
    const y = Math.max(0, Math.floor(r.top));
    const right = Math.min(window.innerWidth, Math.ceil(r.right));
    const bottom = Math.min(window.innerHeight, Math.ceil(r.bottom));
    if (right - x < 2 || bottom - y < 2) return null;
    return {
      clip: { x, y, width: right - x, height: bottom - y },
      color: getComputedStyle(el).color,
      panelBg: panel ? getComputedStyle(panel).backgroundColor : "(no panel)",
    };
  }, selector);
  if (!info) return null;

  const previous = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    const prior = el.style.visibility;
    el.style.visibility = "hidden";
    return prior;
  }, selector);
  await page.waitForTimeout(250);
  const shot = await page.screenshot({ clip: info.clip });
  await page.evaluate(
    ({ sel, prior }) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) el.style.visibility = prior;
    },
    { sel: selector, prior: previous },
  );

  const stats = await page.evaluate(
    async ({ dataUrl, color, panelBg }) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(img, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

      // Resolve a colour — any colour space — to sRGB bytes + alpha.
      const resolve = (css: string) => {
        const probe = document.createElement("canvas");
        probe.width = probe.height = 1;
        const pctx = probe.getContext("2d")!;
        pctx.clearRect(0, 0, 1, 1);
        pctx.fillStyle = "rgba(0, 0, 0, 0)";
        pctx.fillStyle = css;
        pctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = pctx.getImageData(0, 0, 1, 1).data;
        return { r, g, b, a: a / 255 };
      };

      const lin = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      const lum = (r: number, g: number, b: number) =>
        0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

      const text = resolve(color);
      const ratios: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const br = data[i];
        const bg = data[i + 1];
        const bb = data[i + 2];
        // The glyph as actually painted: text over this pixel.
        const fr = text.a * text.r + (1 - text.a) * br;
        const fg = text.a * text.g + (1 - text.a) * bg;
        const fb = text.a * text.b + (1 - text.a) * bb;
        ratios.push(ratio(lum(fr, fg, fb), lum(br, bg, bb)));
      }
      ratios.sort((a, b) => a - b);

      const panel = resolve(panelBg);
      const panelOpaque = panel.a >= 0.999;
      // Text composited over the panel colour; a see-through panel scores 1.
      const pr = text.a * text.r + (1 - text.a) * panel.r;
      const pg = text.a * text.g + (1 - text.a) * panel.g;
      const pb = text.a * text.b + (1 - text.a) * panel.b;
      const pair = panelOpaque ? ratio(lum(pr, pg, pb), lum(panel.r, panel.g, panel.b)) : 1;

      return {
        pixels: ratios.length,
        worst: ratios[0],
        p05: ratios[Math.floor(ratios.length * 0.05)],
        mean: ratios.reduce((a, b) => a + b, 0) / ratios.length,
        textAlpha: text.a,
        panelAlpha: panel.a,
        panelOpaque,
        pair,
      };
    },
    {
      dataUrl: `data:image/png;base64,${shot.toString("base64")}`,
      color: info.color,
      panelBg: info.panelBg,
    },
  );

  return {
    color: info.color,
    panelBg: info.panelBg,
    ...stats,
    ratio: Math.min(stats.worst, stats.pair),
  };
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
async function auditCoverage(browser: Browser, [w, h]: Viewport) {
  console.log(`\n[coverage ${w}x${h}] the overlay actually covers the page`);
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
  await settleScroll(page);

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

  /* The panel lingers for its exit fade — invisible, but it must not still be
     swallowing clicks or focus.

     M7 used to wait 600 ms and compare URLs WITHOUT CLICKING, which could not
     fail. Now a real, trusted mouse click lands at the centre 150 ms after
     Escape, and the URL must not change.

     The click must test the PANEL, not the page behind it: once the menu is
     closed, a link behind the centre is legitimately live, and following it
     would be correct behaviour, not a defect. So, for this one click only, a
     capture-phase listener cancels any click whose target is NOT the panel
     (the node captured while open, or any [role=dialog]). A click the panel
     takes is left alone: if the fading panel still owns the centre, its link
     navigates and the URL changes. The listener also records where the click
     landed, which is asserted too. */
  await page.evaluate(() => {
    const win = window as Window & {
      __menuAuditPanel?: Element | null;
      __menuAuditClicks?: { tag: string; text: string; href: string | null; onPanel: boolean }[];
    };
    win.__menuAuditPanel = document.querySelector('[role="dialog"]');
    win.__menuAuditClicks = [];
    window.addEventListener(
      "click",
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const panel = win.__menuAuditPanel;
        const onPanel = !!target && ((!!panel && panel.contains(target)) || !!target.closest('[role="dialog"]'));
        win.__menuAuditClicks!.push({
          tag: target?.tagName ?? "(none)",
          text: (target?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30),
          href: target?.closest("a")?.getAttribute("href") ?? null,
          onPanel,
        });
        if (!onPanel) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true, once: true },
    );
  });

  const urlBefore = page.url();
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);
  await page.mouse.move(cx, cy);
  await page.keyboard.press("Escape");
  const escapedAt = Date.now();
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
  await page.mouse.click(cx, cy);
  const clickedAfter = Date.now() - escapedAt;
  check(
    `${w}x${h}: the fading panel stops taking input`,
    midExit.gone || (midExit.inert && !midExit.hitsPanel),
    midExit.gone
      ? "panel already unmounted 150ms after Escape"
      : `inert=${midExit.inert}, centre still hits panel=${midExit.hitsPanel}`,
  );

  /* Wait for a navigation to COMMIT, for up to 2 s (the old instrument waited
     a fixed 600 ms and never clicked). A soft (client) navigation changes the
     URL without a load; a hard one commits first. With no navigation this
     waits the full 2 s, so a slow route cannot slip past the comparison. */
  await page
    .waitForURL((u) => u.href !== urlBefore, { waitUntil: "commit", timeout: 2000 })
    .catch(() => {});
  const urlAfter = page.url();
  const clicks = await page
    .evaluate(
      () =>
        (window as Window & { __menuAuditClicks?: { tag: string; text: string; href: string | null; onPanel: boolean }[] })
          .__menuAuditClicks ?? null,
    )
    .catch(() => null); // a hard navigation destroys the page's state
  const landed = clicks?.[0];
  const where = landed
    ? `click landed on <${landed.tag}>${landed.href ? ` href="${landed.href}"` : ""} ${landed.onPanel ? "INSIDE the panel" : "behind the panel (cancelled)"}`
    : clicks
      ? "no click event reached the page"
      : "click target unknown (the page navigated away)";
  check(
    `${w}x${h}: clicking mid-fade does not navigate`,
    urlAfter === urlBefore,
    urlAfter === urlBefore
      ? `real click ${clickedAfter}ms after Escape; url unchanged; ${where}`
      : `URL changed after a click 150 ms past Escape (${clickedAfter}ms): ${urlBefore} -> ${urlAfter}; ${where}`,
  );
  check(
    `${w}x${h}: a click mid-fade is not taken by the panel`,
    !landed?.onPanel && urlAfter === urlBefore,
    landed?.onPanel
      ? `the fading panel took a click ${clickedAfter}ms after Escape (<${landed.tag}> "${landed.text}")`
      : urlAfter !== urlBefore
        ? `the click navigated to ${urlAfter}`
        : where,
  );

  await ctx.close();
}

async function auditBackgroundHidden(browser: Browser, [w, h]: Viewport) {
  console.log(`\n[assistive tech ${w}x${h}] the page behind is hidden while open`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
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
    `${w}x${h}: main and footer are inert while the menu is open`,
    open.main === true && open.footer === true,
    `main.inert=${open.main}, footer.inert=${open.footer}`,
  );
  check(
    `${w}x${h}: the header stays live (it holds Close)`,
    open.header === false,
    `header.inert=${open.header}`,
  );
  check(
    `${w}x${h}: no two exposed navigation landmarks share a name`,
    new Set(open.navLabels).size === open.navLabels.length,
    `exposed nav labels: ${open.navLabels.map((l) => `"${l}"`).join(", ")}`,
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);

  /* M11. "Nothing is left inert after close" — with exactly one exclusion: a
     menu panel that stays mounted after close may keep `inert` on itself, but
     only if it is closed (trigger not expanded, not aria-modal), invisible
     (display:none, visibility:hidden, opacity ~0 or no box) and nothing in it
     can take focus. Focusability is TRIED, not inferred from attributes. A
     closed panel that is still visible or focusable is a failure in its own
     right, which the bare `[inert]` count never caught: a panel left mounted
     WITHOUT inert counted zero and passed. */
  const after = await page.evaluate((triggerSel) => {
    const trigger = document.querySelector(triggerSel);
    const expanded = trigger?.getAttribute("aria-expanded") === "true";
    const controlled = trigger?.getAttribute("aria-controls");
    const panels = [
      ...new Set(
        [
          controlled ? document.getElementById(controlled) : null,
          ...document.querySelectorAll('[role="dialog"]'),
        ].filter((el): el is HTMLElement => el instanceof HTMLElement),
      ),
    ];

    const effectiveOpacity = (el: Element) => {
      let o = 1;
      for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    };
    const describe = (el: Element) =>
      `<${el.tagName}${el.id ? `#${el.id}` : ""}> "${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 24)}"`;

    const report = panels.map((panel) => {
      const cs = getComputedStyle(panel);
      const r = panel.getBoundingClientRect();
      const opacity = effectiveOpacity(panel);
      const invisible =
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        opacity <= 0.01 ||
        r.width < 1 ||
        r.height < 1;
      const closed = !expanded && panel.getAttribute("aria-modal") !== "true";

      const restore = document.activeElement as HTMLElement | null;
      const candidates = [
        panel,
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]',
        ),
      ];
      const focusable: string[] = [];
      for (const el of candidates) {
        el.focus({ preventScroll: true });
        if (document.activeElement === el) focusable.push(describe(el));
      }
      restore?.focus?.({ preventScroll: true });

      return {
        panel,
        excluded: closed && invisible && focusable.length === 0,
        text:
          `${describe(panel)} aria-modal=${panel.getAttribute("aria-modal")}, trigger aria-expanded=${expanded}, ` +
          `display=${cs.display}, visibility=${cs.visibility}, opacity=${opacity.toFixed(2)}, ` +
          `focusable: ${focusable.length ? focusable.slice(0, 3).join(", ") : "none"}`,
      };
    });

    const excluded = report.filter((p) => p.excluded).map((p) => p.panel);
    const stillInert = [...document.querySelectorAll("[inert]")].filter(
      (el) => !excluded.some((p) => p === el || p.contains(el)),
    );
    return {
      mounted: panels.length,
      excludedCount: excluded.length,
      bad: report.filter((p) => !p.excluded).map((p) => p.text),
      stillInert: stillInert.map(describe),
    };
  }, TRIGGER);

  check(
    `${w}x${h}: inert is fully released after close`,
    after.stillInert.length === 0,
    `${after.stillInert.length} element(s) still inert` +
      (after.stillInert.length ? `: ${after.stillInert.slice(0, 3).join(", ")}` : "") +
      (after.excludedCount ? ` (excluding ${after.excludedCount} closed, invisible, unfocusable menu panel)` : ""),
  );
  check(
    `${w}x${h}: no closed menu panel is left visible or focusable`,
    after.bad.length === 0,
    after.bad.length
      ? `closed panel visible or focusable — ${after.bad.join(" | ")}`
      : after.mounted
        ? `${after.mounted} panel(s) still mounted, all closed, invisible and unfocusable`
        : "panel unmounted",
  );

  await ctx.close();
}

async function auditBehaviour(browser: Browser, viewport: Viewport) {
  const [w, h] = viewport;
  const tag = `${w}x${h}`;
  console.log(`\n[behaviour ${tag}] escape, scroll lock, focus trap`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${DARK_HERO}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1200);

  // --- 2. locked while open -------------------------------------------------
  const beforeOpen = await page.evaluate(() => Math.round(window.scrollY));
  await openMenu(page);
  const whileOpen = await wheelWhileOpen(page, viewport);
  check(
    `${tag}: background scroll is locked while open`,
    whileOpen.moved.length === 0 && whileOpen.end.y === beforeOpen,
    whileOpen.moved.length || whileOpen.end.y !== beforeOpen
      ? `page scrolled under the open menu (wheel): ${whileOpen.moved.join("; ") || `scrollY ${beforeOpen} -> ${whileOpen.end.y}`} (computed overflow-y html "${whileOpen.end.htmlOverflow}", body "${whileOpen.end.bodyOverflow}")`
      : `scrollY held at ${beforeOpen} through 1200px wheels over the header, panel centre and foot (computed overflow-y html "${whileOpen.end.htmlOverflow}", body "${whileOpen.end.bodyOverflow}")`,
  );

  // --- 4/6. focus landed inside, close control reachable --------------------
  const focusOnOpen = await page.evaluate(describeFocus);
  check(
    `${tag}: focus moves into the panel on open`,
    focusOnOpen.inPanel,
    `focus is on <${focusOnOpen.tag}> "${focusOnOpen.text}" (inPanel=${focusOnOpen.inPanel})`,
  );

  // Walk Tab all the way around and record every stop. A correct trap visits
  // only panel (or menu-chrome) elements and returns to where it started.
  const path: FocusReport[] = [];
  let escapedToBackground = false;
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    const where = await page.evaluate(describeFocus);
    path.push(where);
    if (!where.inPanel && !where.inHeader) escapedToBackground = true;
  }
  check(
    `${tag}: Tab never lands on background content`,
    !escapedToBackground,
    escapedToBackground
      ? `escaped to: ${path.filter((p) => !p.inPanel && !p.inHeader).map((p) => `<${p.tag}> "${p.text}"`).slice(0, 3).join(", ")}`
      : `${path.length} stops, all inside the modal or its header chrome`,
  );

  /* M15. The Close control is the element that opened the menu (the trigger
     toggles), so the Tab walk must reach THAT node, reading "close", in the
     site header — not merely some header element whose text matches. */
  const openerStop = path.find((p) => p.isOpener);
  const reachedCloseControl = !!openerStop && openerStop.inHeader && /close/i.test(openerStop.text);
  check(
    `${tag}: the close control is reachable by keyboard while open`,
    reachedCloseControl,
    reachedCloseControl
      ? `Tab reaches the opener, which reads "${openerStop!.text}"`
      : openerStop
        ? `Tab reaches the opener but it reads "${openerStop.text}" (inHeader=${openerStop.inHeader}) — no Close`
        : `Tab never reaches the control that opened the menu${path[0]?.openerConnected === false ? " (the opener was detached from the document)" : ""} — Escape is the only way out`,
  );

  // Focus can also be lost entirely (click the backdrop, return from browser
  // chrome). A trap that only fires on first/last cannot recover from that.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("Tab");
  await page.waitForTimeout(60);
  const afterBlur = await page.evaluate(describeFocus);
  check(
    `${tag}: Tab recovers into the panel after focus is lost`,
    afterBlur.inPanel || afterBlur.inHeader,
    `after blur + Tab, focus is on <${afterBlur.tag}> "${afterBlur.text}" (inPanel=${afterBlur.inPanel})`,
  );

  // --- 1. Escape closes -----------------------------------------------------
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const closed = await page.evaluate(() => !document.querySelector('[role="dialog"][aria-modal="true"]'));
  check(`${tag}: Escape closes the menu`, closed, closed ? "panel unmounted" : "panel still present");

  // --- 7. focus restored to the opener (M18) ----------------------------------
  // Focus was deliberately left on a header element other than the opener by
  // the blur + Tab above, so "focus is somewhere in the header" can no longer
  // pass for a menu that forgot to restore focus.
  const afterClose = await page.evaluate(describeFocus);
  check(
    `${tag}: focus returns to the opener on close`,
    afterClose.isOpener && afterClose.inHeader,
    afterClose.isOpener && afterClose.inHeader
      ? `focus is on the opener <${afterClose.tag}> "${afterClose.text}"`
      : `focus not returned to the opener: focus is on <${afterClose.tag}> "${afterClose.text}" (inHeader=${afterClose.inHeader}, opener connected=${afterClose.openerConnected})`,
  );

  // --- 3. THE ONE THAT BITES: scroll works again ----------------------------
  const afterCloseScroll = await scrollAndReport(page, viewport);
  check(
    `${tag}: background scroll is restored after close`,
    afterCloseScroll.y > beforeOpen,
    `scrollY ${beforeOpen} -> ${afterCloseScroll.y} after a 1200px wheel (computed overflow-y html "${afterCloseScroll.htmlOverflow}", body "${afterCloseScroll.bodyOverflow}")`,
  );

  /* M20. Repeated open/close must not accumulate a stuck lock either. Each
     cycle re-runs the wheel lock test while open and checks focus returns to
     the opener; after the cycles, the COMPUTED overflow of both html and body
     must not be hidden/clip (a lock can live on either, or in a stylesheet
     class, where body's inline style never saw it), and a real wheel must
     still move the page. */
  const cycleProblems: string[] = [];
  for (let i = 0; i < 3; i++) {
    // Lenis is still easing out of the previous wheel: a y0 read mid-glide
    // would blame the lock for movement that happened before the menu opened.
    await settleScroll(page);
    const y0 = await page.evaluate(() => Math.round(window.scrollY));
    await openMenu(page);
    const lock = await wheelWhileOpen(page, viewport);
    if (lock.moved.length || lock.end.y !== y0) {
      cycleProblems.push(
        `cycle ${i + 1}: page scrolled under the open menu (wheel): ${lock.moved.join("; ") || `scrollY ${y0} -> ${lock.end.y}`}`,
      );
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    const f = await page.evaluate(describeFocus);
    if (!f.isOpener) cycleProblems.push(`cycle ${i + 1}: focus not returned to the opener (on <${f.tag}> "${f.text}")`);
  }
  const lockedValues = new Set(["hidden", "clip"]);
  await settleScroll(page);
  const afterCycles = await page.evaluate(readScroll);
  const stuck =
    lockedValues.has(afterCycles.htmlOverflow) || lockedValues.has(afterCycles.bodyOverflow);
  // Wheel towards whichever end has room, then demand the page moved.
  const down = afterCycles.y < afterCycles.maxY - 2;
  const wheelTest = await wheelAt(page, Math.round(w / 2), Math.round(h / 2), down ? 1200 : -1200);
  const wheelMoved = down ? wheelTest.y > afterCycles.y : wheelTest.y < afterCycles.y;
  check(
    `${tag}: 3 open/close cycles leave no stuck scroll lock`,
    !stuck && wheelMoved && cycleProblems.length === 0,
    [
      `computed overflow-y html "${afterCycles.htmlOverflow}", body "${afterCycles.bodyOverflow}"${stuck ? " (LOCKED)" : ""}`,
      `wheel ${down ? "down" : "up"} after the cycles: scrollY ${afterCycles.y} -> ${wheelTest.y}${wheelMoved ? "" : " (page did not scroll after close)"}`,
      ...cycleProblems,
    ].join("; "),
  );

  await ctx.close();
}

async function auditLazyPreviews(browser: Browser, [w, h]: Viewport) {
  console.log(`\n[payload ${w}x${h}] preview photographs are not paid for until opened`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
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
    `${w}x${h}: opening the menu costs no eager image downloads`,
    afterOpen === beforeOpen,
    `${beforeOpen} image requests before open, ${afterOpen} after (previews should wait for hover)` +
      (afterOpen > beforeOpen
        ? `: ${imageRequests.slice(beforeOpen).map((u) => (u.split("url=")[1] ?? u).split("&")[0]).slice(0, 3).join(", ")}`
        : ""),
  );

  /* Hover every item in turn and record the per-hover network delta.
   *
   * An earlier version of this check hovered only the FIRST item and asserted
   * that a request followed. It reported a false failure: that one preview had
   * already been fetched, so hovering it correctly produced no traffic. The
   * honest property is not "hovering causes a request" — it is "each item has
   * its own preview, and previews arrive on demand".
   *
   * Previews are a >= 1024 feature (the preview layer is `hidden lg:block`,
   * SPEC §H.2), so the per-item check runs at 1440 only; the eager-download
   * check above runs at both widths. */
  if (w >= 1024) {
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
      `${w}x${h}: each menu item has its own preview, fetched on demand`,
      distinct.size >= Math.max(1, count - 2),
      `${distinct.size} distinct previews fetched across ${count} items`,
    );
  }

  console.log(`  note  ${previewPaths.length} distinct graded image paths appear in the home HTML`);
  await ctx.close();
}

async function auditTones(browser: Browser, [w, h]: Viewport) {
  console.log(`\n[tone ${w}x${h}] the bar reads correctly over the open panel (canvas-composite)`);
  for (const route of [DARK_HERO, LIGHT_PAGE]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1500);

    const closedState = await page.evaluate(() => {
      const hd = document.querySelector("header")!;
      const link = hd.querySelector("a")!;
      const hero = document.querySelector("[data-hero]") as HTMLElement | null;
      return {
        tone: hero?.dataset.heroTone ?? "(no hero)",
        headerBg: getComputedStyle(hd).backgroundColor,
        wordmark: getComputedStyle(link).color,
      };
    });

    await openMenu(page);

    const wordmark = await canvasContrast(page, "header a");
    const trigger = await canvasContrast(page, TRIGGER);

    const describe = (m: NonNullable<typeof wordmark>) =>
      `${m.color} over the painted backdrop: worst pixel ${m.worst.toFixed(2)}:1, p05 ${m.p05.toFixed(2)}:1, mean ${m.mean.toFixed(2)}:1` +
      (m.textAlpha < 0.999 ? ` (text alpha ${m.textAlpha.toFixed(2)}, composited)` : "") +
      `; on panel ${m.panelBg} ${m.panelOpaque ? `${m.pair.toFixed(2)}:1` : `NOT OPAQUE (alpha ${m.panelAlpha.toFixed(2)})`}`;

    check(
      `${w}x${h} ${route}: bar is legible over the open overlay`,
      !!wordmark && wordmark.ratio >= CONTRAST_FLOOR,
      wordmark
        ? `${wordmark.ratio >= CONTRAST_FLOOR ? `canvas contrast ${wordmark.ratio.toFixed(2)}:1 >= ${CONTRAST_FLOOR}` : `canvas contrast < ${CONTRAST_FLOOR} (${wordmark.ratio.toFixed(2)}:1)`} — hero tone "${closedState.tone}"; closed wordmark ${closedState.wordmark} on ${closedState.headerBg}; open wordmark ${describe(wordmark)}`
        : "canvas contrast not measurable: the wordmark has no box in the viewport",
    );
    check(
      `${w}x${h} ${route}: menu trigger is legible while open`,
      !!trigger && trigger.ratio >= CONTRAST_FLOOR,
      trigger
        ? `${trigger.ratio >= CONTRAST_FLOOR ? `canvas contrast ${trigger.ratio.toFixed(2)}:1 >= ${CONTRAST_FLOOR}` : `canvas contrast < ${CONTRAST_FLOOR} (${trigger.ratio.toFixed(2)}:1)`} — ${describe(trigger)}`
        : "canvas contrast not measurable: the trigger has no box in the viewport",
    );

    await ctx.close();
  }
}

async function auditReducedMotion(browser: Browser, [w, h]: Viewport) {
  console.log(`\n[reduced motion ${w}x${h}] opens, readable, nothing stuck invisible`);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
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
    `${w}x${h} reduced motion: every menu item is fully visible`,
    links.length > 0 && invisible.length === 0,
    invisible.length
      ? `${invisible.length}/${links.length} below full opacity: ${invisible.map((i) => `"${i.label}"@${i.opacity}`).join(", ")}`
      : `${links.length} items all at opacity 1`,
  );

  const untranslated = links.every((l) => l.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(l.transform));
  check(
    `${w}x${h} reduced motion: no residual offset on menu items`,
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

  /* Targets: every link in the panel (as before, rendered or not), every
     rendered button in the panel, and the open menu's header chrome — above
     all the opener, which is the Close control while the menu is open. The
     panel-only list never measured Close, the one control every phone reader
     needs. Visually hidden controls (a clipped 1x1 box, no box at all) are not
     targets until focused. */
  const layout = await page.evaluate((triggerSel) => {
    // innerText: the words actually rendered at this width (the trigger's
    // `lg:inline` "Close" is display:none at 390; its sr-only "Close menu" is not).
    const label = (el: Element) =>
      (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 24) || `<${el.tagName}>`;
    const rendered = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== "hidden";
    };
    const panel = document.querySelector('[role="dialog"]');
    const opener =
      (window as Window & { __menuAuditOpener?: Element | null }).__menuAuditOpener ??
      document.querySelector(triggerSel);
    const targets = [
      ...new Set<Element>([
        ...(panel ? panel.querySelectorAll("a") : []),
        ...(panel ? [...panel.querySelectorAll("button")].filter(rendered) : []),
        ...(opener ? [opener] : []),
        ...[...document.querySelectorAll("header a, header button")].filter(rendered),
      ]),
    ];
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      openerMeasured: !!opener,
      measured: targets.map((el) => ({
        label: label(el),
        opener: el === opener,
        h: Math.round(el.getBoundingClientRect().height),
        w: Math.round(el.getBoundingClientRect().width),
      })),
    };
  }, TRIGGER);
  const small = layout.measured.filter((t) => t.h < TARGET_MIN);
  const opener = layout.measured.find((t) => t.opener);

  check(
    "390: no horizontal overflow with the menu open",
    layout.scrollWidth <= layout.innerWidth + 1,
    `scrollWidth ${layout.scrollWidth} vs innerWidth ${layout.innerWidth}`,
  );
  check(
    "390: every menu target is at least 44px tall",
    layout.openerMeasured && small.length === 0,
    !layout.openerMeasured
      ? "390: target < 44 px — the Close control (the opener) was not found"
      : small.length
        ? `390: target < 44 px — ${small.length}/${layout.measured.length} too small: ${small.map((s) => `"${s.label}"${s.opener ? " (the Close control)" : ""} ${s.h}px`).join(", ")}`
        : `all ${layout.measured.length} targets >= 44px, the Close control "${opener?.label}" included (${opener?.w}x${opener?.h})`,
  );

  await ctx.close();
}

// ---------------------------------------------------------------------------

try {
  await preflight(BASE, process.cwd() + "/qa");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`MENU AUDIT FAILED — preflight did not pass, nothing was audited\n  - ${message}`);
  process.exit(1);
}
const browser = await chromium.launch();

type Audit = [string, (b: Browser) => Promise<void>];
const audits: Audit[] = [];
for (const viewport of VIEWPORTS) {
  const tag = `${viewport[0]}x${viewport[1]}`;
  audits.push(
    [`coverage ${tag}`, (b) => auditCoverage(b, viewport)],
    [`background hidden ${tag}`, (b) => auditBackgroundHidden(b, viewport)],
    [`behaviour ${tag}`, (b) => auditBehaviour(b, viewport)],
    [`lazy previews ${tag}`, (b) => auditLazyPreviews(b, viewport)],
    [`tones ${tag}`, (b) => auditTones(b, viewport)],
    [`reduced motion ${tag}`, (b) => auditReducedMotion(b, viewport)],
  );
}
audits.push(["narrow", auditNarrow]);

// Each audit gets its own context so one failure cannot poison the next.
for (const [name, fn] of audits) {
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
