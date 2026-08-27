/**
 * Lighthouse mobile baseline.
 *
 * Chromium is launched through Playwright rather than chrome-launcher: the
 * bundled binary won't spawn directly on this machine (side-by-side
 * configuration error) because Playwright sets up its own environment for it.
 * We open the debugging port ourselves and point Lighthouse at it.
 *
 *   node qa/lighthouse.mts [route ...]
 *
 * Expects the production server (`npm start`, port 3009) — dev-server numbers
 * are meaningless.
 */
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";
const OUT = path.join(process.cwd(), "qa", "lighthouse");
const PORT = 9222;

const routes = process.argv.slice(2);
const targets = routes.length
  ? routes
  : ["/", "/experiences/kourtaliotis-temple-of-nature"];

const slug = (route: string) =>
  route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");

/* How many times to measure each route. Default 1 for a quick look; the audit
 * runs 5.
 *
 * A single Lighthouse run against a deployment is not a measurement of the
 * build — it is a measurement of the build plus whatever the network and the
 * CDN were doing for those few seconds. Measured here, the SAME commit scored
 * anywhere from 87 to 99 on the same route, and the first route of a session
 * was consistently penalised against the second because the browser and the
 * connection were still cold. Comparing single runs across builds on that
 * basis produced a confident and wrong conclusion: that a font swap had cost
 * one route two points and breached the floor. It had not.
 *
 * Passes interleave the routes (A B A B ...) rather than repeating one route
 * before moving on, so cold-start lands on a different route each pass instead
 * of always taxing the same one. The budget then gates on the median. */
const RUNS = Math.max(1, Number(process.env.QA_LH_RUNS ?? 1));

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

async function run() {
  await fs.mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${PORT}`, "--no-sandbox"],
  });

  const summary: {
    route: string;
    scores: Record<string, number>;
    metrics: Record<string, string>;
    raw: { tbt: number; cls: number };
  }[] = [];

  for (let pass = 1; pass <= RUNS; pass++) {
   for (const route of targets) {
    process.stdout.write(
      `\nrunning: ${route}${RUNS > 1 ? `   (pass ${pass}/${RUNS})` : ""}\n`,
    );

    const result = await lighthouse(
      `${BASE}${route}`,
      {
        port: PORT,
        output: ["json", "html"],
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
      // Default config is mobile: Moto G Power emulation + 4x CPU throttle.
    );

    if (!result) {
      console.log("  no result");
      continue;
    }

    const { lhr, report } = result;
    const name = slug(route);
    await fs.writeFile(path.join(OUT, `${name}.json`), report[0]);
    await fs.writeFile(path.join(OUT, `${name}.html`), report[1]);

    const scores: Record<string, number> = {};
    for (const [key, category] of Object.entries(lhr.categories)) {
      scores[key] = Math.round((category.score ?? 0) * 100);
    }

    const pick = (id: string) => lhr.audits[id]?.displayValue ?? "n/a";
    const metrics = {
      FCP: pick("first-contentful-paint"),
      LCP: pick("largest-contentful-paint"),
      TBT: pick("total-blocking-time"),
      CLS: pick("cumulative-layout-shift"),
      SI: pick("speed-index"),
    };

    // displayValue is a human string ("70 ms", "3.4 s"). The budget check
    // needs numbers, so keep the raw values rather than re-parsing prose.
    const num = (id: string) => lhr.audits[id]?.numericValue ?? 0;
    const raw = {
      tbt: Math.round(num("total-blocking-time")),
      cls: num("cumulative-layout-shift"),
    };

    summary.push({ route, scores, metrics, raw });

    console.log(
      `  performance ${scores.performance} | a11y ${scores.accessibility} | best-practices ${scores["best-practices"]} | seo ${scores.seo}`,
    );
    console.log(
      `  LCP ${metrics.LCP} | TBT ${metrics.TBT} | CLS ${metrics.CLS} | SI ${metrics.SI}`,
    );

    // Biggest opportunities, so the next pass has somewhere to start.
    const opportunities = Object.values(lhr.audits)
      .filter(
        (a) =>
          a.details &&
          (a.details as { type?: string }).type === "opportunity" &&
          (a.numericValue ?? 0) > 100,
      )
      .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))
      .slice(0, 5);

    if (opportunities.length) {
      console.log("  top opportunities:");
      for (const o of opportunities) {
        console.log(`    - ${o.title} (${Math.round(o.numericValue ?? 0)} ms)`);
      }
    }
   }
  }

  await browser.close();
  await fs.writeFile(
    path.join(OUT, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(`\nreports -> qa/lighthouse/`);

  /* The budgets, enforced.
   *
   * This script printed scores and always exited 0, which meant it could not
   * do the one job a budget has. It reported `performance 0 | a11y 0` for a
   * mis-quoted route argument and passed; it reported performance 87 against
   * a floor of 89 and passed. A number nobody is required to act on is a
   * report, not a budget — so the run fails now, un-piped, and the exit code
   * gates whatever comes after it. */
  const BUDGET = {
    performance: 89, // floor
    accessibility: 100, // floor
    cls: 0, // hard wall
    tbtMs: 250, // ceiling
  };

  const breaches: string[] = [];
  const routes = [...new Set(summary.map((r) => r.route))];

  console.log("");
  for (const route of routes) {
    const rows = summary.filter((r) => r.route === route);
    const perf = rows.map((r) => r.scores.performance);
    const a11y = rows.map((r) => r.scores.accessibility);
    const tbt = rows.map((r) => r.raw.tbt);
    const cls = rows.map((r) => r.raw.cls);

    const m = {
      perf: median(perf),
      a11y: median(a11y),
      tbt: median(tbt),
      cls: median(cls),
    };

    // The spread is printed, not just the median. A route whose runs range
    // 87-99 and one that sits flat on 93 both have a median of 93, and they
    // are not the same site.
    console.log(
      `${route}\n  performance ${m.perf} [${[...perf].sort((a, b) => a - b).join(" ")}]  ` +
        `a11y ${m.a11y}  TBT ${m.tbt}ms  CLS ${m.cls}`,
    );

    if (m.perf < BUDGET.performance)
      breaches.push(`${route}: median performance ${m.perf} < ${BUDGET.performance}`);
    if (m.a11y < BUDGET.accessibility)
      breaches.push(`${route}: median a11y ${m.a11y} < ${BUDGET.accessibility}`);
    // CLS is a hard wall at zero. The epsilon is float dust only: Lighthouse
    // displays anything under 0.0005 as "0", so this catches every shift a
    // reader could actually see without failing on a rounding artefact.
    if (m.cls > BUDGET.cls + 0.0005)
      breaches.push(`${route}: median CLS ${m.cls.toFixed(4)} > ${BUDGET.cls}`);
    if (m.tbt > BUDGET.tbtMs)
      breaches.push(`${route}: median TBT ${m.tbt}ms > ${BUDGET.tbtMs}ms`);
  }

  if (breaches.length) {
    console.error(`\n${breaches.length} budget breach(es):`);
    for (const b of breaches) console.error(`  x  ${b}`);
    console.error(
      "\nLIGHTHOUSE BUDGET FAILED — this is the median of the runs, not a\n" +
        "single unlucky one, so re-running is unlikely to clear it. Find the\n" +
        "cause. Do not edit the floor to make a red run green.",
    );
    process.exit(1);
  }

  console.log(
    `LIGHTHOUSE BUDGET OK — performance >= ${BUDGET.performance}, a11y ` +
      `${BUDGET.accessibility}, CLS ${BUDGET.cls}, TBT <= ${BUDGET.tbtMs}ms`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
