/**
 * Contrast of text that sits ON a photograph, measured against what is
 * actually rendered behind it.
 *
 *   node qa/text-contrast.mts            (QA_BASE_URL, default localhost:3009)
 *
 * Why this exists as a guard rather than a judgement.
 *
 * Every automated a11y check this project runs — Lighthouse included — reads
 * contrast from CSS colour pairs. Text over an image has no CSS pair to read,
 * so a hero headline is simply not checked by any of them. It was reviewed by
 * eye instead, which worked only while the images were graded matte.
 *
 * Grade C made every photograph brighter, and the beauty pass then lightened
 * the hero scrim from 42-58% to 22-34% across the top of the frame to let that
 * grade be seen. That is exactly the change that silently breaks light text on
 * a light photograph, and "it still looks fine" is not a measurement.
 *
 * So: hide the text, photograph what is behind it, and compute the real
 * contrast ratio against the text's own computed colour — at the mean, at the
 * brightest 5%, and at the single worst pixel in the box. The worst pixel is
 * the one that matters, because that is where a letterform actually sits on a
 * highlight.
 *
 * WCAG: large text needs 3:1 (AA) and 4.5:1 (AAA). These are display sizes, so
 * the floor enforced here is 3:1 at the worst pixel — and the current build
 * clears 4.5:1 there, which is AAA at the worst point in the box.
 */
import { chromium, type Page } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

/** Worst-pixel floor. Large text: 3:1 is AA, 4.5:1 is AAA. */
const FLOOR = 3.0;

const TARGETS = [
  { route: "/", selector: "h1", label: "home hero headline" },
  { route: "/", selector: "h1 ~ * p, h1 + p", label: "home hero subcopy", optional: true },
  {
    route: "/experiences/kourtaliotis-temple-of-nature",
    selector: "h1",
    label: "experience hero headline",
  },
  {
    route: "/transfers/private-transfers-rethymno",
    selector: "h1",
    label: "transfer hero headline",
  },
];

let failures = 0;

async function measure(page: Page, selector: string) {
  const info = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const box = el.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return null;
    return {
      clip: {
        x: Math.max(0, Math.round(box.x)),
        y: Math.max(0, Math.round(box.y)),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
      color: getComputedStyle(el).color,
    };
  }, selector);
  if (!info) return null;

  // Hide only the text, so the screenshot is of the backdrop the glyphs sit on.
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) el.style.visibility = "hidden";
  }, selector);
  await page.waitForTimeout(250);

  const shot = await page.screenshot({ clip: info.clip });

  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) el.style.visibility = "";
  }, selector);

  /* Decode in the page rather than adding an image library: the browser is
     already here, it is the same decoder that drew the pixels, and it is the
     only thing that can resolve a modern colour string correctly.

     The text colour is NOT parsed out of the string. An earlier version pulled
     digits out with a regex, which turned `oklab(0.942543 0.00297764 ...)` into
     luminance nonsense and reported a contrast ratio of 3.9 billion to one. A
     1x1 canvas filled with the computed colour gives the resolved sRGB bytes
     for any colour space, and its alpha too.

     Alpha matters: the subcopy is 75% opaque, so the colour a reader actually
     sees is that text composited over whatever pixel is behind it. The ratio
     is therefore computed PER PIXEL, compositing first — which is the only way
     the "worst pixel" figure means anything for translucent text. */
  const stats = await page.evaluate(
    async ({ dataUrl, color }) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(img, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

      // Resolve the text colour — any colour space — to sRGB bytes + alpha.
      const probe = document.createElement("canvas");
      probe.width = probe.height = 1;
      const pctx = probe.getContext("2d")!;
      pctx.clearRect(0, 0, 1, 1);
      pctx.fillStyle = color;
      pctx.fillRect(0, 0, 1, 1);
      const [tr, tg, tb, ta] = pctx.getImageData(0, 0, 1, 1).data;
      const alpha = ta / 255;

      const lin = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      const lum = (r: number, g: number, b: number) =>
        0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const ratio = (a: number, b: number) => {
        const hi = Math.max(a, b);
        const lo = Math.min(a, b);
        return (hi + 0.05) / (lo + 0.05);
      };

      const ratios: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const br = data[i];
        const bg = data[i + 1];
        const bb = data[i + 2];
        // The glyph as actually painted: text over this pixel.
        const fr = alpha * tr + (1 - alpha) * br;
        const fg = alpha * tg + (1 - alpha) * bg;
        const fb = alpha * tb + (1 - alpha) * bb;
        ratios.push(ratio(lum(fr, fg, fb), lum(br, bg, bb)));
      }
      ratios.sort((a, b) => a - b);
      return {
        pixels: ratios.length,
        alpha,
        worst: ratios[0],
        p95: ratios[Math.floor(ratios.length * 0.05)],
        mean: ratios.reduce((a, b) => a + b, 0) / ratios.length,
      };
    },
    { dataUrl: `data:image/png;base64,${shot.toString("base64")}`, color: info.color },
  );

  return {
    color: info.color,
    pixels: stats.pixels,
    alpha: stats.alpha,
    mean: stats.mean,
    p95: stats.p95,
    worst: stats.worst,
  };
}

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();

for (const target of TARGETS) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${target.route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(2200);

  const result = await measure(page, target.selector);
  if (!result) {
    if (!target.optional) {
      console.log(`  MISS  ${target.label} — selector "${target.selector}" found nothing`);
      failures++;
    }
    await context.close();
    continue;
  }

  const ok = result.worst >= FLOOR;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"}  ${target.label.padEnd(28)} ` +
      `mean ${result.mean.toFixed(2)}:1   p05 ${result.p95.toFixed(2)}:1   ` +
      `worst pixel ${result.worst.toFixed(2)}:1` +
      (result.alpha < 0.999 ? `   (alpha ${result.alpha.toFixed(2)}, composited)` : ""),
  );

  await context.close();
}

await browser.close();

console.log(`\n${failures} failure(s)`);
if (failures > 0) {
  console.log(
    "TEXT CONTRAST FAILED — text over a photograph fell under " +
      `${FLOOR}:1 at its worst pixel. Darken the scrim in the TEXT ZONE only; ` +
      "the upper stops exist to let the photograph be seen.",
  );
  process.exit(1);
}
console.log(
  `TEXT CONTRAST OK - every headline over a photograph clears ${FLOOR}:1 at its worst pixel`,
);
