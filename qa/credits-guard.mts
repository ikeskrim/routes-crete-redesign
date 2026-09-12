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
    const shipped = ["a", "b", "c"].filter((g) =>
      fs.existsSync(path.join("public", "images", "graded", g, "sourced", base)),
    );
    check(
      `${photo.file}: held, not shipped (Pixabay forbids standalone distribution)`,
      shipped.length === 0,
      shipped.length ? `graded copies in public/ for grade(s) ${shipped.join(", ")}` : "no graded copy in public/",
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

console.log("\n[reachable] the footer links to it");
for (const route of ["/", "/experiences", "/contact"]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const linked = await page.evaluate(() =>
    [...document.querySelectorAll("footer a")].some(
      (a) => a.getAttribute("href") === "/credits",
    ),
  );
  check(`${route}: footer links to /credits`, linked, linked ? "present" : "no link");
}

await browser.close();

console.log(`\n${failed} failure(s)`);
if (failed === 0) {
  console.log("CREDITS GUARD OK - every sourced photograph is attributed as its licence requires");
} else {
  console.log("CREDITS GUARD FAILED");
  process.exitCode = 1;
}
