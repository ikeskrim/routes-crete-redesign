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
 *   3. HSTS does NOT carry includeSubDomains or preload — those commit the
 *      whole routescrete.gr domain and belong to the cutover, not to a deploy
 *   4. loading the page in Chromium raises ZERO CSP violations, report-only
 *      included — this is what earns the switch from report-only to enforcing
 *   5. /contact's third-party form iframe is sandboxed
 *
 *   node qa/security-headers.mts        (expects a PRODUCTION server:
 *                                        dev deliberately serves no CSP)
 */
import { chromium } from "playwright";
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

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

await preflight(BASE, process.cwd() + "/qa");

console.log("\n[headers] served on every route");
let enforcing = false;
for (const route of ROUTES) {
  const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
  const h = res.headers;
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
  check(
    `${route}: HSTS makes no domain-wide commitment`,
    !/includesubdomains|preload/i.test(hsts),
    hsts || "none",
  );
  if (csp) {
    check(`${route}: CSP forbids framing`, /frame-ancestors 'none'/.test(csp), "frame-ancestors");
    check(`${route}: CSP allows no third-party script`, !/script-src[^;]*https?:/.test(csp), "script-src");
  }
}
console.log(`  note  CSP mode: ${enforcing ? "ENFORCING" : "report-only"}`);

console.log("\n[browser] zero CSP violations, report-only included");
const browser = await chromium.launch();
for (const route of ROUTES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
  // Scroll through once so lazy images, the iframe and deferred chunks all load.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await page.waitForTimeout(1500);
  const violations = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
  const all = [...new Set([...violations, ...consoleCsp])];
  check(`${route}`, all.length === 0, all.length ? all.slice(0, 4).join(" | ") : "no violations");

  if (route === "/contact") {
    const sandbox = await page.evaluate(() => document.querySelector("iframe")?.getAttribute("sandbox") ?? null);
    check("/contact: the form iframe is sandboxed", !!sandbox, sandbox ?? "no sandbox attribute");
  }
  await context.close();
}
await browser.close();

console.log(`\n${failed} failure(s)`);
if (failed === 0) {
  console.log(`SECURITY HEADERS OK - every route served its headers, CSP (${enforcing ? "enforcing" : "report-only"}) saw no violations`);
} else {
  console.log("SECURITY HEADERS FAILED");
  process.exitCode = 1;
}
