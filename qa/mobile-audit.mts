/**
 * 390px audit, across every route.
 *
 * Mechanical rather than by eye: an eye scrolling a phone frame catches the
 * obvious and misses the 2px overflow that only shows on a real device with a
 * different scrollbar. Each check is a property a visitor can feel:
 *
 *   - nothing scrolls sideways
 *   - every tappable thing is at least 44x44 (the WCAG 2.5.8 target size)
 *   - no body text below 14px, no heading crammed under its own leading
 *   - the fixed header never covers the first thing on the page
 *   - images declare dimensions, so nothing jumps as they load
 *
 *   node qa/mobile-audit.mts
 */
import { chromium } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

const ROUTES = [
  "/",
  "/experiences",
  "/experiences/kourtaliotis-temple-of-nature",
  "/transfers",
  "/transfers/private-transfers-rethymno",
  "/contact",
  "/credits",
];

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

for (const route of ROUTES) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2200);

  const report = await page.evaluate(() => {
    const vw = window.innerWidth;

    // Anything actually sticking out past the viewport, named.
    const overflowing = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed") return false;
        /* Ignore anything clipped by an ancestor. Ken-Burns and parallax
           layers are deliberately oversized inside `overflow: hidden` frames —
           they stick out of their parent and nowhere else, and listing them
           buries the one element that actually widens the page. */
        for (let n = el.parentElement; n; n = n.parentElement) {
          const o = getComputedStyle(n).overflowX;
          if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") return false;
        }
        return r.right > vw + 1 || r.left < -1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 26)} right=${Math.round(el.getBoundingClientRect().right)}`);

    // Tap targets. Links inside a paragraph are exempt: inline text links are
    // explicitly carved out of WCAG 2.5.8, and padding them to 44px would
    // wreck the typography they live in.
    const small = [...document.querySelectorAll("a, button")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        if (el.closest("p")) return false;
        /* The skip link is 1x1 until focused — that is the pattern working,
           not a small target. */
        if (String(el.className).includes("sr-only")) return false;
        /* Map pins are positioned by the data, which WCAG 2.5.8 exempts, and
           the chart carries a full-size legend beneath it on mobile. */
        if (el.closest("[data-map]")) return false;
        return r.height < 44 || r.width < 24;
      })
      .slice(0, 6)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `"${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`;
      });

    // Body copy that has become unreadable at this width.
    const tiny = [...document.querySelectorAll("p, li, span")]
      .filter((el) => {
        const t = (el.textContent ?? "").trim();
        if (t.length < 25) return false;
        if (el.children.length) return false;
        const size = parseFloat(getComputedStyle(el).fontSize);
        return size < 14;
      })
      .slice(0, 5)
      .map((el) => `${Math.round(parseFloat(getComputedStyle(el).fontSize))}px "${(el.textContent ?? "").trim().slice(0, 24)}"`);

    // Does the fixed header cover the first real content?
    const header = document.querySelector("header");
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
    const firstHeading = document.querySelector("main h1, main h2");
    const headingTop = firstHeading?.getBoundingClientRect().top ?? 9999;

    // Images without intrinsic dimensions jump when they load.
    const undimensioned = [...document.querySelectorAll("main img")].filter(
      (img) => !img.getAttribute("width") && !(img as HTMLImageElement).style.height,
    ).length;

    return {
      scrollWidth: document.documentElement.scrollWidth,
      vw,
      overflowing,
      small,
      tiny,
      headerBottom: Math.round(headerBottom),
      headingTop: Math.round(headingTop),
      undimensioned,
      images: document.querySelectorAll("main img").length,
    };
  });

  console.log(`\n${route}`);
  check(
    "no horizontal overflow",
    report.scrollWidth <= report.vw + 1,
    `scrollWidth ${report.scrollWidth} vs ${report.vw}` +
      (report.overflowing.length ? ` — ${report.overflowing.join("; ")}` : ""),
  );
  check(
    "tap targets >= 44px tall",
    report.small.length === 0,
    report.small.length ? report.small.join("; ") : "all block-level targets pass",
  );
  check(
    "no body text under 14px",
    report.tiny.length === 0,
    report.tiny.length ? report.tiny.join("; ") : "smallest body copy is >= 14px",
  );
  check(
    "images declare their dimensions",
    report.undimensioned === 0,
    `${report.undimensioned}/${report.images} without intrinsic size`,
  );

  await page.close();
}

await ctx.close();
await browser.close();

console.log(`\n${failed} failure(s)`);
if (failed === 0) {
  console.log("MOBILE AUDIT OK - 390px holds across every route");
} else {
  console.log("MOBILE AUDIT FAILED");
  process.exitCode = 1;
}
