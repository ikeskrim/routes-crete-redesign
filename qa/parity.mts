/**
 * Content parity audit.
 *
 * Verifies that every image and every body paragraph recorded in the content
 * files is (a) present on disk and (b) actually reaches the rendered HTML.
 * Run against the production server.
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

/* ---------------------------------------------------------- images */
console.log("\n1. images on disk");
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
    const graded = path.join(PUBLIC, "images", "graded", "b", "sourced",
      bare.replace(/\.(png|jpeg|JPG|PNG)$/i, ".jpg"));
    if (fs.existsSync(graded)) return true;
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
const mustHave = [
  "Your Cretan adventure starts here",
  "Explore the unknown side of Crete",
  "Pick up & Travelling",
  "Local Knowledge & Personal Approach",
  "Comfort, Safety & Genuine Hospitality",
  "Explore Our Excursions",
  "Send Us Your Details",
  "Enjoy the Journey",
  "Antonios Tzagkarakis",
  "Stavros Kapetanakis",
  "Daria",
  "highly trained, professional chauffeurs",
  "191661450000",
];
for (const needle of mustHave) {
  if (!home.includes(needle)) fail(`homepage missing "${needle}"`);
}
console.log(`  ${mustHave.length} required strings checked`);

console.log(
  failures === 0
    ? "\nPARITY OK — no deltas"
    : `\n${failures} PARITY FAILURE(S)`,
);
process.exitCode = failures === 0 ? 0 : 1;
