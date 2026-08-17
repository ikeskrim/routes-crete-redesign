/**
 * Before/after stills for the eyebrow contrast retune.
 *
 * The a11y fix (sand-200/50 -> /70, /45 -> /65) changes how every small
 * uppercase label on the site reads. That is a visible design change that
 * arrived as an accessibility fix, and the client should not meet it as a
 * surprise in the digest.
 *
 * "Before" is not reconstructed by editing CSS back — it is captured from the
 * last REAL deployment that still carries the old values, so the comparison is
 * two shipped builds rather than one build and a guess. Pass the two origins:
 *
 *   node qa/contrast-shots.mts <before-url> <after-url>
 */
import { chromium, type Browser } from "playwright";
import fs from "node:fs";

const BEFORE = process.argv[2];
const AFTER = process.argv[3];
if (!BEFORE || !AFTER) {
  console.error("Usage: node qa/contrast-shots.mts <before-url> <after-url>");
  process.exit(1);
}

const OUT = "qa/screenshots/contrast";
fs.mkdirSync(OUT, { recursive: true });

/* No colour parser lives here, on purpose.
 *
 * Tailwind v4 authors these colours in oklab(), so getComputedStyle returns
 * e.g. "oklab(0.898 0.004 0.032 / 0.7)". The first version of this script
 * pulled the numbers out with a regex and fed them to an sRGB luminance
 * formula, which read the oklab components as if they were 0-255 channels and
 * reported a flat 1.12:1 for every label — before AND after — making a real
 * fix look like no change at all.
 *
 * The browser already knows how to composite alpha over a background and
 * resolve any colour space to sRGB pixels, so the ratio is computed in-page by
 * painting the two colours onto a canvas and reading the pixel back. That is
 * measurement instead of modelling, and it cannot drift out of step with how
 * the page is actually painted. */

async function shoot(browser: Browser, label: string, base: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60_000 });

  // The footer holds the labels Lighthouse actually flagged. Scroll it into
  // view and let the reveal settle before shooting.
  await page.evaluate(() => document.querySelector("footer")?.scrollIntoView({ block: "end" }));
  await page.waitForTimeout(2500);

  const footer = page.locator("footer");
  await footer.screenshot({ path: `${OUT}/${label}-footer.png` });

  // Measure the real composited colours rather than trusting the class name.
  const measured = await page.evaluate(() => {
    const rgb = (el: Element) => getComputedStyle(el).color;
    const bgOf = (el: Element) => {
      let n: Element | null = el;
      while (n) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba?\([^)]*,\s*0\)/.test(c) && c !== "transparent") return c;
        n = n.parentElement;
      }
      return "rgb(4, 20, 29)";
    };
    /* Composite and measure in the browser: paint bg, paint the
       semi-transparent fg over it, read the resulting sRGB pixel. */
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 4;
    const ctx2d = canvas.getContext("2d")!;
    const composite = (fg: string, bg: string) => {
      ctx2d.clearRect(0, 0, 4, 4);
      ctx2d.fillStyle = bg;
      ctx2d.fillRect(0, 0, 4, 4);
      ctx2d.fillStyle = fg;
      ctx2d.fillRect(0, 0, 4, 4);
      const [r, g, b] = ctx2d.getImageData(1, 1, 1, 1).data;
      return [r, g, b] as [number, number, number];
    };
    const lum = ([r, g, b]: [number, number, number]) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (fg: string, bg: string) => {
      const [l1, l2] = [lum(composite(fg, bg)), lum(composite(bg, bg))].sort((a, b) => b - a);
      return (l1 + 0.05) / (l2 + 0.05);
    };

    return [...document.querySelectorAll("footer h3, footer .text-eyebrow")]
      .slice(0, 6)
      .map((el) => {
        const color = rgb(el);
        const bg = bgOf(el);
        const [r, g, b] = composite(color, bg);
        return {
          text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 22),
          cls: (el.className ?? "").toString().match(/text-sand-200\/\d+/)?.[0] ?? "(other)",
          painted: `rgb(${r}, ${g}, ${b})`,
          bg,
          ratio: Number(contrast(color, bg).toFixed(2)),
        };
      });
  });

  console.log(`\n${label} — ${base}`);
  for (const m of measured) {
    const verdict = m.ratio >= 4.5 ? "pass" : "FAIL";
    console.log(
      `  ${m.cls.padEnd(18)} painted ${m.painted.padEnd(20)} = ${String(m.ratio).padStart(5)}:1  ${verdict}  "${m.text}"`,
    );
  }

  await ctx.close();
  return measured;
}

const browser = await chromium.launch();
await shoot(browser, "before", BEFORE);
await shoot(browser, "after", AFTER);
await browser.close();

console.log(`\nstills -> ${OUT}/  (before-footer.png, after-footer.png)`);
console.log("WCAG floor for this text size is 4.5:1.");
