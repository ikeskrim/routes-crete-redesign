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
 *   9. C15 (C+ SPEC §I.2): every caption that credits a photograph names
 *      what the ledger records for THAT photograph
 *  10. C16 (ruling of 2026-09-17): share-alike is admitted for CC BY-SA 4.0
 *      only, and only as an obligation met. The record carries a
 *      `shareAlike` block with the same licence and a non-empty obligation,
 *      and names the graded file the site serves (the live GRADE letter, the
 *      record's own file name) as its derivative. That file exists, and
 *      /credits says it is shared under the licence and links it with
 *      `download`, and the link answers 200 as an image. Every other BY-SA
 *      version, and anything NonCommercial or NoDerivatives, stays forbidden.
 *      A record marked `titleAsPublished` shows its title verbatim followed
 *      by "(title as published)".
 *
 * C15, on the nine routes: every `figcaption` whose tier 2
 * (`[data-caption-tier="2"]`) starts "Photograph: " belongs to a figure whose
 * image is a ledgered file, and
 *   - tier 2 is exactly that record's credit line, `Photograph: {author},
 *     {licence}` + ` (colour-graded)` when the record says modified (the
 *     author, the licence and the modification note are each named when
 *     wrong: "author not in ledger", …);
 *   - tier 1 is that record's `subject`, or, for a frame that is not a mood
 *     frame, a content `placeBreaks[].place` of the same file or its
 *     src/lib/place-images.ts alt line (itinerary captions).
 * A figcaption that says "Photograph:" without the tier markers fails too.
 * C15 always runs (before C+ no caption credits a photograph, so it finds
 * none); from S9 (qa/cplus-stage.mts) each route must show at least one
 * checked credit (the back cover's) and `/` at least three (cover, golden
 * band, back cover).
 *
 *   node qa/credits-guard.mts
 */
import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cplusS9, cplusS9Line } from "./cplus-stage.mts";
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
  /^(CC0 1\.0|CC BY [234]\.0|CC BY-SA 4\.0|Public Domain( Mark 1\.0)?|Unsplash License|Pexels License|Pixabay Content License|Written permission)$/;
/* C16: the one share-alike licence the client admitted (2026-09-17). It
 * passes FORBIDDEN only together with the obligation checks below. */
const SHARE_ALIKE = /^CC BY-SA 4\.0$/;

/* The live grade letter, read as qa/parity.mts reads it: one line-start
 * declaration in src/lib/edition.ts, exactly once. */
const GRADE = (() => {
  const found = [...fs.readFileSync("src/lib/edition.ts", "utf8").matchAll(/^export const GRADE = "([a-z])";$/gm)];
  if (found.length !== 1) throw new Error(`src/lib/edition.ts: ${found.length} GRADE declarations, expected exactly one`);
  return found[0][1];
})();

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const ledger = JSON.parse(fs.readFileSync("content/photo-credits.json", "utf8")) as {
  photographs: {
    file: string;
    subject: string;
    title: string;
    author: string;
    licence: string;
    licenceUrl: string;
    source: string;
    sha1: string;
    modified?: boolean;
    surface?: string;
    /** For "Written permission": repo path of the stored written confirmation. */
    permission?: string;
    titleAsPublished?: boolean;
    shareAlike?: { licence: string; licenceUrl: string; derivative: string; obligation: string };
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
    ALLOWED.test(photo.licence) && (!FORBIDDEN.test(photo.licence) || SHARE_ALIKE.test(photo.licence)),
    `"${photo.licence}"`,
  );

  if (SHARE_ALIKE.test(photo.licence)) {
    const sa = photo.shareAlike;
    const own = `/images/graded/${GRADE}/sourced/${photo.file.replace(/\.(jpe?g|png)$/i, ".jpg")}`;
    check(
      `${photo.file}: C16 the share-alike obligation is recorded`,
      !!sa &&
        sa.licence === photo.licence &&
        sa.licenceUrl.replace(/\/$/, "") === photo.licenceUrl.replace(/\/$/, "") &&
        sa.obligation.trim().length > 0,
      sa ? `${sa.licence}, ${sa.obligation.trim().length} characters of obligation` : "no shareAlike block in the ledger",
    );
    check(
      `${photo.file}: C16 the shared file is the one the site serves`,
      !!sa && sa.derivative === own && fs.existsSync(path.join("public", ...own.split("/").filter(Boolean))),
      sa ? `${sa.derivative}${sa.derivative === own ? "" : `, expected ${own}`}` : "no derivative named",
    );
  }
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

console.log(cplusS9Line());
await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } } as never);

const res = await page.goto(`${BASE}/credits`, { waitUntil: "domcontentloaded", timeout: 45_000 });
check("/credits responds 200", res?.status() === 200, `status ${res?.status()}`);
await page.waitForTimeout(1200);

const rendered = await page.evaluate(() => ({
  text: document.body.innerText,
  links: [...document.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? ""),
  downloads: [...document.querySelectorAll("a[download]")].map((a) => a.getAttribute("href") ?? ""),
}));

/* C16 and the title marker, on the page. */
for (const photo of ledger.photographs) {
  const sa = photo.shareAlike;
  if (sa) {
    check(
      `${photo.file}: C16 /credits says the graded file is shared under ${sa.licence}`,
      rendered.text.includes(`shared under ${sa.licence}`),
      `"shared under ${sa.licence}"`,
    );
    const linked = rendered.downloads.includes(sa.derivative);
    const served = linked ? await fetch(`${BASE}${sa.derivative}`) : null;
    check(
      `${photo.file}: C16 /credits links the graded file for download`,
      linked && served?.status === 200 && /^image\//.test(served.headers.get("content-type") ?? ""),
      linked ? `${sa.derivative}: ${served?.status} ${served?.headers.get("content-type")}` : `no a[download] with href ${sa.derivative}`,
    );
  }
  if (photo.titleAsPublished) {
    check(
      `${photo.file}: title kept verbatim, marked "(title as published)"`,
      rendered.text.includes(`${photo.title} (title as published)`),
      `"${photo.title} (title as published)"`,
    );
  }
}

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

/* C15 oracle -------------------------------------------------------------- */

/** A served path's ledger name: basename, as .jpg (the pipeline writes .jpg). */
const ledgerName = (p: string) => (p.split("/").pop() ?? p).replace(/\.(jpe?g|png)$/i, ".jpg");
const byFile = new Map(ledger.photographs.map((p) => [ledgerName(p.file), p]));
const creditLine = (p: (typeof ledger.photographs)[number]) =>
  `Photograph: ${p.author}, ${p.licence}${p.modified ? " (colour-graded)" : ""}`;

/** Itinerary captions per file: content place breaks and the place-images alt lines. */
const placesFor = new Map<string, Set<string>>();
const addPlace = (file: string, place: string) => {
  const key = ledgerName(file);
  if (!placesFor.has(key)) placesFor.set(key, new Set());
  placesFor.get(key)!.add(place.replace(/\s+/g, " ").trim());
};
for (const collection of ["experiences", "transfers"]) {
  const dir = path.join("content", collection);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const item = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as {
      placeBreaks?: { src: string; place: string }[];
    };
    for (const b of item.placeBreaks ?? []) addPlace(b.src, b.place);
  }
}
{
  const source = fs
    .readFileSync(path.join("src", "lib", "place-images.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  for (const m of source.matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,?\s*\]/g)) {
    addPlace(`${m[2]}.jpg`, m[3]);
  }
}

const S9 = cplusS9();
/** C+ S9 minimum checked photo credits per route (the back cover everywhere;
    cover, band and back cover on /). */
const C15_MINIMUM = (route: string) => (route === "/" ? 3 : 1);

interface CaptionProbe {
  tier1: string | null;
  tier2: string | null;
  marked: boolean;
  src: string | null;
  where: string;
}

const probeCaptions = () =>
  page.evaluate((): CaptionProbe[] => {
    const text = (el: Element | null) => (el ? (el.textContent ?? "").replace(/\s+/g, " ").trim() : null);
    return [...document.querySelectorAll("figcaption")]
      .map((fc) => {
        const tier1 = fc.querySelector('[data-caption-tier="1"]');
        const tier2 = fc.querySelector('[data-caption-tier="2"]');
        const img = fc.closest("figure")?.querySelector("img") ?? null;
        let src: string | null = null;
        if (img) {
          const raw = img.getAttribute("src") ?? "";
          try {
            const url = new URL(raw, location.href);
            src = decodeURIComponent(url.searchParams.get("url") ?? url.pathname);
          } catch {
            src = raw;
          }
        }
        const chain: string[] = [];
        for (let n: Element | null = fc; n && n !== document.body && chain.length < 4; n = n.parentElement) {
          chain.unshift(n.tagName.toLowerCase());
        }
        return {
          tier1: text(tier1),
          tier2: text(tier2),
          marked: !!tier2,
          src,
          where: chain.join(" > "),
          all: text(fc) ?? "",
        };
      })
      .filter((c) => (c.tier2 ?? "").startsWith("Photograph: ") || (!c.marked && c.all.includes("Photograph:")))
      .map((c) => ({ tier1: c.tier1, tier2: c.tier2, marked: c.marked, src: c.src, where: c.where }));
  });

function judgeCaption(c: CaptionProbe): string[] {
  const problems: string[] = [];
  if (!c.marked) return [`a photo credit without data-caption-tier markers at ${c.where}`];
  if (!c.src) return [`"${c.tier2}" at ${c.where}: caption without a photograph in its figure`];
  const file = ledgerName(c.src);
  const record = byFile.get(file);
  if (!record) return [`${file}: no ledger record for the captioned photograph`];
  const expected = creditLine(record);
  if (c.tier2 !== expected) {
    const named = c.tier2!.match(/^Photograph: (.+), ([^,]+?)( \(colour-graded\))?$/);
    if (!named || named[1] !== record.author) {
      problems.push(`${file}: author not in ledger for this photograph: "${named?.[1] ?? c.tier2}" (ledger: "${record.author}")`);
    } else if (named[2] !== record.licence) {
      problems.push(`${file}: licence not in ledger for this photograph: "${named[2]}" (ledger: "${record.licence}")`);
    } else {
      problems.push(`${file}: modification note ≠ ledger: "${c.tier2}" (ledger: "${expected}")`);
    }
  }
  const places = placesFor.get(file) ?? new Set<string>();
  const tier1Ok =
    c.tier1 === record.subject || (record.surface !== "mood" && c.tier1 !== null && places.has(c.tier1));
  if (!tier1Ok) {
    problems.push(
      `${file}: tier 1 ≠ ledger subject: "${c.tier1 ?? "(missing)"}" (subject "${record.subject}"` +
        (record.surface !== "mood" && places.size ? `, or a content place: ${[...places].map((p) => `"${p}"`).join(", ")}` : "") +
        ")",
    );
  }
  return problems;
}

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

  /* C15: every photo credit on this route names this photograph's record. */
  const captions = await probeCaptions();
  let good = 0;
  for (const c of captions) {
    const problems = judgeCaption(c);
    if (problems.length === 0) good++;
    for (const p of problems) check(`${route} C15`, false, p);
  }
  const minimum = S9 ? C15_MINIMUM(route) : 0;
  check(
    `${route} C15: ${good} of ${captions.length} photo credit(s) match the ledger`,
    good === captions.length && captions.length >= minimum,
    captions.length >= minimum
      ? captions
          .map((c) => (c.src ? ledgerName(c.src) : "?"))
          .join(", ")
      : `C15: ${captions.length} photo credit(s) < minimum ${minimum}`,
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
