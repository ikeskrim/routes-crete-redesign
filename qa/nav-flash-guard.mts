/**
 * The nav must be correct in the SERVER HTML, before any JavaScript runs.
 *
 * The bar used to initialise "not over a hero" and discover the truth from an
 * IntersectionObserver after hydration, so a page with a dark hero painted a
 * solid light bar for the first frames. It was reported from a real device and
 * deferred as a tracked residual; this is the mechanical proof it is closed.
 *
 * Two checks, because only one of them is about JavaScript:
 *   1. with JS DISABLED, the header markup already carries the right state
 *   2. with JS enabled and CPU throttled, the state never flips mid-load
 *
 * What "the header" is (C+ SPEC §I.1, S1q instrument):
 *   - the site masthead is `header[data-site-chrome]` (Nav.tsx), found by that
 *     selector rather than as "the first/only <header>". A header that lost the
 *     attribute prints "site header not found" instead of being measured.
 *   - there is exactly ONE <header> in the document. This used to be implicit
 *     in the strict `page.locator("header")`, which threw (a crash, not a
 *     reported failure) on a second header. It is now asserted and printed as
 *     "header count N", with JS off and at every sample under throttle.
 *
 *   node qa/nav-flash-guard.mts
 */
import { chromium } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

const ROUTES = [
  { path: "/", hero: true },
  { path: "/experiences/kourtaliotis-temple-of-nature", hero: true },
  { path: "/experiences", hero: false },
  { path: "/contact", hero: false },
];

const SITE_HEADER = "header[data-site-chrome]";

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

/** One reading of the document: how many <header>s, how many site headers,
    and the class attribute of the site header when there is exactly one. */
interface Probe {
  headers: number;
  site: number;
  cls: string | null;
}

/* Runs in the page: Playwright serialises it, so it may use nothing from
   this module's scope beyond its one argument. */
const probe = (selector: string): Probe => {
  const site = document.querySelectorAll(selector);
  return {
    headers: document.querySelectorAll("header").length,
    site: site.length,
    cls: site.length === 1 ? (site[0].getAttribute("class") ?? "") : null,
  };
};

const siteDetail = (n: number) =>
  n === 0 ? "site header not found" : n === 1 ? SITE_HEADER : `site header ×${n}`;

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();

try {
  console.log("\n[no-js] the server HTML already carries the right state");
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const p = await page.evaluate(probe, SITE_HEADER);

      check(`${route.path} has exactly one <header>`, p.headers === 1, `header count ${p.headers}`);
      check(`${route.path} site header is ${SITE_HEADER}`, p.site === 1, siteDetail(p.site));

      const transparent = (p.cls ?? "").includes("bg-transparent");
      check(
        `${route.path} renders ${route.hero ? "transparent" : "solid"} without JS`,
        p.cls !== null && transparent === route.hero,
        p.cls === null
          ? siteDetail(p.site)
          : transparent
            ? "bg-transparent"
            : "bg-shell/85 (solid)",
      );
    }
    await ctx.close();
  }

  console.log("\n[throttled] the state never flips during load");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    // 6x slowdown: hydration lands late enough that a wrong first frame would
    // be plainly visible rather than a theoretical one.
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });

    for (const route of ROUTES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "commit", timeout: 60_000 });
      const seen = new Set<string>();
      /* Largest <header> count and largest site-header count over the whole
         load: a second header that exists for even one sample is a failure. */
      let maxHeaders = 0;
      let maxSite = 0;
      for (let i = 0; i < 40; i++) {
        const p = await page.evaluate(probe, SITE_HEADER).catch(() => null);
        if (p) {
          maxHeaders = Math.max(maxHeaders, p.headers);
          maxSite = Math.max(maxSite, p.site);
          if (p.cls !== null) {
            seen.add(p.cls.includes("bg-transparent") ? "transparent" : "solid");
          }
        }
        await page.waitForTimeout(50);
      }
      const expected = route.hero ? "transparent" : "solid";
      check(
        `${route.path} has exactly one <header> through load`,
        maxHeaders === 1,
        `header count ${maxHeaders} (max over load)`,
      );
      check(
        `${route.path} site header is ${SITE_HEADER} through load`,
        maxSite === 1,
        `${siteDetail(maxSite)} (max over load)`,
      );
      check(
        `${route.path} holds one state through load`,
        seen.size === 1 && seen.has(expected),
        `${maxSite === 0 ? "site header not found; " : ""}observed: ${[...seen].join(" -> ") || "(none)"} (expected only "${expected}")`,
      );
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${failed} failure(s)`);
if (failed === 0) {
  console.log("NAV FLASH GUARD OK - the bar is right before JavaScript runs, and never flips");
} else {
  console.log("NAV FLASH GUARD FAILED");
  process.exitCode = 1;
}
