/**
 * Study (never copy) the motion vocabulary of a reference site.
 * Extracts timing/easing/structure signals only — no markup, assets or copy.
 */
import { chromium } from "playwright";
import fs from "node:fs";

/** Supplied at call time — see the note in benchmark-shots.mts. */
const URL = process.argv[2] ?? process.env.QA_BENCHMARK_URL;
if (!URL) {
  console.error(
    "Usage: node qa/study-benchmark.mts <url>   (or set QA_BENCHMARK_URL)",
  );
  process.exit(1);
}
const log = (m: string) => fs.appendFileSync("qa/benchmark.log", m + "\n");
fs.writeFileSync("qa/benchmark.log", "");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } } as never);
await page.goto(URL, { waitUntil: "load", timeout: 90_000 });
await page.waitForTimeout(6000);

const data = await page.evaluate(() => {
  // Collect declared keyframes and the transition/animation timings in use.
  const keyframes = new Set<string>();
  const easings = new Map<string, number>();
  const durations = new Map<string, number>();

  for (const sheet of [...document.styleSheets]) {
    let rules: CSSRuleList | undefined;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin
    }
    for (const rule of [...(rules ?? [])]) {
      if (rule.constructor.name === "CSSKeyframesRule") {
        keyframes.add((rule as CSSKeyframesRule).name);
      }
    }
  }

  const bump = (m: Map<string, number>, k: string) => {
    if (!k || k === "none" || k === "0s" || k === "all") return;
    m.set(k, (m.get(k) ?? 0) + 1);
  };

  const els = [...document.querySelectorAll("*")].slice(0, 4000);
  for (const el of els) {
    const cs = getComputedStyle(el);
    bump(easings, cs.transitionTimingFunction);
    bump(durations, cs.transitionDuration);
    bump(easings, cs.animationTimingFunction);
    bump(durations, cs.animationDuration);
  }

  const top = (m: Map<string, number>, n = 10) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  return {
    keyframes: [...keyframes].slice(0, 30),
    topEasings: top(easings),
    topDurations: top(durations),
    counts: {
      video: document.querySelectorAll("video").length,
      videoAutoplayLoop: [...document.querySelectorAll("video")].filter(
        (v) => (v as HTMLVideoElement).loop && (v as HTMLVideoElement).autoplay,
      ).length,
      canvas: document.querySelectorAll("canvas").length,
      sections: document.querySelectorAll("section").length,
      stickyEls: els.filter((e) => getComputedStyle(e).position === "sticky").length,
      willChange: els.filter((e) => getComputedStyle(e).willChange !== "auto").length,
    },
    // Structural rhythm: how big is the display type, how small the labels?
    fontSizes: [...new Set(
      els
        .filter((e) => e.textContent && e.textContent.trim().length > 0 && e.children.length === 0)
        .map((e) => parseFloat(getComputedStyle(e).fontSize))
        .filter((n) => !Number.isNaN(n)),
    )]
      .sort((a, b) => b - a)
      .slice(0, 12),
    docHeightVh: Math.round(
      (document.documentElement.scrollHeight / window.innerHeight) * 100,
    ),
  };
});

log(JSON.stringify(data, null, 1));
await browser.close();
