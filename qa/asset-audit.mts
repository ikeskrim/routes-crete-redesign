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
