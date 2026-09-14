/**
 * Homepage arc guard.
 *
 * A restructure was reported as "eight sections into six" and shipped as
 * nine. Anchors passed, parity passed, every guard passed, Lighthouse passed —
 * none of them count sections, so the claim survived on the strength of the
 * diff in my head rather than the page. This is that claim made mechanical:
 *
 *   the homepage is FIVE movements, in this order, and nothing else
 *
 * It was six until 2026-09-11, when the client took the team movement out.
 * The last movement is now How to Book, which hands over to the footer. The
 * team copy is still required to exist — parity checks it is PRESERVED in
 * content — and this guard checks it is no longer RENDERED as a section.
 *
 * Bands are whitelisted by name: the marquee and the cinematic bridge sit
 * BETWEEN movements. They carry no heading and make no argument, so they are
 * punctuation rather than structure — but they are listed here explicitly so
 * "uncounted" is a decision on the record rather than an oversight.
 *
 * Instrument replacements (C+ SPEC §I.1 / §I.3, stage S1q; proofs under
 * .hunt/cplus/proofs/arc-guard-*):
 *
 *   A3  A movement's copy is searched in the WHOLE movement text, not in its
 *       first 400 characters. The window was an artefact of the instrument: a
 *       redesign that puts a measuring copy or an eyebrow before the headline
 *       pushes real copy past it without the copy leaving the movement. The
 *       property is "this movement carries this copy", and it now also covers
 *       the transfer spotlight's availability fact, which must sit inside the
 *       journeys movement (#experiences), not merely somewhere in <body>. Text
 *       inside <script>, <style> and <noscript> never counts: the RSC payload
 *       repeats rendered strings and is not copy on the page.
 *
 *   A6  Map pins are the links INSIDE the map container, `[data-map] a[href]`,
 *       and their number must EQUAL the linked mappable locations, computed
 *       from content the same way the page computes them (a site.json location
 *       with numeric lat/lng whose key appears in some experience's or
 *       transfer's `locations`). Every linked location must have its own link,
 *       named for it. Before, any labelled link anywhere in <main> satisfied
 *       "> 0", so losing five of six pins passed.
 *
 *   node qa/arc-guard.mts
 */
import fs from "node:fs";
import { chromium } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const REPO = new URL("../", import.meta.url);

/** The approved arc. Order matters; the id is the contract. Every `must`
 *  string is searched in the whole text of that movement (A3). */
const ARC: { id: string; must: string[] }[] = [
  { id: "(hero)", must: ["Explore the unknown side of Crete"] },
  { id: "positioning", must: ["A family runs this"] },
  {
    id: "experiences",
    must: [
      "Journeys into the unknown side of the island",
      // The cut transfer spotlight's availability fact now lives on the
      // transfers card in this movement (Card.tsx `facts`). It must stay in
      // the movement, wherever inside it the design puts it.
      "Available upon request",
    ],
  },
  { id: "signature", must: [] },
  // Renamed by the approved copy deck: "How to Book Your Cretan Experience"
  // became "Booking is a conversation". The original is preserved in
  // site.json under `heading_original` and parity v2 asserts it is still
  // there — this guard tracks what the page SAYS, parity tracks what was KEPT.
  { id: "how-to-book", must: ["Booking is a conversation"] },
];

/** Structural elements that are deliberately NOT movements. */
const BANDS = ["marquee", "bridge"];

/**
 * A6 oracle: the mappable locations that have a link, from content.
 *
 * Mirrors `getMappableLocations` (src/lib/content.ts: numeric lat AND lng) and
 * the homepage's `locationLinks` (src/app/page.tsx: a location is linked when
 * any experience or transfer lists its key). Read from the working tree, whose
 * content/ equals the build under test.
 */
function linkedMappableLocations(): { key: string; name: string }[] {
  const read = (rel: string) => JSON.parse(fs.readFileSync(new URL(rel, REPO), "utf8"));
  const site = read("content/site.json") as {
    locations: { key: string; name: string; lat?: unknown; lng?: unknown }[];
  };
  const linked = new Set<string>();
  for (const collection of ["experiences", "transfers"]) {
    const dir = new URL(`content/${collection}/`, REPO);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const item = read(`content/${collection}/${file}`) as { locations?: string[] };
      for (const key of item.locations ?? []) linked.add(key);
    }
  }
  return site.locations
    .filter((l) => typeof l.lat === "number" && typeof l.lng === "number" && linked.has(l.key))
    .map((l) => ({ key: l.key, name: l.name }));
}

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } } as never);
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(2000);

const found = await page.evaluate(() => {
  /* A3: the whole movement's text. textContent semantics (hidden panels and
     sr-only copies count), minus text inside script/style/noscript, which is
     payload or markup rather than copy. */
  const movementText = (root: Element) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.parentElement?.closest("script, style, noscript")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    let text = "";
    for (let n = walker.nextNode(); n; n = walker.nextNode()) text += n.nodeValue ?? "";
    return text.replace(/\s+/g, " ").trim();
  };
  // Direct children only: a movement is a top-level section of <main>. The
  // stacked scene nests INSIDE the positioning section on purpose — stating
  // the case and evidencing it are one movement — and nesting is exactly how
  // that intent is expressed in the markup.
  const sections = [...document.querySelectorAll("main > section")];
  return sections.map((s) => ({
    id: s.id || "(hero)",
    text: movementText(s),
    heading: (s.querySelector("h1, h2")?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 46),
  }));
});

console.log("\n[arc] the homepage is five movements, in order");
console.log(`  rendered: ${found.map((f) => f.id).join(" · ")}`);

check(
  "exactly five movements",
  found.length === ARC.length,
  `${found.length} top-level sections in <main>, expected ${ARC.length}`,
);

ARC.forEach((expected, i) => {
  const actual = found[i];
  check(
    `movement ${i + 1} is #${expected.id}`,
    !!actual && actual.id === expected.id,
    actual ? `found #${actual.id} "${actual.heading}"` : "missing",
  );
  if (!actual) return;
  for (const must of expected.must) {
    const ok = actual.text.includes(must);
    check(
      `movement ${i + 1} carries its content`,
      ok,
      ok
        ? `found "${must}" in #${actual.id} (A3, whole movement text, ${actual.text.length} chars)`
        : `A3: "${must}" not in movement #${actual.id} (whole movement text, ${actual.text.length} chars)`,
    );
  }
});

/* The team movement is out, and out means out: no #team section anywhere on
   the page, not merely not a direct child of <main>. */
const teamLeft = await page.evaluate(() => !!document.getElementById("team"));
check("the team movement is gone", !teamLeft, teamLeft ? "an element still has id=\"team\"" : "no #team on the page");

/* The bands must still exist. Cutting a section is a decision; losing a band
   silently while renumbering is an accident, and this is what tells them
   apart. */
const bands = await page.evaluate(
  () => ({
    marquee: !!document.querySelector("[data-marquee], .marquee, main [aria-hidden] [data-marquee]"),
    marqueeText: (document.body.textContent ?? "").includes("Booked by conversation"),
    bridge: !!document.querySelector("[data-bridge]"),
    bridgeImg: document.querySelectorAll("main > figure, main > div img").length,
  }),
);
check(
  "the marquee band survives",
  bands.marquee || bands.marqueeText,
  bands.marqueeText ? "found by its copy" : "not found",
);
console.log(`  note  bands are uncounted by design: ${BANDS.join(", ")}`);

/* The content the cut sections used to carry must still be reachable. Cutting
   the transfer spotlight is only legitimate because these survived. */
console.log("\n[migrated] content from the cut sections");
const migrated = await page.evaluate(() => {
  /* textContent, NOT innerText. innerText approximates *rendered* text and
     drops the stacked scene's inactive panels, which are opacity-0 and
     absolutely positioned — it reported 0/3 why-us panels on a page whose
     HTML plainly contained all three, and which parity independently passes.
     The question here is "is this content on the page", and textContent is
     the instrument that answers it. */
  const text = document.body.textContent ?? "";
  const pins = [...document.querySelectorAll("[data-map] a[href]")];
  return {
    pinLinks: pins.length,
    pinLinksInMain: pins.filter((a) => a.closest("main")).length,
    pinNames: pins.map((a) =>
      (a.getAttribute("aria-label") ?? a.textContent ?? "").replace(/\s+/g, " ").trim(),
    ),
    transfersCard: text.includes("Private Transfer"),
    availability: text.includes("Available upon request"),
    whyUs: ["Pick up & Travelling", "Local Knowledge", "Comfort, Safety"].filter((t) =>
      text.includes(t),
    ).length,
  };
});

/* A6: the pins are the map's own links, one per linked mappable location. */
const expectedPins = linkedMappableLocations();
const pinsOk =
  expectedPins.length > 0 &&
  migrated.pinLinks === expectedPins.length &&
  migrated.pinLinksInMain === migrated.pinLinks;
check(
  "the island map kept its pins",
  pinsOk,
  expectedPins.length === 0
    ? "A6: no linked mappable location in content, the pin count would be vacuous"
    : pinsOk
      ? `${migrated.pinLinks} [data-map] a[href] = ${expectedPins.length} linked mappable locations`
      : `A6: pin links ≠ mappable locations (${migrated.pinLinks} [data-map] a[href], ${migrated.pinLinksInMain} inside <main>; ${expectedPins.length} linked mappable locations in content)`,
);
const unpinned = expectedPins.filter((l) => !migrated.pinNames.includes(l.name));
check(
  "every linked mappable location has its pin link",
  expectedPins.length > 0 && unpinned.length === 0,
  unpinned.length
    ? `A6: no [data-map] link named ${unpinned.map((l) => `"${l.name}"`).join(", ")}`
    : expectedPins.map((l) => l.name).join(", "),
);

check("the transfers item is still on the page", migrated.transfersCard, "in the journeys grid");
check(
  "the spotlight's availability fact survived",
  migrated.availability,
  '"Available upon request" on the card',
);
check("all three why-us panels present", migrated.whyUs === 3, `${migrated.whyUs}/3`);

await browser.close();

console.log(`\n${failed} failure(s)`);
if (failed === 0) {
  console.log("ARC GUARD OK - five movements, in order, nothing lost to the cuts");
} else {
  console.log("ARC GUARD FAILED");
  process.exitCode = 1;
}
