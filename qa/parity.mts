/**
 * Content parity audit.
 *
 * Verifies that every image and every body paragraph recorded in the content
 * files is (a) present on disk and (b) actually reaches the rendered HTML.
 *
 * Section 1 (images on disk) reads files only: content/, public/images,
 * assets-src/sourced and the live GRADE letter. GRADE is resolved from
 * src/lib/edition.ts when that file exists (SPEC C10), else from
 * src/lib/content.ts (trees before edition.ts exists). A file that yields no
 * GRADE letter, or declares it more than once, throws before any check runs.
 * Sections 3 and 4 fetch QA_BASE_URL: run against the production server.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const PUBLIC = path.join(ROOT, "public");

type Item = {
  slug: string;
  title: string;
  collection: string;
  body: { text: string }[];
  gallery: { src: string; oldUrl?: string }[];
  cardImage: string;
  heroImage: string;
};

const readJson = <T,>(p: string): T => JSON.parse(fs.readFileSync(p, "utf8"));

const items: Item[] = [];
for (const collection of ["experiences", "transfers"]) {
  const dir = path.join(CONTENT, collection);
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith(".json")) items.push({ ...readJson<Item>(path.join(dir, f)), collection });
  }
}
const site = readJson<Record<string, never>>(path.join(CONTENT, "site.json"));

let failures = 0;
const fail = (m: string) => {
  console.log(`  FAIL ${m}`);
  failures++;
};

/* The grade the site actually serves, read from the one constant (SPEC C10:
 * it lives in src/lib/edition.ts; before that file exists, in
 * src/lib/content.ts). It was hard-coded to b, two grades ago; "any letter"
 * would be looser still, passing a photograph whose only copy sits in a
 * retired grade.
 *
 * Resolved once, before any check, and never silently. The previous inline
 * regex was read only when a master was missing, and a declaration that
 * changed shape left the letter `undefined`, so the graded-copy branch quietly
 * stopped checking while the audit still printed OK. Now a file that yields no
 * letter throws, and so does a file declaring GRADE more than once. Only a
 * declaration at the start of a line counts, so a commented-out
 * `// const GRADE = "b"` can never stand in for the real constant. */
const EDITION_TS = path.join(ROOT, "src", "lib", "edition.ts");
const CONTENT_TS = path.join(ROOT, "src", "lib", "content.ts");
const GRADE_FILE = fs.existsSync(EDITION_TS) ? EDITION_TS : CONTENT_TS;
const GRADE_FILE_REL = path.relative(ROOT, GRADE_FILE).split(path.sep).join("/");
const gradeLetters = fs.existsSync(GRADE_FILE)
  ? [
      ...fs
        .readFileSync(GRADE_FILE, "utf8")
        .matchAll(/^[ \t]*(?:export[ \t]+)?const[ \t]+GRADE\b[^=\n]*=[ \t]*["']([a-z])["']/gm),
    ].map((m) => m[1])
  : [];
if (gradeLetters.length === 0) {
  throw new Error(`GRADE constant not found in ${GRADE_FILE_REL}`);
}
if (gradeLetters.length > 1) {
  throw new Error(`GRADE constant declared ${gradeLetters.length} times in ${GRADE_FILE_REL}`);
}
const GRADE = gradeLetters[0];

/* ---------------------------------------------------------- images */
console.log("\n1. images on disk");
console.log(`  GRADE "${GRADE}" read from ${GRADE_FILE_REL}`);
const referenced = new Set<string>();
const collect = (v: unknown) => {
  if (Array.isArray(v)) return v.forEach(collect);
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (
        typeof val === "string" &&
        val.startsWith("/images/") &&
        /\.(jpg|jpeg|png)$/i.test(val)
      ) {
        referenced.add(val);
      } else if (k !== "oldUrl") collect(val);
    }
  }
};
collect(items);
collect(site);

/* Web-sourced masters deliberately live OUTSIDE public/ — in assets-src/ —
 * because the site only ever serves the graded tree and shipping 78MB of
 * originals nobody can request is pure deploy weight. So "does this file
 * exist" has two right answers depending on where the master lives, and
 * checking only public/ reported four perfectly good photographs as missing
 * the moment they were referenced from content.
 *
 * Resolve the way the site resolves: an original under /images/sourced/ is
 * satisfied by its master in assets-src/ OR by its graded copy. */
const existsSomewhere = (src: string): boolean => {
  const rel = src.replace(/^\//, "");
  if (fs.existsSync(path.join(PUBLIC, rel))) return true;
  if (src.startsWith("/images/sourced/")) {
    const bare = rel.replace(/^images\/sourced\//, "");
    if (fs.existsSync(path.join(process.cwd(), "assets-src", "sourced", bare))) return true;
    /* Only the live grade's copy counts (GRADE, resolved above). */
    const jpg = bare.replace(/\.(png|jpeg|JPG|PNG)$/i, ".jpg");
    if (fs.existsSync(path.join(PUBLIC, "images", "graded", GRADE, "sourced", jpg))) return true;
  }
  return false;
};

for (const src of referenced) {
  if (!existsSomewhere(src)) fail(`missing file ${src}`);
}
console.log(`  ${referenced.size} referenced images, all present: ${failures === 0}`);

const onDisk = fs
  .readdirSync(path.join(PUBLIC, "images"), { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile() && /\.(jpg|jpeg|png)$/i.test(d.name)).length;
console.log(`  ${onDisk} image files on disk under /public/images`);

/* ------------------------------------------------- old URL mapping */
console.log("\n2. old -> new URL mapping preserved");
let mapped = 0;
for (const item of items) {
  for (const g of item.gallery) if (g.oldUrl) mapped++;
}
console.log(`  ${mapped} gallery entries carry their original routescrete.gr URL`);

/* ----------------------------------------- paragraphs in rendered HTML */
console.log("\n3. verbatim body text present in rendered HTML");
const strip = (s: string) =>
  s.replace(/\*\*/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();

const decode = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x2019;/g, "’")
    .replace(/\s+/g, " ");

for (const item of items) {
  const url = `${BASE}/${item.collection}/${item.slug}`;
  const html = decode(await (await fetch(url)).text());
  let ok = 0;
  for (const block of item.body) {
    // Compare on a distinctive slice: full paragraphs can be split across
    // elements by the line-mask reveal.
    const probe = strip(block.text).slice(0, 60);
    if (html.includes(probe)) ok++;
    else fail(`${item.slug}: paragraph not found -> "${probe}"`);
  }
  console.log(`  ${item.slug}: ${ok}/${item.body.length} paragraphs`);
}

/* ------------------------------------------------------ homepage bits */
console.log("\n4. homepage sections");
const home = decode(await (await fetch(`${BASE}/`)).text());
/* PARITY v2 — both halves.
 *
 * v1 asserted that the ORIGINAL live-site strings appeared on the homepage.
 * That was right while the rebuild was a faithful port, and wrong the moment
 * the approved copy deck replaced them: it would have forced the site to keep
 * saying "Our Amazing Team" forever, or been deleted to let the deck through —
 * and deleting a guard to pass it is how content quietly goes missing.
 *
 * So the check splits in two, and both halves must hold:
 *
 *   RENDERED   — the new deck copy is actually on the page
 *   PRESERVED  — every original string still exists in the content files,
 *                under a *_original key, recoverable and never overwritten
 *
 * The originals are no longer required to be VISIBLE. They are required to be
 * KEPT. That is the promise this project actually made.
 */
const mustRender = [
  "Rethymno · Crete",
  "Explore the unknown side of Crete",
  "Booking is a conversation",
  "Tell us the day",
  "Send us the details",
  "We confirm, then you travel",
  "191661450000",
  "Pick up & Travelling",
  "Local Knowledge & Personal Approach",
  "Comfort, Safety & Genuine Hospitality",
];
for (const needle of mustRender) {
  if (!home.includes(needle)) fail(`homepage missing rendered copy "${needle}"`);
}
console.log(`  ${mustRender.length} rendered strings checked`);

/* The team movement came out on the client's instruction (2026-09-11). Out
 * means not rendered — its heading and its people no longer appear on the
 * homepage — while the next block requires every one of those strings to be
 * KEPT in the content files. Removal and preservation, asserted together. */
const mustNotRender = [
  "The three people you'll actually meet",
  "Antonios Tzagkarakis",
  "Stavros Kapetanakis",
  "highly trained, professional chauffeurs",
];
for (const needle of mustNotRender) {
  if (home.includes(needle)) fail(`homepage still renders removed team copy "${needle}"`);
}
console.log(`  ${mustNotRender.length} removed team strings confirmed absent`);

console.log("\n5. originals preserved (not necessarily visible)");
const raw = JSON.stringify(
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "site.json"), "utf8")),
);
const mustPreserve = [
  "Your Cretan adventure starts here",
  "How to Book Your Cretan Experience",
  "Our Amazing Team",
  // The team, preserved after its section was removed.
  "The three people you'll actually meet",
  "Where professional excellence meets world-class hospitality.",
  "Antonios Tzagkarakis",
  "Stavros Kapetanakis",
  "Daria",
  "Manager",
  "CEO",
  "Assistance",
  "highly trained, professional chauffeurs",
  "Our collection of transfers",
  "Explore Our Excursions",
  "Choose Your Preferred Date",
  "Send Us Your Details",
  "Confirmation & Details",
  "Enjoy the Journey",
];
for (const needle of mustPreserve) {
  if (!raw.includes(needle)) fail(`ORIGINAL LOST from content: "${needle}"`);
}
console.log(`  ${mustPreserve.length} originals still in the content files`);

console.log(
  failures === 0
    ? "\nPARITY OK — no deltas"
    : `\n${failures} PARITY FAILURE(S)`,
);
process.exitCode = failures === 0 ? 0 : 1;
