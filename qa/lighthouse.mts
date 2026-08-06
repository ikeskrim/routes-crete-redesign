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

async function run() {
  await fs.mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${PORT}`, "--no-sandbox"],
  });

  const summary: { route: string; scores: Record<string, number>; metrics: Record<string, string> }[] = [];

  for (const route of targets) {
    process.stdout.write(`\nrunning: ${route}\n`);

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

    summary.push({ route, scores, metrics });

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

  await browser.close();
  await fs.writeFile(
    path.join(OUT, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(`\nreports -> qa/lighthouse/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
