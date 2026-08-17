/**
 * Asset-reference audit.
 *
 * Proves there are no dangling image paths after the grade repoint: every
 * image referenced in the rendered HTML of every route resolves to a file that
 * actually serves. Mechanical, so a broken path can never reach a visual pass.
 *
 *   node qa/asset-audit.mts        (expects the production server)
 */
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

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

let checked = 0;
let failures = 0;
const seen = new Map<string, number>();

for (const route of ROUTES) {
  const res = await fetch(`${BASE}${route}`);
  const html = await res.text();
  const images = extractImages(html);
  for (const src of images) seen.set(src, (seen.get(src) ?? 0) + 1);
  console.log(`${route.padEnd(46)} ${String(res.status).padEnd(4)} ${images.size} image refs`);
}

console.log(`\nunique image paths referenced: ${seen.size}`);

const ungraded: string[] = [];
for (const src of [...seen.keys()].sort()) {
  const head = await fetch(`${BASE}${src}`, { method: "HEAD" });
  checked++;
  if (!head.ok) {
    console.log(`  DANGLING ${head.status}  ${src}`);
    failures++;
  }
  // Everything photographic should be coming from the graded tree now.
  if (
    !src.startsWith("/images/graded/") &&
    !src.includes("qr-code") &&
    !src.includes("/brand/")
  ) {
    ungraded.push(src);
  }
}

console.log(`\nchecked ${checked} paths, ${failures} dangling`);

/* Social images are the one class of image URL that must be ABSOLUTE and must
 * resolve on the origin actually serving this build. They shipped pointing at
 * https://www.routescrete.gr/..., which 404s until DNS cutover — so every
 * share of the preview rendered with no image at all, while every on-page
 * image was fine. The canonical link deliberately still points at
 * routescrete.gr; that is the duplicate-content guard and is checked here too
 * so a future "fix" cannot quietly move it. */
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

if (ungraded.length) {
  console.log(`\n${ungraded.length} path(s) still bypassing the grade:`);
  ungraded.forEach((s) => console.log(`  ${s}`));
}

if (failures === 0 && ungraded.length === 0) {
  console.log("\nASSET AUDIT OK - every reference resolves, everything photographic is graded");
} else {
  console.log("\nASSET AUDIT FAILED");
  process.exitCode = 1;
}
