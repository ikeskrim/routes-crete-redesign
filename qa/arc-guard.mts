/**
 * Homepage arc guard.
 *
 * A restructure was reported as "eight sections into six" and shipped as
 * nine. Anchors passed, parity passed, every guard passed, Lighthouse passed —
 * none of them count sections, so the claim survived on the strength of the
 * diff in my head rather than the page. This is that claim made mechanical:
 *
 *   the homepage is SIX movements, in this order, and nothing else
 *
 * Bands are whitelisted by name: the marquee and the cinematic bridge sit
 * BETWEEN movements. They carry no heading and make no argument, so they are
 * punctuation rather than structure — but they are listed here explicitly so
 * "uncounted" is a decision on the record rather than an oversight.
 *
 *   node qa/arc-guard.mts
 */
import { chromium } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

/** The approved arc. Order matters; the id is the contract. */
const ARC = [
  { id: "(hero)", must: "Explore the unknown side of Crete" },
  { id: "positioning", must: "A family runs this" },
  { id: "experiences", must: "Journeys into the unknown side of the island" },
  { id: "signature", must: "" },
  { id: "how-to-book", must: "How to Book" },
  { id: "team", must: "" },
];

/** Structural elements that are deliberately NOT movements. */
const BANDS = ["marquee", "bridge"];

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
  // Direct children only: a movement is a top-level section of <main>. The
  // stacked scene nests INSIDE the positioning section on purpose — stating
  // the case and evidencing it are one movement — and nesting is exactly how
  // that intent is expressed in the markup.
  const sections = [...document.querySelectorAll("main > section")];
  return sections.map((s) => ({
    id: s.id || "(hero)",
    text: (s.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 400),
    heading: (s.querySelector("h1, h2")?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 46),
  }));
});

console.log("\n[arc] the homepage is six movements, in order");
console.log(`  rendered: ${found.map((f) => f.id).join(" · ")}`);

check(
  "exactly six movements",
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
  if (expected.must && actual) {
    check(
      `movement ${i + 1} carries its content`,
      actual.text.includes(expected.must),
      `looking for "${expected.must}"`,
    );
  }
});

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
  return {
    mapPins: document.querySelectorAll('main a[aria-label], main [data-map] a').length,
    transfersCard: text.includes("Private Transfer"),
    availability: text.includes("Available upon request"),
    whyUs: ["Pick up & Travelling", "Local Knowledge", "Comfort, Safety"].filter((t) =>
      text.includes(t),
    ).length,
  };
});
check("the island map kept its pins", migrated.mapPins > 0, `${migrated.mapPins} labelled links`);
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
  console.log("ARC GUARD OK - six movements, in order, nothing lost to the cuts");
} else {
  console.log("ARC GUARD FAILED");
  process.exitCode = 1;
}
