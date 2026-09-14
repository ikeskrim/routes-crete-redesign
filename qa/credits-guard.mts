/**
 * Photography licence compliance guard.
 *
 * Attribution is a CONDITION of the CC BY licences these photographs carry, not
 * a courtesy. If a sourced master exists with no published credit, the site is
 * out of compliance the moment it is public — which it was, until this guard
 * and /credits were written.
 *
 * Asserts, mechanically:
 *   1. every master (in the repo or held locally) has a ledger entry
 *   2. every ledger entry names an ALLOWED licence and no forbidden one
 *   3. every entry has a real source URL and licence URL
 *   4. the ledger's SHA-1 still matches the file on disk — so a swapped image
 *      cannot silently inherit another photograph's licence
 *   5. free-stock and permission masters are NOT in the public repository
 *   6. a written permission points at its stored confirmation
 *   7. /credits renders every author, licence and source link
 *   8. the footer links to /credits from every page
 *
 *   node qa/credits-guard.mts
 */
import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const MASTERS = "assets-src/sourced";

/* Free-stock masters (Unsplash, Pexels, Pixabay) and photographs used by
 * written permission are held OUTSIDE the public repository. Their terms allow
 * use and modification on this site, but Pixabay's forbids distributing content
 * "on a standalone basis", Pexels' forbids redistributing it elsewhere, and a
 * permission granted for the website does not reach a public GitHub repo
 * handing out the unaltered file. Only the graded derivative is published.
 * These masters live in a gitignored folder; their SHA-1 is in the ledger. */
const LOCAL_MASTERS = "assets-src/stock-local";
const LOCAL_ONLY = /^(Unsplash License|Pexels License|Pixabay Content License|Written permission)$/;

const FORBIDDEN = /BY-SA|ShareAlike|NonCommercial|\bNC\b|NoDeriv|\bND\b|editorial/i;
/* An allowlist as well as the denylist: a licence nobody has named exactly is
 * not a licence. PD / CC0 / CC BY from the first hunts; the three free-stock
 * licences and written permission were admitted by the design-reset brief of
 * 2026-09-11 — each still read on the photo's own page. */
const ALLOWED =
  /^(CC0 1\.0|CC BY [234]\.0|Public Domain( Mark 1\.0)?|Unsplash License|Pexels License|Pixabay Content License|Written permission)$/;

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const ledger = JSON.parse(fs.readFileSync("content/photo-credits.json", "utf8")) as {
  photographs: {
    file: string;
    author: string;
    licence: string;
    licenceUrl: string;
    source: string;
    sha1: string;
    /** For "Written permission": repo path of the stored written confirmation. */
    permission?: string;
  }[];
};

const list = (dir: string) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)) : [];
const inRepo = list(MASTERS);
const heldLocally = list(LOCAL_MASTERS);
const locate = (file: string) =>
  inRepo.includes(file)
    ? path.join(MASTERS, file)
    : heldLocally.includes(file)
      ? path.join(LOCAL_MASTERS, file)
      : null;

/* The published graded tree, walked recursively once, on first use. Every
   non-directory entry is a candidate (symlinks included). A missing root
   throws, as the per-letter readdir it replaces did. */
const GRADED_ROOT = path.join("public", "images", "graded");
let gradedCache: string[] | undefined;
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? walk(full) : [full];
  });
const gradedFiles = () => (gradedCache ??= walk(GRADED_ROOT));

console.log("\n[ledger] every sourced master is accounted for");

const recorded = new Set(ledger.photographs.map((p) => p.file));
const unrecorded = [...inRepo, ...heldLocally].filter((f) => !recorded.has(f));
check(
  "every master has a ledger entry",
  unrecorded.length === 0,
  unrecorded.length
    ? `no credit for: ${unrecorded.join(", ")}`
    : `${inRepo.length} in the repo + ${heldLocally.length} held locally, all recorded`,
);

/* A CC master missing from the repo is an orphaned credit. A local-only master
 * missing from THIS machine is expected on a fresh clone — its checksum is in
 * the ledger and the client holds the file — so it is reported, not failed. */
const orphaned = ledger.photographs.filter((p) => !locate(p.file) && !LOCAL_ONLY.test(p.licence));
check(
  "no ledger entry points at a missing file",
  orphaned.length === 0,
  orphaned.length ? `orphaned: ${orphaned.map((p) => p.file).join(", ")}` : "none orphaned",
);
for (const p of ledger.photographs.filter((p) => !locate(p.file) && LOCAL_ONLY.test(p.licence))) {
  console.log(`  note  ${p.file}: master held outside the repo and not on this machine — checksum not re-verified here`);
}

for (const photo of ledger.photographs) {
  check(
    `${photo.file}: licence is permitted`,
    ALLOWED.test(photo.licence) && !FORBIDDEN.test(photo.licence),
    `"${photo.licence}"`,
  );
  check(
    `${photo.file}: has source + licence URLs`,
    /^https?:\/\//.test(photo.source) && /^https?:\/\//.test(photo.licenceUrl),
    `source ${photo.source ? "present" : "MISSING"}, licence url ${photo.licenceUrl ? "present" : "MISSING"}`,
  );

  if (LOCAL_ONLY.test(photo.licence)) {
    check(
      `${photo.file}: master is not redistributed in the public repo`,
      !inRepo.includes(photo.file),
      inRepo.includes(photo.file) ? `move it to ${LOCAL_MASTERS}/ and untrack it` : `held in ${LOCAL_MASTERS}/`,
    );
  }

  /* Pixabay's licence forbids distributing its content "on a standalone
     basis", and the site deploys from a public repository: the graded copy
     sits there as a downloadable file, and a colour grade leaves the
     photograph substantially the same. So a Pixabay frame may be recorded and
     held for the client, but it may not have a graded copy in public/ until
     the repository is private. */
  if (photo.licence === "Pixabay Content License") {
    const base = photo.file.replace(/\.(png|jpeg|JPG|PNG)$/i, ".jpg");
    /* Every file under public/images/graded/, at ANY depth, not a fixed
       graded/<letter>/sourced/<base> probe. That probe went blind twice over:
       a fixed a/b/c list missed grade d the day it was generated, and the
       per-letter `sourced/` path cannot see a derivative of a derivative, such
       as the terracotta duotone at graded/d/duotone/sourced/<base> (SPEC E.3).
       A copy is a copy wherever it sits and whatever it is called at the
       extension, so the frame's name is compared case-insensitively on its
       stem across every raster extension the pipelines could write. */
    const stem = base.replace(/\.jpg$/i, "").toLowerCase();
    const shipped = gradedFiles().filter((f) => {
      const m = path.basename(f).match(/^(.*)\.(jpe?g|png|webp|avif)$/i);
      return !!m && m[1].toLowerCase() === stem;
    });
    check(
      `${photo.file}: held, not shipped (Pixabay forbids standalone distribution)`,
      shipped.length === 0,
      shipped.length
        ? `graded copy of a held frame: ${shipped.map((f) => f.split(path.sep).join("/")).join(", ")}`
        : `no copy anywhere under ${GRADED_ROOT.split(path.sep).join("/")}/**`,
    );
  }

  if (photo.licence === "Written permission") {
    /* The confirmation carries the grantor's own correspondence, so like the
       master it is kept privately, in assets-src/stock-local/permissions/. A
       machine that holds the master must hold the permission too; a fresh
       clone holds neither, and that is reported rather than failed. */
    const proof = !!photo.permission && fs.existsSync(photo.permission);
    if (locate(photo.file) || proof) {
      check(
        `${photo.file}: the written permission is on file`,
        proof,
        photo.permission ?? "no `permission` path in the ledger",
      );
    } else {
      console.log(`  note  ${photo.file}: permission held outside the repo and not on this machine`);
    }
    check(
      `${photo.file}: the permission is kept out of the public repo`,
      !!photo.permission && photo.permission.startsWith(`${LOCAL_MASTERS}/`),
      photo.permission ?? "no `permission` path in the ledger",
    );
  }

  // The checksum is what makes this a licence record rather than a caption:
  // swap the file and the credit stops applying to it.
  const full = locate(photo.file);
  if (full) {
    const sha1 = crypto.createHash("sha1").update(fs.readFileSync(full)).digest("hex");
    check(
      `${photo.file}: checksum still matches the credited work`,
      sha1 === photo.sha1,
      sha1 === photo.sha1 ? sha1.slice(0, 12) : `on disk ${sha1.slice(0, 12)} vs ledger ${photo.sha1.slice(0, 12)}`,
    );
  }
}

console.log("\n[page] /credits publishes the attribution");

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } } as never);

const res = await page.goto(`${BASE}/credits`, { waitUntil: "domcontentloaded", timeout: 45_000 });
check("/credits responds 200", res?.status() === 200, `status ${res?.status()}`);
await page.waitForTimeout(1200);

const rendered = await page.evaluate(() => ({
  text: document.body.innerText,
  links: [...document.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? ""),
}));

for (const photo of ledger.photographs) {
  check(
    `${photo.file}: author credited on the page`,
    rendered.text.includes(photo.author),
    `"${photo.author}"`,
  );
  check(
    `${photo.file}: source is linked`,
    rendered.links.some((h) => h === photo.source),
    photo.source.slice(0, 62) + "…",
  );
  check(
    `${photo.file}: licence is linked`,
    rendered.links.some((h) => h.replace(/\/$/, "") === photo.licenceUrl.replace(/\/$/, "")),
    photo.licenceUrl,
  );
}

// CC BY requires that modifications be indicated. Every image is graded.
check(
  "the page states that the images were modified",
  /graded|modified/i.test(rendered.text),
  "CC BY requires changes to be marked",
);

/* C14. The attribution must be reachable from every page a visitor can land
   on, so the credits link is looked for on all nine routes (the three it once
   sampled missed a page that dropped its footer link), including the 404 page,
   which renders the same root layout.

   "In the footer" is read as the accessibility tree reads it: inside a
   `contentinfo` landmark, resolved by Playwright's own role engine. That is a
   <footer> with no sectioning ancestor (a <footer> inside <main>, <section>,
   <article>, <aside> or <nav> is not a landmark) or any element carrying
   role="contentinfo" (so a back cover built from a <div> still counts), and
   never a landmark hidden from assistive technology. The old `footer a`
   selector accepted a <footer> nested anywhere and rejected the role.

   The link is probed twice, as the old check did at domcontentloaded and again
   at load, and must be inside a landmark both times. Each route must also
   answer with its expected status, so a renamed slug cannot pass on the 404
   page's footer. */
const NOT_FOUND_ROUTE = "/this-route-does-not-exist";
const C14_ROUTES = [
  "/",
  "/experiences",
  "/experiences/kourtaliotis-temple-of-nature",
  "/experiences/heart-of-cretan-tradition",
  "/transfers",
  "/transfers/private-transfers-rethymno",
  "/contact",
  "/credits",
  NOT_FOUND_ROUTE,
];
const CREDITS_LINK = 'a[href="/credits"]';

const probeCreditsLink = async () => {
  const links = page.locator(CREDITS_LINK);
  const total = await links.count();
  const inLandmark = await page.getByRole("contentinfo").locator(CREDITS_LINK).count();
  const where = await links.evaluateAll((els) =>
    els.slice(0, 3).map((el) => {
      const chain: string[] = [];
      for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
        const role = n.getAttribute("role");
        chain.unshift(`${n.tagName.toLowerCase()}${role ? `[role="${role}"]` : ""}`);
      }
      return chain.join(" > ");
    }),
  );
  return { total, inLandmark, where };
};

console.log("\n[reachable] a contentinfo landmark links to it on every route");
for (const route of C14_ROUTES) {
  const expected = route === NOT_FOUND_ROUTE ? 404 : 200;
  const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const atDom = await probeCreditsLink();
  await page.waitForLoadState("load", { timeout: 45_000 });
  const atLoad = await probeCreditsLink();
  const status = response?.status();

  const phases = [
    ["domcontentloaded", atDom],
    ["load", atLoad],
  ] as const;
  const missing = phases.filter(([, p]) => p.total === 0).map(([name]) => name);
  const outside = phases.filter(([, p]) => p.total > 0 && p.inLandmark === 0).map(([name]) => name);
  const summary = phases
    .map(([name, p]) => `${name}: ${p.inLandmark} of ${p.total} ${CREDITS_LINK} inside contentinfo`)
    .join("; ");

  const verdict =
    status !== expected
      ? `status ${status}, expected ${expected}`
      : missing.length
        ? "no credits link"
        : outside.length
          ? "credits link not inside contentinfo"
          : "credits link inside contentinfo";
  const found = [...new Set([...atDom.where, ...atLoad.where])];
  check(
    `${route}: ${verdict}`,
    status === expected && missing.length === 0 && outside.length === 0,
    `${summary}${outside.length && found.length ? `; found at ${found.join(" | ")}` : ""}`,
  );
}

await browser.close();

console.log(`\n${failed} failure(s)`);
if (failed === 0) {
  console.log("CREDITS GUARD OK - every sourced photograph is attributed as its licence requires");
} else {
  console.log("CREDITS GUARD FAILED");
  process.exitCode = 1;
}
