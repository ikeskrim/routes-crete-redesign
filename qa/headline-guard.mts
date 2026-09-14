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
 * Instrument (C+ SPEC §I.1, stage S1q):
 *   - Per-route MINIMUM headline counts, in both phases. Without them a route
 *     that lost its split headlines (or never rendered them) passed with
 *     "0 headline(s)". `/credits` is covered.
 *   - Hidden nodes are found by GEOMETRY, not by the `sr-only` class name:
 *     `display: none`, `visibility: hidden`, or a box of at most 1 × 1 px that
 *     clips its content. A copy that is visible stays counted whatever its
 *     class is called, and a copy that is hidden is excluded whatever its
 *     class is called.
 *   - DUAL-MODE readiness wait. After `document.fonts.ready` the route is
 *     polled for up to 2,200 ms. If any headline carries `data-lines-ready`
 *     the route runs in `ready` mode and every headline must carry it within
 *     8,000 ms. Otherwise it runs in `fallback` mode: today's wait, fonts.ready
 *     + 2,200 ms. The mode is printed per route.
 *     (S9 deletes the fallback branch; see FALLBACK below.)
 *
 *   node qa/headline-guard.mts
 */
import { chromium } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

/**
 * Every route the guard visits, with the fewest `[data-split-source]`
 * headlines it may render (the counts on 95e821a, SPEC §I.1). A route below
 * its minimum fails in whichever phase it falls short.
 */
const ROUTES: ReadonlyArray<readonly [route: string, minimum: number]> = [
  ["/", 9],
  ["/experiences", 1],
  ["/experiences/kourtaliotis-temple-of-nature", 5],
  ["/experiences/heart-of-cretan-tradition", 3],
  ["/transfers", 1],
  ["/transfers/private-transfers-rethymno", 3],
  ["/contact", 1],
  ["/credits", 1],
];

/** How long after fonts.ready a route has to show any `data-lines-ready`. */
const MODE_WINDOW_MS = 2_200;
/** In `ready` mode, how long every headline has to carry it. */
const READY_TIMEOUT_MS = 8_000;
const POLL_MS = 100;

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const browser = await chromium.launch();
await preflight(BASE, process.cwd() + "/qa");

let checked = 0;
let failures = 0;

for (const [route, minimum] of ROUTES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });

  // Collected per route and printed under its summary line.
  const report: string[] = [];

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

  /* Which wait applies. Poll the whole window; the last poll lands at or after
     MODE_WINDOW_MS, so a route that never declares readiness has waited at
     least as long as the fixed 2,200 ms this replaces. */
  const anyReady = () =>
    page.evaluate(
      () => document.querySelector("[data-split-source][data-lines-ready]") !== null,
    );
  let mode: "ready" | "fallback" = "fallback";
  const windowStart = Date.now();
  for (;;) {
    if (await anyReady()) {
      mode = "ready";
      break;
    }
    const elapsed = Date.now() - windowStart;
    if (elapsed >= MODE_WINDOW_MS) break;
    await page.waitForTimeout(Math.max(1, Math.min(POLL_MS, MODE_WINDOW_MS - elapsed)));
  }

  if (mode === "ready") {
    /* Headlines declare when their lines are final. Once one does, all must:
       a headline that never declares it is reported by source, loudly. */
    const unreadySources = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("[data-split-source]:not([data-lines-ready])")].map(
          (el) => el.getAttribute("data-split-source") ?? "",
        ),
      );
    const deadline = Date.now() + READY_TIMEOUT_MS;
    let unready = await unreadySources();
    while (unready.length > 0 && Date.now() < deadline) {
      await page.waitForTimeout(POLL_MS);
      unready = await unreadySources();
    }
    checked++;
    if (unready.length > 0) {
      failures++;
      report.push(
        `  FAIL ${route}: mode ready, data-lines-ready missing after ${READY_TIMEOUT_MS} ms on ${plural(unready.length, "source")}`,
      );
      for (const source of unready) report.push(`    unready: "${norm(source)}"`);
    }
  }
  // FALLBACK: `fallback` needs no further wait; the mode window above was it.
  // S9 deletes this branch and fails any route that is not `ready`.

  const settled = await page.evaluate(() => {
    /**
     * What a sighted reader actually sees.
     *
     * Reading innerText off the element counts the copy twice: the visible
     * masked lines AND the copy kept for assistive tech. So clone the subtree,
     * strip everything that is hidden from sight — the assistive-tech copy and
     * the invisible measuring clone — and read what is left.
     *
     * "Hidden" is decided by geometry, never by a class name: a class called
     * `sr-only` that is not applied (or is overridden) still shows its text,
     * and the same declarations under any other name still hide it.
     */
    const hiddenFromSight = (node: Element) => {
      const cs = getComputedStyle(node);
      if (cs.display === "none" || cs.visibility === "hidden") return true;
      // A clipped box of at most 1 × 1 px: its content cannot be read.
      const box = node.getBoundingClientRect();
      const clipsContent = cs.overflowX !== "visible" && cs.overflowY !== "visible";
      return box.width <= 1 && box.height <= 1 && clipsContent;
    };

    const visibleText = (el: Element) => {
      const clone = el.cloneNode(true) as HTMLElement;
      const originals = [el, ...el.querySelectorAll("*")];
      const clones = [clone, ...clone.querySelectorAll("*")];
      for (let i = originals.length - 1; i >= 0; i--) {
        if (hiddenFromSight(originals[i])) clones[i].remove();
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
    checked++;
    if (set.length < minimum) {
      failures++;
      report.push(
        `  FAIL ${route}: ${plural(set.length, "split headline")} < minimum ${minimum} [${phase}]`,
      );
    }

    for (const { source, rendered } of set) {
      checked++;
      if (norm(rendered) !== norm(source)) {
        failures++;
        const doubled = norm(rendered) === norm(`${source} ${source}`);
        report.push(`  MISMATCH ${route} [${phase}]: ${doubled ? "text doubled" : "text differs"}`);
        report.push(`    source:   "${norm(source)}"`);
        report.push(`    rendered: "${norm(rendered)}"`);
      }
    }
  }

  console.log(
    `${route.padEnd(46)} ${early.length} headline(s) (minimum ${minimum})  mode ${mode}`,
  );
  for (const line of report) console.log(line);
  await context.close();
}

await browser.close();

console.log(`\n${checked} headline assertions, ${failures} failure(s)`);
if (failures === 0) {
  console.log("HEADLINE GUARD OK - every split headline reads exactly as written");
} else {
  console.log("HEADLINE GUARD FAILED");
  process.exitCode = 1;
}
