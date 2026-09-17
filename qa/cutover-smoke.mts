/**
 * Cutover smoke check (CUTOVER.md steps 4 and 11).
 *
 * The functional checks DEPLOYMENT.md listed as boxes to tick by hand, made
 * executable, so cutover day is one command per host. Everything a visitor, a
 * bookmark or a printed brochure depends on:
 *
 *   S1. the brochure is served byte-exact (size and SHA-256 equal to
 *       public/assets/files/entypo.pdf)
 *   S2. /index.html and every legacy image URL (`oldUrl` in content/, Greek
 *       file names included) answer 308 to their new path on the same host,
 *       and the three retired team photographs are not served at all
 *   S3. the six legacy one-pager anchors land where legacyAnchorMap says: a
 *       section id is scrolled into view under the masthead, a path is
 *       navigated to
 *   S4. /credits answers 200 and links every ledgered photograph's licence
 *       and source
 *   S5. the WhatsApp links carry their pre-filled message (a tour page's names
 *       the tour) and /contact dials both published numbers
 *   S6. the Monday.com form mounts on /contact after a real scroll, sandboxed
 *   S7. unknown URLs answer 404 with the site's masthead
 *   S8. sitemap.xml and robots.txt name the canonical origin and every page
 *       tested declares a canonical on it. On the canonical host itself, that
 *       canonical is self-referencing, the apex redirects to it and plain
 *       HTTP redirects to HTTPS.
 *
 *   QA_BASE_URL=https://www.routescrete.gr node qa/cutover-smoke.mts
 *   (default: the local production server on 3009)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

import { preflight } from "./preflight.mts";

const BASE = (process.env.QA_BASE_URL ?? "http://localhost:3009").replace(/\/$/, "");
const site = JSON.parse(fs.readFileSync("content/site.json", "utf8")) as {
  brand: { url: string };
  legacyAnchorMap: Record<string, string>;
  contact: { phones: { dial: string }[]; whatsapp?: { dial: string } };
};
const CANONICAL = site.brand.url.replace(/\/$/, "");
const ON_CANONICAL_HOST = new URL(BASE).host === new URL(CANONICAL).host;
const RETIRED = ["/media/team2.jpg", "/media/team3.jpg", "/media/stavros.jpg"];
const TOUR = "kourtaliotis-temple-of-nature";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

await preflight(BASE, process.cwd() + "/qa");
console.log(`cutover smoke against ${BASE}${ON_CANONICAL_HOST ? " (the canonical host)" : ""}`);

/* ---- S1 ------------------------------------------------------------------ */
console.log("\n[S1] the brochure");
{
  /* Pinned, not read from the tree: the file committed in a10f0bd (Phase 1)
     and byte-verified against the old site then. Printed material points at
     it, so neither the served copy nor the repository copy may ever change. */
  const BROCHURE = { bytes: 1120049, sha256: "5b6df68ae2413907602b5627aacabf013438ba32486a59160f82d917d7cf6ac8" };
  const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
  const exact = (b: Buffer) => b.length === BROCHURE.bytes && sha(b) === BROCHURE.sha256;
  const describe = (b: Buffer) => `${b.length} B, sha256 ${sha(b).slice(0, 12)}`;
  const local = fs.readFileSync("public/assets/files/entypo.pdf");
  const res = await fetch(`${BASE}/assets/files/entypo.pdf`);
  const body = Buffer.from(await res.arrayBuffer());
  check("/assets/files/entypo.pdf answers 200 as a PDF", res.status === 200 && /pdf/.test(res.headers.get("content-type") ?? ""), `${res.status} ${res.headers.get("content-type")}`);
  check("served byte-exact (1,120,049 B, pinned SHA-256)", exact(body), describe(body));
  check("the repository copy is the same file", exact(local), describe(local));
}

/* ---- S2 ------------------------------------------------------------------ */
console.log("\n[S2] legacy URLs");
{
  // The same walk as next.config.ts legacyImageRedirects().
  const pairs = new Map<string, string>([["/index.html", "/"]]);
  const collect = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(collect);
    if (!v || typeof v !== "object") return;
    const r = v as Record<string, unknown>;
    const src = r.src ?? r.photo;
    if (typeof r.oldUrl === "string" && typeof src === "string") pairs.set(r.oldUrl, src);
    Object.values(r).forEach(collect);
  };
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".json") && e.name !== "blur-map.json") collect(JSON.parse(fs.readFileSync(full, "utf8")));
    }
  };
  walk("content");
  const wrong: string[] = [];
  for (const [from, to] of pairs) {
    // fetch() percent-encodes a Greek path exactly as a browser does.
    const res = await fetch(`${BASE}${from}`, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    const target = loc ? new URL(loc, `${BASE}/`) : null;
    const ok = res.status === 308 && !!target && target.host === new URL(BASE).host && decodeURI(target.pathname) === to;
    if (!ok) wrong.push(`${from}: ${res.status} to ${loc || "nowhere"}, want 308 to ${to}`);
  }
  check(`${pairs.size} legacy URLs answer 308 to their new path on this host`, wrong.length === 0, wrong.length ? `${wrong.length} wrong` : "");
  wrong.forEach((w) => console.log(`       ${w}`));
  for (const retired of RETIRED) {
    const res = await fetch(`${BASE}${retired}`, { redirect: "manual" });
    check(`${retired} is not served (retired photograph)`, res.status === 404, String(res.status));
  }
}

const browser = await chromium.launch();

/* ---- S3 ------------------------------------------------------------------ */
console.log("\n[S3] legacy one-pager anchors");
for (const [legacy, mapped] of Object.entries(site.legacyAnchorMap)) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${BASE}/${legacy}`, { waitUntil: "load" });
  if (mapped.startsWith("/")) {
    const landed = await page
      .waitForURL((u) => u.pathname === mapped, { timeout: 15000 })
      .then(() => new URL(page.url()).pathname, () => new URL(page.url()).pathname);
    check(`/${legacy} lands on ${mapped}`, landed === mapped, `at ${landed}`);
  } else {
    await page.waitForTimeout(2000);
    const box = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const header = document.querySelector("header[data-site-chrome]")?.getBoundingClientRect().bottom ?? 0;
      return { top: Math.round(el.getBoundingClientRect().top), header: Math.round(header), hash: location.hash };
    }, mapped);
    check(
      `/${legacy} brings ${mapped} under the masthead`,
      !!box && box.top >= box.header - 2 && box.top <= box.header + 120 && box.hash === mapped,
      box ? `top ${box.top} px, masthead ends ${box.header} px, hash ${box.hash}` : `${mapped} is not on the page`,
    );
  }
  await context.close();
}

/* ---- S4 ------------------------------------------------------------------ */
console.log("\n[S4] /credits");
{
  const ledger = JSON.parse(fs.readFileSync("content/photo-credits.json", "utf8")) as {
    photographs: { file: string; licenceUrl: string; source: string }[];
  };
  const res = await fetch(`${BASE}/credits`);
  const html = await res.text();
  const hrefs = new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")));
  check("/credits answers 200", res.status === 200, String(res.status));
  const missing = ledger.photographs.filter((p) => !hrefs.has(p.source) || !hrefs.has(p.licenceUrl));
  check(`all ${ledger.photographs.length} ledgered photographs link their licence and source`, missing.length === 0, missing.map((p) => p.file).join(", "));
}

/* ---- S5 ------------------------------------------------------------------ */
console.log("\n[S5] WhatsApp and telephone links");
{
  const dial = site.contact.whatsapp?.dial;
  check("content/site.json has a WhatsApp number", !!dial);
  const tour = JSON.parse(fs.readFileSync(`content/experiences/${TOUR}.json`, "utf8")) as { title: string };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const waLinks = () => page.$$eval('a[href^="https://wa.me/"]', (as) => as.map((a) => a.getAttribute("href") ?? ""));
  const messages = (links: string[]) =>
    links.filter((h) => h.startsWith(`https://wa.me/${dial}?text=`)).map((h) => decodeURIComponent(h.split("?text=")[1]));

  await page.goto(`${BASE}/experiences/${TOUR}`, { waitUntil: "load" });
  const onTour = messages(await waLinks());
  check(`/experiences/${TOUR}: a WhatsApp message names the tour`, onTour.some((m) => m.includes(`"${tour.title}"`)), `${onTour.length} pre-filled link(s)`);

  await page.goto(`${BASE}/contact`, { waitUntil: "load" });
  const onContact = messages(await waLinks());
  check("/contact: a pre-filled WhatsApp message", onContact.some((m) => m.trim().length > 0), `${onContact.length} link(s)`);
  const tels = await page.$$eval('a[href^="tel:"]', (as) => as.map((a) => a.getAttribute("href") ?? ""));
  for (const phone of site.contact.phones) check(`/contact dials ${phone.dial}`, tels.includes(`tel:${phone.dial}`), tels.join(" "));
  await context.close();
}

/* ---- S6 ------------------------------------------------------------------ */
console.log("\n[S6] the booking form");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/contact`, { waitUntil: "load" });
  // Real wheel events (Lenis swallows window.scrollTo), with the pointer in
  // the page margin.
  await page.mouse.move(8, 450);
  for (let i = 0; i < 40 && !(await page.$('iframe[src*="forms.monday.com"]')); i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(150);
  }
  const frame = await page.$('iframe[src*="forms.monday.com"]');
  const sandbox = frame ? await frame.getAttribute("sandbox") : null;
  check("the Monday.com form mounts after a real scroll", !!frame);
  check("and is sandboxed", !!sandbox, sandbox ?? "no sandbox attribute");
  await context.close();
}
await browser.close();

/* ---- S7 ------------------------------------------------------------------ */
console.log("\n[S7] unknown URLs");
for (const route of ["/this-route-does-not-exist", `/experiences/${TOUR}-does-not-exist`]) {
  const res = await fetch(`${BASE}${route}`);
  const html = await res.text();
  check(`${route} answers 404 with the masthead`, res.status === 404 && /<header[^>]*data-site-chrome/.test(html), String(res.status));
}

/* ---- S8 ------------------------------------------------------------------ */
console.log("\n[S8] origin");
{
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check("sitemap.xml lists URLs on the canonical origin only", locs.length > 0 && locs.every((u) => u === CANONICAL || u.startsWith(`${CANONICAL}/`)), `${locs.length} URL(s)`);
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  check("robots.txt names the canonical sitemap", robots.includes(`Sitemap: ${CANONICAL}/sitemap.xml`), robots.split("\n").find((l) => l.startsWith("Sitemap")) ?? "no Sitemap line");
  for (const route of ["/", "/experiences", `/experiences/${TOUR}`, "/transfers", "/contact", "/credits"]) {
    const res = await fetch(`${BASE}${route}`);
    const canonical = (await res.text()).match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
    const want = `${CANONICAL}${route === "/" ? "" : route}`;
    const note = ON_CANONICAL_HOST ? "self-referencing" : "pointing at the canonical origin";
    check(`${route}: canonical ${note}`, canonical.replace(/\/$/, "") === want, canonical || "none");
  }
  if (ON_CANONICAL_HOST) {
    const apex = CANONICAL.replace("://www.", "://");
    const a = await fetch(`${apex}/experiences`, { redirect: "manual" });
    check(`${apex} redirects to ${CANONICAL}, path kept`, [301, 308].includes(a.status) && a.headers.get("location") === `${CANONICAL}/experiences`, `${a.status} to ${a.headers.get("location")}`);
    // Vercel answers the apex itself, so its HSTS may not be the site's. An
    // includeSubDomains there covers mail.routescrete.gr too (CUTOVER.md 17).
    console.log(`  note the apex sends HSTS "${a.headers.get("strict-transport-security") ?? "none"}"`);
    for (const host of [CANONICAL, apex]) {
      const plain = await fetch(`${host.replace("https://", "http://")}/`, { redirect: "manual" });
      check(`${host.replace("https://", "http://")} redirects to HTTPS`, [301, 302, 307, 308].includes(plain.status) && (plain.headers.get("location") ?? "").startsWith("https://"), `${plain.status} to ${plain.headers.get("location")}`);
    }
  } else {
    console.log(`  note ${new URL(BASE).host} is not the canonical host: the apex and HTTP redirects are checked on cutover day`);
  }
}

console.log("");
if (failed) {
  console.log(`CUTOVER SMOKE FAILED: ${failed} check(s)`);
  process.exitCode = 1;
} else {
  console.log("CUTOVER SMOKE OK");
}
