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
 * New C+ assertions (§0.4 C1, §H.1, §I.1; on at S9 through
 * qa/cplus-stage.mts):
 *   - the tone is server-correct: with JS off `data-nav-tone` is "light" on
 *     `/` (the paper cover) and "dark" on Kourtaliotis (its photograph), and
 *     under throttle it never flips;
 *   - `data-nav-state` says what the class literal says (`transparent` with
 *     `bg-transparent`, else `solid`), and a solid bar is the opaque
 *     `bg-paper`;
 *   - a slug that 404s under an item path (`/experiences/does-not-exist`)
 *     renders the paper 404 page under a SOLID `bg-paper` bar with JS off:
 *     only a real item href (C7 `itemHrefs`) gets the transparent bar.
 *
 *   node qa/nav-flash-guard.mts
 */
import { chromium } from "playwright";
import { cplusS9, cplusS9Line } from "./cplus-stage.mts";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const S9 = cplusS9();

interface Route {
  path: string;
  hero: boolean;
  /** C+ S9: the server-rendered `data-nav-tone`. */
  tone?: "light" | "dark";
  status?: number;
}

const ROUTES: Route[] = [
  { path: "/", hero: true, tone: "light" },
  { path: "/experiences/kourtaliotis-temple-of-nature", hero: true, tone: "dark" },
  { path: "/experiences", hero: false },
  { path: "/contact", hero: false },
];

/** C+ S9 (C1, C7): an item path that does not exist is the paper 404. */
const UNKNOWN_SLUG: Route = { path: "/experiences/does-not-exist", hero: false, status: 404 };
const NO_JS_ROUTES = S9 ? [...ROUTES, UNKNOWN_SLUG] : ROUTES;

const SITE_HEADER = "header[data-site-chrome]";

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

/** One reading of the document: how many <header>s, how many site headers,
    and the class and state attributes of the site header when there is
    exactly one. */
interface Probe {
  headers: number;
  site: number;
  cls: string | null;
  tone: string | null;
  state: string | null;
}

/* Runs in the page: Playwright serialises it, so it may use nothing from
   this module's scope beyond its one argument. */
const probe = (selector: string): Probe => {
  const site = document.querySelectorAll(selector);
  const one = site.length === 1 ? site[0] : null;
  return {
    headers: document.querySelectorAll("header").length,
    site: site.length,
    cls: one ? (one.getAttribute("class") ?? "") : null,
    tone: one ? one.getAttribute("data-nav-tone") : null,
    state: one ? one.getAttribute("data-nav-state") : null,
  };
};

const siteDetail = (n: number) =>
  n === 0 ? "site header not found" : n === 1 ? SITE_HEADER : `site header ×${n}`;

const hasClass = (cls: string | null, name: string) =>
  (cls ?? "").split(/\s+/).includes(name);

console.log(cplusS9Line());
await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();

try {
  console.log("\n[no-js] the server HTML already carries the right state");
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const route of NO_JS_ROUTES) {
      const res = await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const p = await page.evaluate(probe, SITE_HEADER);

      if (route.status) {
        /* The not-found page, not an item that happens to exist. When a
           Suspense boundary sits above the page (a route-level loading.tsx,
           as the site had until C+ S9b), Next streams this route, so
           notFound() can land after a 200 has been sent; it then marks the
           page noindex (a soft 404). Either form is the 404 page. */
        const status = res?.status() ?? 0;
        const noindex = await page.evaluate(() =>
          [...document.querySelectorAll('meta[name="robots"]')].some((m) => /noindex/i.test(m.getAttribute("content") ?? "")),
        );
        check(
          `${route.path} is the not-found page`,
          status === route.status || noindex,
          status === route.status ? `HTTP ${status}` : noindex ? `HTTP ${status} with robots noindex (a soft 404)` : `HTTP ${status}, no robots noindex`,
        );
      }
      check(`${route.path} has exactly one <header>`, p.headers === 1, `header count ${p.headers}`);
      check(`${route.path} site header is ${SITE_HEADER}`, p.site === 1, siteDetail(p.site));

      const transparent = (p.cls ?? "").includes("bg-transparent");
      if (route === UNKNOWN_SLUG) {
        check(
          `${route.path} renders a solid bg-paper bar without JS`,
          p.cls !== null && !transparent && hasClass(p.cls, "bg-paper"),
          p.cls === null
            ? siteDetail(p.site)
            : transparent
              ? `${route.path}: bg-transparent at load`
              : hasClass(p.cls, "bg-paper")
                ? "bg-paper (solid)"
                : `${route.path}: solid, but no bg-paper class`,
        );
      } else {
        check(
          `${route.path} renders ${route.hero ? "transparent" : "solid"} without JS`,
          p.cls !== null && transparent === route.hero,
          p.cls === null
            ? siteDetail(p.site)
            : transparent
              ? "bg-transparent"
              : S9
                ? "solid"
                : "bg-shell/85 (solid)",
        );
      }

      if (S9 && p.cls !== null) {
        const expectedState = transparent ? "transparent" : "solid";
        check(
          `${route.path} data-nav-state matches the class`,
          p.state === expectedState,
          `data-nav-state ${p.state ?? "(none)"}, class says ${expectedState}`,
        );
        if (!transparent && route !== UNKNOWN_SLUG) {
          check(`${route.path} solid bar is bg-paper`, hasClass(p.cls, "bg-paper"), hasClass(p.cls, "bg-paper") ? "bg-paper" : "no bg-paper class");
        }
        if (route.tone) {
          check(
            `${route.path} no-JS tone is ${route.tone}`,
            p.tone === route.tone,
            p.tone === route.tone ? `no-JS tone ${p.tone}` : `no-JS tone ${p.tone ?? "(none)"} ≠ ${route.tone}`,
          );
        }
      }
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
      const tones = new Set<string>();
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
            tones.add(p.tone ?? "(none)");
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
      if (S9 && route.tone) {
        check(
          `${route.path} holds one tone through load`,
          tones.size === 1 && tones.has(route.tone),
          `tone observed: ${[...tones].join(" -> ") || "(none)"} (expected only "${route.tone}")`,
        );
      }
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
