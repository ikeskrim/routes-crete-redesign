/**
 * Photography licence compliance guard.
 *
 * Attribution is a CONDITION of the CC BY licences these photographs carry, not
 * a courtesy. If a sourced master exists with no published credit, the site is
 * out of compliance the moment it is public — which it was, until this guard
 * and /credits were written.
 *
 * Asserts, mechanically:
 *   1. every master in assets-src/sourced/ has a ledger entry
 *   2. no ledger entry names a forbidden licence (BY-SA or NonCommercial)
 *   3. every entry has a real source URL and licence URL
 *   4. the ledger's SHA-1 still matches the file on disk — so a swapped image
 *      cannot silently inherit another photograph's licence
 *   5. /credits renders every author, licence and source link
 *   6. the footer links to /credits from every page
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
const FORBIDDEN = /BY-SA|ShareAlike|NonCommercial|\bNC\b/i;

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
  }[];
};

console.log("\n[ledger] every sourced master is accounted for");

const onDisk = fs.existsSync(MASTERS)
  ? fs.readdirSync(MASTERS).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
  : [];
const recorded = new Set(ledger.photographs.map((p) => p.file));
const unrecorded = onDisk.filter((f) => !recorded.has(f));
const missingFile = ledger.photographs.filter((p) => !onDisk.includes(p.file));

check(
  "every master has a ledger entry",
  unrecorded.length === 0,
  unrecorded.length ? `no credit for: ${unrecorded.join(", ")}` : `${onDisk.length} masters, all recorded`,
);
check(
  "no ledger entry points at a missing file",
  missingFile.length === 0,
  missingFile.length ? `orphaned: ${missingFile.map((p) => p.file).join(", ")}` : "none orphaned",
);

for (const photo of ledger.photographs) {
  check(
    `${photo.file}: licence is permitted`,
    !FORBIDDEN.test(photo.licence),
    `"${photo.licence}"`,
  );
  check(
    `${photo.file}: has source + licence URLs`,
    /^https?:\/\//.test(photo.source) && /^https?:\/\//.test(photo.licenceUrl),
    `source ${photo.source ? "present" : "MISSING"}, licence url ${photo.licenceUrl ? "present" : "MISSING"}`,
  );

  // The checksum is what makes this a licence record rather than a caption:
  // swap the file and the credit stops applying to it.
  const full = path.join(MASTERS, photo.file);
  if (fs.existsSync(full)) {
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
