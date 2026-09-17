/**
 * Security headers guard.
 *
 * The headers live in next.config.ts. A header that is configured but not
 * served protects nothing, and a Content-Security-Policy that blocks something
 * the site needs fails silently for visitors — so this checks the RESPONSES
 * and a REAL BROWSER, not the config file.
 *
 * Asserts, on every route:
 *   1. CSP (enforcing or report-only), HSTS, X-Frame-Options, nosniff,
 *      Referrer-Policy and Permissions-Policy are served
 *   2. no X-Powered-By header
 *   3. HSTS matches the cutover switch the build declares in its `site-url`
 *      meta (next.config.ts, CUTOVER.md). Before the cutover ("unset", or no
 *      meta on builds older than the switch), it does NOT carry
 *      includeSubDomains or preload: those commit the whole domain and belong
 *      to the cutover, not to a deploy. Once the build declares the canonical
 *      origin (content/site.json brand.url), it MUST carry both, with a
 *      max-age of at least one year (the preload list's minimum). Any other
 *      declared value fails, and so do routes that disagree with each other.
 *   4. loading the page in Chromium raises ZERO CSP violations, report-only
 *      included — this is what earns the switch from report-only to enforcing
 *   X6. the page is scrolled to its end with REAL WHEEL EVENTS, and the guard
 *      asserts the end was reached. Lenis owns the scroll position, and a
 *      `window.scrollTo` loop is not how a reader scrolls: the lazily mounted
 *      booking form (LazyFormEmbed) is inserted by an IntersectionObserver, so
 *      a scroll that never reaches it makes the checks below vacuous.
 *   X7. EVERY iframe on every route carries a sandbox attribute, and on
 *      /contact the frame selected by `iframe[src*="forms.monday.com"]` (not
 *      merely the first iframe in the document) exists after the wheel scroll
 *      and is sandboxed
 *
 *   node qa/security-headers.mts        (expects a PRODUCTION server:
 *                                        dev deliberately serves no CSP)
 */
import fs from "node:fs";
import { chromium, type Page } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

const ROUTES = [
  "/",
  "/experiences",
  "/experiences/kourtaliotis-temple-of-nature",
  "/experiences/heart-of-cretan-tradition",
  "/transfers",
  "/transfers/private-transfers-rethymno",
  "/contact",
  "/credits",
  "/this-route-does-not-exist",
];

const VIEWPORT = { width: 1440, height: 900 };

/* The canonical origin: the only value the cutover switch may declare. */
const CANONICAL = (
  JSON.parse(fs.readFileSync("content/site.json", "utf8")) as { brand: { url: string } }
).brand.url.replace(/\/$/, "");

/** The cutover switch a page declares in `<meta name="site-url">`. */
function declaredSwitch(html: string): string {
  const tag = html.match(/<meta[^>]+name="site-url"[^>]*>/)?.[0];
  if (!tag) return "absent";
  return tag.match(/content="([^"]*)"/)?.[1] ?? "absent";
}
const MONDAY_FRAME = 'iframe[src*="forms.monday.com"]';

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const readScroll = () => ({
  y: Math.round(window.scrollY),
  maxY: Math.max(0, Math.round(document.documentElement.scrollHeight - window.innerHeight)),
});

/** Wait until two consecutive samples of scrollY agree (Lenis eases). */
async function settleScroll(page: Page) {
  let settled = -1;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(200);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === settled) break;
    settled = y;
  }
}

/**
 * X6: scroll the whole page with real wheel events, the way a reader does.
 * The pointer rests 8 px from the left edge, outside every content column, so
 * the wheel never lands on the (cross-origin) form frame once it mounts.
 * Returns the final position and whether the end of the page was reached.
 */
async function wheelToEnd(page: Page) {
  await page.mouse.move(8, Math.round(VIEWPORT.height / 2));
  let stalls = 0;
  let wheels = 0;
  for (; wheels < 400; wheels++) {
    const before = await page.evaluate(readScroll);
    if (before.y >= before.maxY - 2) {
      // At the end as far as the page knows: let the glide and late layout settle, then re-read.
      await settleScroll(page);
      const again = await page.evaluate(readScroll);
      if (again.y >= again.maxY - 2) break;
    }
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(120);
    const after = await page.evaluate(readScroll);
    stalls = after.y > before.y ? 0 : stalls + 1;
    if (stalls >= 25) break;
  }
  await settleScroll(page);
  const end = await page.evaluate(readScroll);
  return { ...end, wheels, reached: end.y >= end.maxY - 2 };
}

await preflight(BASE, process.cwd() + "/qa");

console.log("\n[headers] served on every route");
let enforcing = false;
const declared = new Set<string>();
for (const route of ROUTES) {
  const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
  const h = res.headers;
  const site = declaredSwitch(await res.text());
  declared.add(site);
  const csp = h.get("content-security-policy") ?? h.get("content-security-policy-report-only");
  if (h.get("content-security-policy")) enforcing = true;
  const hsts = h.get("strict-transport-security") ?? "";
  const missing = [
    csp ? null : "CSP",
    hsts ? null : "Strict-Transport-Security",
    h.get("x-frame-options") ? null : "X-Frame-Options",
    h.get("x-content-type-options") === "nosniff" ? null : "X-Content-Type-Options",
    h.get("referrer-policy") ? null : "Referrer-Policy",
    h.get("permissions-policy") ? null : "Permissions-Policy",
  ].filter(Boolean);
  check(`${route} (${res.status})`, missing.length === 0, missing.length ? `missing ${missing.join(", ")}` : "all six present");
  check(`${route}: no X-Powered-By`, !h.get("x-powered-by"), h.get("x-powered-by") ?? "absent");
  if (site === "unset" || site === "absent") {
    check(
      `${route}: HSTS makes no domain-wide commitment (cutover switch ${site})`,
      !/includesubdomains|preload/i.test(hsts),
      hsts || "none",
    );
  } else if (site === CANONICAL) {
    const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? 0);
    check(
      `${route}: HSTS carries the cutover commitment (switch on: ${site})`,
      /includesubdomains/i.test(hsts) && /(^|;)\s*preload\s*(;|$)/i.test(hsts) && maxAge >= 31536000,
      hsts || "none",
    );
  } else {
    check(`${route}: the cutover switch declares the canonical origin or "unset"`, false, `site-url "${site}", canonical ${CANONICAL}`);
  }
  if (csp) {
    check(`${route}: CSP forbids framing`, /frame-ancestors 'none'/.test(csp), "frame-ancestors");
    check(`${route}: CSP allows no third-party script`, !/script-src[^;]*https?:/.test(csp), "script-src");
  }
}
console.log(`  note  CSP mode: ${enforcing ? "ENFORCING" : "report-only"}`);
check("every route declares the same cutover switch", declared.size === 1, [...declared].join(", "));

console.log("\n[browser] zero CSP violations (report-only included), wheel scroll to the end, every iframe sandboxed");
const browser = await chromium.launch();
for (const route of ROUTES) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.disposition} ${e.effectiveDirective} ${e.blockedURI || "(inline)"}`,
      );
    });
  });
  const consoleCsp: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Content-Security-Policy/i.test(msg.text())) consoleCsp.push(msg.text().slice(0, 160));
  });
  await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60_000 });

  // X6: scroll through once with the wheel so lazy images, the form frame and deferred chunks all load.
  const scroll = await wheelToEnd(page);
  check(
    `X6 ${route}: wheel scroll reached the page end`,
    scroll.reached,
    `scrollY ${scroll.y} of ${scroll.maxY} after ${scroll.wheels} wheel event(s)`,
  );

  // X7 (/contact): the booking form frame must have mounted; wait for it before counting violations,
  // so a violation its load raises is not read too early.
  let mondaySandbox: string | null | undefined;
  if (route === "/contact") {
    const frame = await page
      .waitForSelector(MONDAY_FRAME, { state: "attached", timeout: 10_000 })
      .catch(() => null);
    mondaySandbox = frame ? await frame.getAttribute("sandbox") : undefined;
  }

  await page.waitForTimeout(1500);
  const violations = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
  const all = [...new Set([...violations, ...consoleCsp])];
  check(`${route}`, all.length === 0, all.length ? all.slice(0, 4).join(" | ") : "no violations");

  // X7: every iframe, not the first one. A value is required, as it always was (an empty
  // attribute failed the original `!!getAttribute("sandbox")` test and still fails).
  const frames = await page.evaluate(() =>
    [...document.querySelectorAll("iframe")].map((f) => ({
      src: f.getAttribute("src") || "(no src)",
      sandbox: f.getAttribute("sandbox"),
    })),
  );
  const bare = frames.filter((f) => !f.sandbox);
  check(
    `X7 ${route}: every iframe sandboxed`,
    bare.length === 0,
    bare.length
      ? `${bare.length} of ${frames.length} iframe without sandbox: ${bare.map((f) => f.src.slice(0, 80)).join(", ")}`
      : `${frames.length} iframe(s), all sandboxed`,
  );

  if (route === "/contact") {
    check(
      "X7 /contact: the forms.monday.com iframe is sandboxed",
      !!mondaySandbox,
      mondaySandbox === undefined
        ? "X7: no forms.monday.com iframe after wheel scroll"
        : mondaySandbox
          ? `sandbox="${mondaySandbox}"`
          : "forms.monday.com iframe without sandbox",
    );
  }
  await context.close();
}
await browser.close();

console.log(`\n${failed} failure(s)`);
if (failed === 0) {
  console.log(
    `SECURITY HEADERS OK - every route served its headers, CSP (${enforcing ? "enforcing" : "report-only"}) saw no violations, every iframe sandboxed (forms.monday.com mounted by wheel scroll)`,
  );
} else {
  console.log("SECURITY HEADERS FAILED");
  process.exitCode = 1;
}
