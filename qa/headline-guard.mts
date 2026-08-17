/**
 * Split-headline integrity guard.
 *
 * Every headline that goes through SplitLines is rebuilt from measured word
 * boxes, so a rendering bug can silently change the *text* rather than just
 * its layout. A real visitor saw "Exploretheunknown sideofCrete" on the live
 * build: the separating space was inside each inline-block word span, where
 * CSS discards it as trailing whitespace.
 *
 * This asserts the thing that actually matters — what a reader sees, letter
 * for letter — rather than trusting the markup:
 *
 *     normalize(rendered visible text) === normalize(source text)
 *
 * It checks BOTH states, because they are produced by different code paths:
 *   1. before measurement, when the measuring copy is the visible one
 *   2. after measurement, when the masked lines are visible
 *
 *   node qa/headline-guard.mts
 */
import { chromium } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

const ROUTES = [
  "/",
  "/experiences",
  "/experiences/kourtaliotis-temple-of-nature",
  "/experiences/heart-of-cretan-tradition",
  "/transfers",
  "/transfers/private-transfers-rethymno",
  "/contact",
];

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

const browser = await chromium.launch();
await preflight(BASE, process.cwd() + "/qa");

let checked = 0;
let failures = 0;

for (const route of ROUTES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });

  // 1. Immediately after paint — the measuring copy is what a visitor sees.
  const early = await page.evaluate(() => {
    return [...document.querySelectorAll("[data-split-source]")].map((el) => ({
      source: el.getAttribute("data-split-source") ?? "",
      rendered: (el as HTMLElement).innerText ?? "",
    }));
  });

  // 2. After fonts + measurement have settled — the masked lines are visible.
  await page.evaluate(async () => {
    await document.fonts.ready;
    return true;
  });
  await page.waitForTimeout(2200);

  const settled = await page.evaluate(() => {
    /**
     * What a sighted reader actually sees.
     *
     * Reading innerText off the element counts the copy twice: the visible
     * masked lines AND the sr-only string kept for assistive tech. So clone
     * the subtree, strip everything that is hidden from sight — sr-only and
     * the invisible measuring clone — and read what is left.
     */
    const visibleText = (el: Element) => {
      const clone = el.cloneNode(true) as HTMLElement;
      const originals = [el, ...el.querySelectorAll("*")];
      const clones = [clone, ...clone.querySelectorAll("*")];
      for (let i = originals.length - 1; i >= 0; i--) {
        const cs = getComputedStyle(originals[i]);
        const hidden =
          cs.visibility === "hidden" ||
          cs.display === "none" ||
          (originals[i] as HTMLElement).className?.toString().includes("sr-only");
        if (hidden) clones[i].remove();
      }

      // Each measured line is its own block, and textContent concatenates
      // blocks with no separator — which reads as "TransferServices" where
      // the page simply breaks the line. Put a space after every element
      // before reading; the caller collapses whitespace runs, so
      // over-inserting is harmless and under-inserting is not.
      for (const node of [...clone.querySelectorAll("*")]) {
        node.after(" ");
      }
      return clone.textContent ?? "";
    };

    return [...document.querySelectorAll("[data-split-source]")].map((el) => ({
      source: el.getAttribute("data-split-source") ?? "",
      rendered: visibleText(el),
    }));
  });

  for (const [phase, set] of [
    ["pre-measure", early],
    ["settled", settled],
  ] as const) {
    for (const { source, rendered } of set) {
      checked++;
      if (norm(rendered) !== norm(source)) {
        failures++;
        console.log(`  MISMATCH ${route} [${phase}]`);
        console.log(`    source:   "${norm(source)}"`);
        console.log(`    rendered: "${norm(rendered)}"`);
      }
    }
  }

  console.log(`${route.padEnd(46)} ${early.length} headline(s)`);
  await context.close();
}

await browser.close();

console.log(`\n${checked} headline assertions, ${failures} mismatch(es)`);
if (failures === 0) {
  console.log("HEADLINE GUARD OK - every split headline reads exactly as written");
} else {
  console.log("HEADLINE GUARD FAILED");
  process.exitCode = 1;
}
