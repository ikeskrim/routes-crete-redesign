/**
 * Asset-reference audit.
 *
 * Proves there are no dangling image paths after the grade repoint: every
 * image referenced in the rendered HTML of every route resolves to a file that
 * actually serves. Mechanical, so a broken path can never reach a visual pass.
 *
 * What "referenced" means (C+ SPEC §I.1, S1q instrument):
 *   - the raw-HTML regexes this audit always had (next/image `url=` values and
 *     quoted or `(`-prefixed /images/ paths), kept exactly, so nothing they
 *     found can stop being found;
 *   - the PARSED DOM, read twice per route: with JavaScript disabled (the
 *     server document as the browser parses it) and after hydration:
 *       srcset  every candidate of every `img`/`source` srcset and `link`
 *               imagesrcset. The raw regex only ever reached a srcset's FIRST
 *               candidate, because a quote happened to precede it; a path in
 *               any later candidate was invisible;
 *       src     `img`/`source`/`input` src, `video` poster, SVG `image` href,
 *               preload/prefetch/icon link hrefs;
 *   - CSS url() (and image-set() strings) in every stylesheet the page links
 *     (fetched, @import followed), in <style> elements and in style
 *     attributes. A module-CSS background lives in a /_next/static chunk the
 *     raw HTML never contains, so it was invisible before.
 *   Every ungraded path is listed with the extractors that found it.
 *
 * Anchor ids are counted as ELEMENTS in the parsed DOM (server document and
 * hydrated document); the raw-HTML token count this audit used before is kept
 * beside them, and all three must be exactly 1.
 *
 * NEVER_GRADE is read from src/lib/content.ts, the list graded() itself uses,
 * instead of trusting any path that merely contains "qr-code" or "/brand/"; a
 * file it cannot be read from throws "NEVER_GRADE not found". With it and
 * GRADE, the audit mirrors graded() over every content image and requires the
 * file it resolves to: an asset dropped from the list sends the loader to a
 * graded copy that does not exist, which the rendered HTML alone cannot see
 * when no route happens to render that asset.
 *
 *   node qa/asset-audit.mts        (expects the production server)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const ORIGIN = new URL(BASE).origin;
const ROOT = process.cwd();

const ROUTES = [
  "/",
  "/experiences",
  "/experiences/kourtaliotis-temple-of-nature",
  "/experiences/heart-of-cretan-tradition",
  "/transfers",
  "/transfers/private-transfers-rethymno",
  "/contact",
  "/this-route-does-not-exist",
];

/* ------------------------------------------------ the site's own constants */
const CONTENT_TS = "src/lib/content.ts";
const EDITION_TS = "src/lib/edition.ts";

/** `const NEVER_GRADE = ["…", …]` → its string entries. Throws when absent. */
function readNeverGrade(source: string): string[] {
  const body = source.match(/\bconst\s+NEVER_GRADE\b[^=\n]*=\s*\[([\s\S]*?)\]/)?.[1];
  const entries = body ? [...body.matchAll(/(["'`])(.*?)\1/g)].map((m) => m[2]) : [];
  if (!body || entries.length === 0) {
    throw new Error(
      `NEVER_GRADE not found in ${CONTENT_TS} (expected a non-empty \`const NEVER_GRADE = ["/images/…"]\`)`,
    );
  }
  return entries;
}

/** The live grade letter: content.ts's own constant, or, once content.ts
 *  imports GRADE (SPEC §0.2 S9), the constant in edition.ts. Throws when absent. */
function readGrade(source: string): string {
  const literal = (s: string) => s.match(/\bconst\s+GRADE\b[^=\n]*=\s*["']([a-z])["']/)?.[1];
  const own = literal(source);
  if (own) return own;
  const imported = /import\s*(?:type\s*)?\{[^}]*\bGRADE\b[^}]*\}\s*from\s*["'][^"']*edition["']/.test(source);
  if (imported && existsSync(path.join(ROOT, EDITION_TS))) {
    const fromEdition = literal(readFileSync(path.join(ROOT, EDITION_TS), "utf8"));
    if (fromEdition) return fromEdition;
  }
  throw new Error(`GRADE constant not found in ${CONTENT_TS}`);
}

const { NEVER_GRADE, GRADE } = (() => {
  try {
    const source = readFileSync(path.join(ROOT, CONTENT_TS), "utf8");
    return { NEVER_GRADE: readNeverGrade(source), GRADE: readGrade(source) };
  } catch (e) {
    console.log(`\n${(e as Error).message}\n\nASSET AUDIT FAILED`);
    throw e;
  }
})();
console.log(`site constants from ${CONTENT_TS}: GRADE "${GRADE}", NEVER_GRADE ${JSON.stringify(NEVER_GRADE)}\n`);

/* The classes of asset this audit has always let stay ungraded. An entry of
 * NEVER_GRADE is exempt only inside them, so listing a photograph there can
 * never make an ungraded photograph pass. */
const exemptClass = (src: string) => src.includes("qr-code") || src.includes("/brand/");
const neverGraded = (src: string) => NEVER_GRADE.includes(src) && exemptClass(src);

/* ------------------------------------------------------------- extraction */

/** Pull every image URL out of rendered HTML, including next/image srcsets. */
function extractImages(html: string): Set<string> {
  const found = new Set<string>();

  // next/image rewrites to /_next/image?url=<encoded>&w=..&q=..
  for (const m of html.matchAll(/\/_next\/image\?url=([^&"'\\]+)/g)) {
    found.add(decodeURIComponent(decodeURIComponent(m[1])));
  }
  // Plain references (og:image, direct src, CSS url()).
  for (const m of html.matchAll(/["'(](\/images\/[^"')\s\\]+\.(?:jpg|jpeg|png|webp|avif))/gi)) {
    found.add(m[1]);
  }
  return found;
}

type Kind = "html" | "src" | "srcset" | "css url()";
const KINDS: Kind[] = ["html", "src", "srcset", "css url()"];

const IMAGE_PATH = /^\/images\/.+\.(?:jpg|jpeg|png|webp|avif)$/i;

/** A same-origin /images/ path from a URL as authored (next/image unwrapped). */
function imagePath(raw: string, base: string, depth = 0): string | null {
  const v = raw.trim();
  if (!v || v.startsWith("#") || /^(?:data|blob|about|javascript):/i.test(v)) return null;
  let u: URL;
  try {
    u = new URL(v, base);
  } catch {
    return null;
  }
  if (u.origin !== ORIGIN) return null;
  if (u.pathname === "/_next/image") {
    const inner = u.searchParams.get("url");
    return inner && depth < 3 ? imagePath(inner, base, depth + 1) : null;
  }
  let p = u.pathname;
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep the encoded path */
  }
  return IMAGE_PATH.test(p) ? p : null;
}

/** Every URL candidate of a srcset (HTML's parsing rule, descriptors dropped). */
function srcsetUrls(srcset: string): string[] {
  const urls: string[] = [];
  let i = 0;
  while (i < srcset.length) {
    while (i < srcset.length && /[\s,]/.test(srcset[i])) i++;
    if (i >= srcset.length) break;
    let j = i;
    while (j < srcset.length && !/\s/.test(srcset[j])) j++;
    let url = srcset.slice(i, j);
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
    } else {
      let depth = 0;
      for (; j < srcset.length; j++) {
        const c = srcset[j];
        if (c === "(") depth++;
        else if (c === ")") depth--;
        else if (c === "," && depth <= 0) break;
      }
    }
    if (url) urls.push(url);
    i = j;
  }
  return urls;
}

/** url() values and image-set() strings in CSS text. Comments are NOT
 *  stripped: a path in one is only ever an extra candidate. */
function cssUrls(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^"'()\s]*))\s*\)/gi)) {
    out.push((m[1] ?? m[2] ?? m[3] ?? "").replace(/\\(.)/g, "$1"));
  }
  let i = 0;
  while ((i = css.indexOf("image-set(", i)) !== -1) {
    let j = i + "image-set(".length;
    for (let depth = 1; j < css.length && depth > 0; j++) {
      if (css[j] === "(") depth++;
      else if (css[j] === ")") depth--;
    }
    for (const m of css.slice(i, j).matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)) {
      out.push(m[1] ?? m[2] ?? "");
    }
    i = j;
  }
  return out;
}

/* Runs in the page: Playwright serialises it, so it may use nothing from this
   module's scope beyond its one argument. */
const probe = (ids: string[]) => {
  const refs: { kind: string; value: string }[] = [];
  const push = (kind: string, value: string | null) => {
    if (value) refs.push({ kind, value });
  };
  for (const el of document.querySelectorAll("img, source, input, video, link")) {
    const tag = el.localName;
    if (tag === "img" || tag === "source" || tag === "input") push("src", el.getAttribute("src"));
    if (tag === "video") push("src", el.getAttribute("poster"));
    if (tag === "img" || tag === "source") push("srcset", el.getAttribute("srcset"));
    if (tag === "link") {
      push("srcset", el.getAttribute("imagesrcset"));
      if (/(^|\s)(preload|prefetch|icon|apple-touch-icon)(\s|$)/i.test(el.getAttribute("rel") ?? "")) {
        push("src", el.getAttribute("href"));
      }
    }
  }
  for (const el of document.querySelectorAll("image")) {
    push("src", el.getAttribute("href") ?? el.getAttributeNS("http://www.w3.org/1999/xlink", "href"));
  }
  for (const el of document.querySelectorAll("[style]")) push("style", el.getAttribute("style"));
  const styles = [...document.querySelectorAll("style")].map((s) => s.textContent ?? "");
  const sheets = [...document.querySelectorAll("link[href]")]
    .filter((l) => /(^|\s)stylesheet(\s|$)/i.test(l.getAttribute("rel") ?? ""))
    .map((l) => (l as HTMLLinkElement).href);
  const counts: Record<string, number> = {};
  for (const id of ids) counts[id] = document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length;
  return { url: location.href, refs, styles, sheets, counts };
};

let checked = 0;
let failures = 0;
/** path → which extractors found it, on which routes */
const seen = new Map<string, { kinds: Set<Kind>; routes: Set<string> }>();

/* Stylesheets are shared across routes: fetch and parse each once. */
const sheetPaths = new Map<string, string[] | null>();
const sheetFailures: string[] = [];
async function readSheet(href: string, depth = 0): Promise<string[]> {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return [];
  }
  if (u.origin !== ORIGIN || depth > 5) return [];
  if (!sheetPaths.has(u.href)) {
    sheetPaths.set(u.href, null);
    const res = await fetch(u.href).catch(() => null);
    if (!res || !res.ok) {
      sheetFailures.push(`${u.pathname} — ${res?.status ?? "unreachable"}`);
      return [];
    }
    const css = await res.text();
    const paths = cssUrls(css)
      .map((v) => imagePath(v, u.href))
      .filter((p): p is string => !!p);
    for (const m of css.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi)) {
      paths.push(...(await readSheet(new URL(m[1], u.href).href, depth + 1)));
    }
    sheetPaths.set(u.href, paths);
  }
  return sheetPaths.get(u.href) ?? [];
}

const ANCHOR_IDS = ["experiences", "transfers", "why-us", "how-to-book", "positioning"];
const idCounts: Record<string, { server: number; hydrated: number; raw: number }> = {};
let srcsetCandidates = 0;
const routesWithoutSheets: string[] = [];

const browser = await chromium.launch();
try {
  const serverCtx = await browser.newContext({ javaScriptEnabled: false });
  // The server document is only parsed, never painted: skip the bytes.
  await serverCtx.route("**/*", (r) =>
    ["image", "media", "font"].includes(r.request().resourceType()) ? r.abort() : r.continue(),
  );
  const hydratedCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const serverPage = await serverCtx.newPage();
  const hydratedPage = await hydratedCtx.newPage();

  for (const route of ROUTES) {
    const res = await fetch(`${BASE}${route}`);
    const html = await res.text();
    const images = new Set<string>();
    const byKind = Object.fromEntries(KINDS.map((k) => [k, new Set<string>()])) as Record<Kind, Set<string>>;
    const note = (p: string | null, kind: Kind) => {
      if (!p) return;
      const entry = seen.get(p) ?? { kinds: new Set<Kind>(), routes: new Set<string>() };
      entry.kinds.add(kind);
      entry.routes.add(route);
      seen.set(p, entry);
      images.add(p);
      byKind[kind].add(p);
    };

    for (const src of extractImages(html)) note(src, "html");
    if (route === "/") {
      for (const id of ANCHOR_IDS) {
        idCounts[id] = { server: 0, hydrated: 0, raw: html.split(`id="${id}"`).length - 1 };
      }
    }

    let sheetsOnRoute = 0;
    for (const [label, page] of [
      ["server", serverPage],
      ["hydrated", hydratedPage],
    ] as const) {
      await page.goto(`${BASE}${route}`, {
        waitUntil: label === "server" ? "domcontentloaded" : "load",
        timeout: 90_000,
      });
      if (label === "hydrated") await page.waitForTimeout(1_500);
      const p = await page.evaluate(probe, route === "/" ? ANCHOR_IDS : []);

      for (const ref of p.refs) {
        if (ref.kind === "src") note(imagePath(ref.value, p.url), "src");
        if (ref.kind === "srcset") {
          for (const candidate of srcsetUrls(ref.value)) {
            srcsetCandidates++;
            note(imagePath(candidate, p.url), "srcset");
          }
        }
        if (ref.kind === "style") for (const v of cssUrls(ref.value)) note(imagePath(v, p.url), "css url()");
      }
      for (const css of p.styles) for (const v of cssUrls(css)) note(imagePath(v, p.url), "css url()");
      sheetsOnRoute += p.sheets.length;
      for (const href of p.sheets) for (const v of await readSheet(href)) note(v, "css url()");
      if (route === "/") for (const id of ANCHOR_IDS) idCounts[id][label] = p.counts[id] ?? 0;
    }
    if (sheetsOnRoute === 0) routesWithoutSheets.push(route);

    console.log(
      `${route.padEnd(46)} ${String(res.status).padEnd(4)} ${images.size} image refs  (${KINDS.map((k) => `${k} ${byKind[k].size}`).join(", ")})`,
    );
  }
} finally {
  await browser.close();
}

console.log(`\nunique image paths referenced: ${seen.size}`);

/* The extractors must have had something to read: an audit that parsed no
 * stylesheet or no srcset would pass every route while proving nothing. */
console.log(`\nextraction: ${sheetPaths.size} stylesheet(s) read, ${srcsetCandidates} srcset candidate(s) parsed`);
for (const s of sheetFailures) {
  console.log(`  FAIL  stylesheet unreadable ${s}`);
  failures++;
}
for (const r of routesWithoutSheets) {
  console.log(`  FAIL  ${r} — no stylesheet link found, css url() extraction read nothing`);
  failures++;
}
if (srcsetCandidates === 0) {
  console.log("  FAIL  no srcset candidate parsed on any route");
  failures++;
}

/* Every graded photograph the site renders must have a blur placeholder.
 *
 * `content/blur-map.json` is keyed by the GRADED path. It was built with keys
 * under /images/graded/b/, and when the grade flipped to C every lookup
 * missed: `getBlur()` returned undefined, next/image quietly rendered no
 * placeholder, and the whole site — hero included — shipped without blur from
 * that commit on. Nothing failed and no guard noticed; it was found by
 * reading the live HTML. A silently-optional placeholder is exactly the kind
 * of regression this audit exists to make loud. */
const blurMap = JSON.parse(
  await fs.readFile(path.join(process.cwd(), "content", "blur-map.json"), "utf8"),
) as Record<string, string>;

const ungraded: string[] = [];
const missingBlur: string[] = [];
for (const src of [...seen.keys()].sort()) {
  const head = await fetch(`${BASE}${src}`, { method: "HEAD" });
  checked++;
  if (!head.ok) {
    console.log(`  DANGLING ${head.status}  ${src}${src.startsWith("/images/graded/") ? "  (missing graded file)" : ""}`);
    failures++;
  }
  // Everything photographic should be coming from the graded tree now.
  if (!src.startsWith("/images/graded/") && !neverGraded(src)) {
    ungraded.push(src);
  }
  if (src.startsWith("/images/graded/") && !blurMap[src]) {
    missingBlur.push(src);
  }
}

console.log(`\nchecked ${checked} paths, ${failures} dangling`);
if (missingBlur.length) {
  console.log(`\n${missingBlur.length} graded image(s) with NO blur placeholder in content/blur-map.json:`);
  missingBlur.forEach((s) => console.log(`  ${s}`));
  console.log(`  regenerate:  powershell -File qa/blur-map.ps1`);
  failures += missingBlur.length;
}

/* Social images are the one class of image URL that must be ABSOLUTE and must
 * resolve on the origin actually serving this build. They shipped pointing at
 * https://www.routescrete.gr/..., which 404s until DNS cutover — so every
 * share of the preview rendered with no image at all, while every on-page
 * image was fine. The canonical link deliberately still points at
 * routescrete.gr; that is the duplicate-content guard and is checked here too
 * so a future "fix" cannot quietly move it. */
/* Anchor ids must be UNIQUE, not merely present. A Stage 1 check counted
 * presence and passed while the homepage shipped id="transfers" twice — so the
 * legacy anchor resolved to an empty sr-only span instead of the transfer
 * content. Duplicate ids are invalid HTML and silently break deep links.
 *
 * Counted as elements of the parsed document, before and after hydration (an
 * id a client component adds is as broken as a server one), with the raw-HTML
 * token count kept beside them. */
console.log("\nlegacy anchor ids (on /: elements in the server DOM and the hydrated DOM, raw HTML tokens)");
{
  // #team was retired with its section on 2026-09-11; the legacy anchor now
  // maps to #positioning, which therefore has to exist exactly once.
  for (const id of ANCHOR_IDS) {
    const c = idCounts[id] ?? { server: 0, hydrated: 0, raw: 0 };
    const ok = c.server === 1 && c.hydrated === 1 && c.raw === 1;
    const n = ok ? 1 : Math.max(c.server, c.hydrated, c.raw) > 1 ? Math.max(c.server, c.hydrated, c.raw) : 0;
    console.log(
      `  ${ok ? "ok   " : "FAIL "} id ${id} ×${n} (server DOM ×${c.server}, hydrated DOM ×${c.hydrated}, raw HTML ×${c.raw})`,
    );
    if (!ok) failures++;
  }
}

/* Retired photographs stay retired. The team photographs were moved out of
 * public/ when the section came out, so no URL — original or graded — may
 * serve them. A 200 here means a copy crept back into the deploy. */
console.log("\nretired assets");
/* Under every grade letter that exists, not a fixed c/b pair: a regrade to a
 * new letter is exactly the moment a retired photograph could slip back in. */
const RETIRED = ["antonios-tzagkarakis.jpg", "stavros-kapetanakis.jpg", "daria.jpg"];
const gradeLetters = (await fs.readdir(path.join(process.cwd(), "public", "images", "graded"), { withFileTypes: true }))
  .filter((d) => d.isDirectory() && /^[a-z]$/.test(d.name))
  .map((d) => d.name);
for (const src of [
  ...RETIRED.map((f) => `/images/team/${f}`),
  ...gradeLetters.flatMap((g) => RETIRED.map((f) => `/images/graded/${g}/team/${f}`)),
]) {
  const res = await fetch(`${BASE}${src}`, { method: "HEAD" });
  const ok = res.status === 404;
  console.log(`  ${ok ? "ok   " : "FAIL "} ${src} — ${res.status}`);
  if (!ok) failures++;
}

console.log("\nsocial images");
let socialFailures = 0;
for (const route of ["/", "/experiences/kourtaliotis-temple-of-nature"]) {
  const html = await (await fetch(`${BASE}${route}`)).text();
  const grab = (re: RegExp) => html.match(re)?.[1];
  const ogImage = grab(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
  const canonical = grab(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);

  if (!ogImage) {
    console.log(`  FAIL  ${route} — no og:image`);
    socialFailures++;
    continue;
  }
  if (!/^https?:\/\//.test(ogImage)) {
    console.log(`  FAIL  ${route} — og:image is not absolute: ${ogImage}`);
    socialFailures++;
    continue;
  }

  /* A local build has no serving origin to bake in — there is no port at
     build time — so it correctly falls back to the canonical origin, which
     does not resolve yet. That is by design, not a regression, so the
     resolve check only runs against a real deployment. */
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
  if (local) {
    console.log(`  skip  ${route} — og:image resolution not assertable on a local build (${ogImage})`);
  } else {
    const sameOrigin = new URL(ogImage).origin === new URL(BASE).origin;
    const res = await fetch(ogImage, { method: "HEAD" }).catch(() => null);
    const ok = !!res && res.status < 400 && sameOrigin;
    console.log(
      `  ${ok ? "ok   " : "FAIL "} ${route} — og:image ${res?.status ?? "unreachable"}${sameOrigin ? "" : ", WRONG ORIGIN"} ${ogImage}`,
    );
    if (!ok) socialFailures++;
  }

  const canonicalOk = !!canonical && /routescrete\.gr/.test(canonical);
  console.log(
    `  ${canonicalOk ? "ok   " : "FAIL "} ${route} — canonical stays on routescrete.gr: ${canonical}`,
  );
  if (!canonicalOk) socialFailures++;
}
failures += socialFailures;

/* The file behind every content image, resolved the way graded() resolves it
 * (GRADE and NEVER_GRADE as read above; provenance keys skipped, as regrade()
 * skips them). Covers the content the loader regrades — site.json and both
 * collections — whether or not a route renders the asset today. */
{
  const gradedOf = (src: string) =>
    !src.startsWith("/images/") || src.startsWith("/images/graded/") || NEVER_GRADE.includes(src)
      ? src
      : src.replace(/^\/images\//, `/images/graded/${GRADE}/`).replace(/\.(png|jpeg|JPG|PNG)$/i, ".jpg");

  const contentImages = new Map<string, string>();
  const walk = (v: unknown, where: string, key: string) => {
    if (typeof v === "string") {
      if (v.startsWith("/images/") && !contentImages.has(v)) contentImages.set(v, `${where} ${key}`);
    } else if (Array.isArray(v)) {
      v.forEach((x) => walk(x, where, key));
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        if (k === "oldUrl" || k.endsWith("Original")) continue;
        walk(x, where, k);
      }
    }
  };
  const files = [
    "site.json",
    ...["experiences", "transfers"].flatMap((c) =>
      existsSync(path.join(ROOT, "content", c))
        ? readdirSync(path.join(ROOT, "content", c))
            .filter((f) => f.endsWith(".json"))
            .map((f) => `${c}/${f}`)
        : [],
    ),
  ];
  for (const f of files) walk(JSON.parse(readFileSync(path.join(ROOT, "content", f), "utf8")), f, "");

  console.log(`\ngraded files behind content images (graded() with GRADE "${GRADE}" and NEVER_GRADE from ${CONTENT_TS})`);
  let missing = 0;
  for (const [src, where] of [...contentImages].sort(([a], [b]) => a.localeCompare(b))) {
    const target = gradedOf(src);
    if (existsSync(path.join(ROOT, "public", target))) continue;
    missing++;
    const exempt = target === src;
    const masterServed = existsSync(path.join(ROOT, "public", src));
    console.log(
      `  FAIL  ${exempt ? "missing file" : "missing graded file"} ${target}  (content ${where}: ${src}${
        !exempt && masterServed ? "; its master is in public/ — grade it, or keep it in NEVER_GRADE" : ""
      })`,
    );
  }
  console.log(`  ${contentImages.size} content image path(s), ${missing} missing`);
  if (contentImages.size === 0) {
    console.log("  FAIL  no content image path read");
    failures++;
  }
  failures += missing;
}

if (ungraded.length) {
  console.log(`\n${ungraded.length} path(s) still bypassing the grade:`);
  ungraded.forEach((s) => {
    const r = seen.get(s)!;
    const listed = NEVER_GRADE.includes(s) ? "; listed in NEVER_GRADE but not a QR code or brand asset" : "";
    console.log(`  ${s}  [found by: ${KINDS.filter((k) => r.kinds.has(k)).join(", ")}; on: ${[...r.routes].join(", ")}${listed}]`);
  });
}

if (failures === 0 && ungraded.length === 0) {
  console.log(
    "\nASSET AUDIT OK - every reference resolves, everything photographic is graded and has a blur placeholder",
  );
} else {
  console.log("\nASSET AUDIT FAILED");
  process.exitCode = 1;
}
