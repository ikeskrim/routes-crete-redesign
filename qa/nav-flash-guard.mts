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

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();

console.log("\n[no-js] the server HTML already carries the right state");
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const cls = (await page.locator("header").getAttribute("class")) ?? "";
    const transparent = cls.includes("bg-transparent");
    check(
      `${route.path} renders ${route.hero ? "transparent" : "solid"} without JS`,
      transparent === route.hero,
      transparent ? "bg-transparent" : "bg-shell/85 (solid)",
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
    for (let i = 0; i < 40; i++) {
      const state = await page
        .evaluate(() => {
          const h = document.querySelector("header");
          if (!h) return null;
          return h.className.includes("bg-transparent") ? "transparent" : "solid";
        })
        .catch(() => null);
      if (state) seen.add(state);
      await page.waitForTimeout(50);
    }
    const expected = route.hero ? "transparent" : "solid";
    check(
      `${route.path} holds one state through load`,
      seen.size === 1 && seen.has(expected),
      `observed: ${[...seen].join(" -> ") || "(none)"} (expected only "${expected}")`,
    );
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${failed} failure(s)`);
if (failed === 0) {
  console.log("NAV FLASH GUARD OK - the bar is right before JavaScript runs, and never flips");
} else {
  console.log("NAV FLASH GUARD FAILED");
  process.exitCode = 1;
}
