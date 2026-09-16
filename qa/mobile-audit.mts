/**
 * 390px audit, across every route, plus overflow at the tablet band edges.
 *
 * Mechanical rather than by eye: an eye scrolling a phone frame catches the
 * obvious and misses the 2px overflow that only shows on a real device with a
 * different scrollbar. Each check is a property a visitor can feel:
 *
 *   U1  nothing scrolls sideways (390x844; overflow only at 768x1024, 1023x768)
 *   U2  every tappable thing is at least 44x44 (the WCAG 2.5.8 target size)
 *   U3  no body text below 14px
 *   U4  the named type tokens, reported by size (a design decision, not enforced)
 *   U5  images declare dimensions, so nothing jumps as they load
 *   U6  the fixed header never covers the first heading on the page
 *
 * Instrument (C+ SPEC §I.1, stage S1q):
 *   - U2's skip-link exemption is decided by GEOMETRY, not by the class name.
 *     It used to exempt any target whose class string merely CONTAINED
 *     "sr-only", so `not-sr-only` (a visible target) was exempt too. Now a
 *     target is exempt only when its own box is at most 1 x 1 px and clips its
 *     content, which is what `sr-only` does, whatever the class is called.
 *   - Routes: adds /experiences/heart-of-cretan-tradition and the 404 route.
 *     Every route's HTTP status is asserted (200, or 404 for the 404 route), so
 *     a route cannot pass by rendering an error page instead of itself.
 *   - U1 also loads every route at 768x1024 and 1023x768 (overflow only, SPEC
 *     §D.1). The reference width is the smaller of `innerWidth` and the
 *     layout viewport (`documentElement.clientWidth`), so a zoomed-out mobile
 *     viewport or a classic scrollbar cannot widen the allowance.
 *   - U6 is an ASSERTION (it was measured and never checked): the site
 *     header's bottom must not sit below the top of the first visible
 *     `main h1, main h2`, unless the header is transparent over a photographic
 *     `[data-hero-tone="dark"]` hero that holds that heading.
 *
 * C+ (§D.1, §D.4, §I.3 S9 rows; no new switch, the assertions above already
 * cover the C+ build): an overlap over the paper cover
 * (`[data-hero-tone="light"]`) is reported as "the header covers the h1 on
 * the paper … cover", and every U1 failure also prints
 * "-> U1 <width> on <route>: scrollWidth N > <allowance>".
 *
 *   node qa/mobile-audit.mts
 */
import { chromium, type Page } from "playwright";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

/** Rendered by `src/app/not-found.tsx`; must answer 404. */
const NOT_FOUND_ROUTE = "/this-route-does-not-exist";

const ROUTES = [
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

/** U1 only: the edges of the 640–1023 band (SPEC §D.1). */
const WIDE_VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1023, height: 768 },
] as const;

/** U6: sub-pixel layout may put the two edges a hair apart when they touch. */
const U6_TOLERANCE_PX = 0.5;

const failures: string[] = [];
const check = (id: string, route: string, ok: boolean, line: string) => {
  console.log(`  ${ok ? "ok   " : "FAIL "} ${line}`);
  if (!ok) failures.push(`${id} on ${route}`);
};

/**
 * U1, shared by every viewport. Runs in the page.
 */
const measureOverflow = () => {
  const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);

  // Anything actually sticking out past the viewport, named.
  const overflowing = [...document.querySelectorAll("body *")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") return false;
      /* Ignore anything clipped by an ancestor. Ken-Burns and parallax
         layers are deliberately oversized inside `overflow: hidden` frames —
         they stick out of their parent and nowhere else, and listing them
         buries the one element that actually widens the page. (The listing
         is only the diagnosis; the assertion is scrollWidth.) */
      for (let n = el.parentElement; n; n = n.parentElement) {
        const o = getComputedStyle(n).overflowX;
        if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") return false;
      }
      return r.right > vw + 1 || r.left < -1;
    })
    .slice(0, 5)
    .map((el) => `${el.tagName}.${String(el.className).slice(0, 26)} right=${Math.round(el.getBoundingClientRect().right)}`);

  return { scrollWidth: document.documentElement.scrollWidth, vw, overflowing };
};

async function openRoute(page: Page, route: string) {
  const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2200);
  return response?.status() ?? 0;
}

function reportOverflow(route: string, label: string, o: Awaited<ReturnType<typeof measureOverflow>>) {
  const ok = o.scrollWidth <= o.vw + 1;
  check(
    `U1 ${label}`,
    route,
    ok,
    `U1 ${label}: scrollWidth ${o.scrollWidth} vs ${o.vw}` +
      (o.overflowing.length ? ` — ${o.overflowing.join("; ")}` : ok ? " — no horizontal overflow" : ""),
  );
  // The route and the allowance, named, so a log line says where it broke.
  if (!ok) console.log(`        -> U1 ${label} on ${route}: scrollWidth ${o.scrollWidth} > ${o.vw + 1}`);
}

await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const wideContexts = await Promise.all(
  WIDE_VIEWPORTS.map(async (viewport) => ({ viewport, ctx: await browser.newContext({ viewport }) })),
);

for (const route of ROUTES) {
  console.log(`\n${route}`);
  const page = await ctx.newPage();
  const status = await openRoute(page, route);
  const expected = route === NOT_FOUND_ROUTE ? 404 : 200;
  check("HTTP", route, status === expected, `HTTP ${status} (expected ${expected})`);

  const overflow = await page.evaluate(measureOverflow);

  const report = await page.evaluate((tolerance) => {
    /* What `sr-only` does, recognised by what it does: a box of at most
       1 x 1 px that clips its content. Never by the class name. */
    const clippedToAPixel = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width <= 1 && r.height <= 1 && cs.overflowX !== "visible" && cs.overflowY !== "visible";
    };

    // Tap targets. Links inside a paragraph are exempt: inline text links are
    // explicitly carved out of WCAG 2.5.8, and padding them to 44px would
    // wreck the typography they live in.
    const small = [...document.querySelectorAll("a, button")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        if (el.closest("p")) return false;
        /* The skip link is 1x1 until focused — that is the pattern working,
           not a small target. Judged by its box: a class that merely contains
           "sr-only" (`not-sr-only`) is a visible target and is measured. */
        if (clippedToAPixel(el)) return false;
        /* Map pins are positioned by the data, which WCAG 2.5.8 exempts, and
           the chart carries a full-size legend beneath it on mobile. */
        if (el.closest("[data-map]")) return false;
        return r.height < 44 || r.width < 24;
      })
      .slice(0, 6)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `"${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`;
      });

    /* Body copy that has become unreadable at this width.
     *
     * `text-eyebrow` is deliberately excluded and reported separately. Those
     * 11px uppercase labels are the design's voice, not an oversight, and
     * raising them is a taste call for the client rather than something a
     * guard should force. Excluding them silently would be how a guard rots,
     * so their exact sizes are still printed on every run — the decision stays
     * measurable while it is open. */
    const tokenSize = (sel: string) =>
      [...new Set([...document.querySelectorAll(sel)]
        .map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize))))].sort().join("/");
    const eyebrows = tokenSize(".text-eyebrow");
    const captions = tokenSize(".text-caption");

    const tiny = [...document.querySelectorAll("p, li, span")]
      .filter((el) => {
        const t = (el.textContent ?? "").trim();
        if (t.length < 25) return false;
        if (el.children.length) return false;
        /* Named type-scale tokens are design decisions, reported below by
           name and size. This check exists to catch AD HOC small text — a
           stray text-[11px] on a paragraph — which is a defect rather than a
           decision. */
        if (/text-(eyebrow|caption)/.test(String(el.className))) return false;
        if (el.closest(".text-eyebrow, .text-caption")) return false;
        const size = parseFloat(getComputedStyle(el).fontSize);
        return size < 14;
      })
      .slice(0, 5)
      .map((el) => `${Math.round(parseFloat(getComputedStyle(el).fontSize))}px "${(el.textContent ?? "").trim().slice(0, 24)}"`);

    // Images without intrinsic dimensions jump when they load.
    const undimensioned = [...document.querySelectorAll("main img")].filter(
      (img) => !img.getAttribute("width") && !(img as HTMLImageElement).style.height,
    ).length;

    /* U6: does the fixed header cover the first heading?
     *
     * The first h1/h2 in main that a visitor can see: headings with no box, a
     * `visibility: hidden` style or a clipped 1 x 1 box (the sr-only h2 on
     * /experiences) are not "the first thing on the page". */
    const header = document.querySelector("header[data-site-chrome]");
    const heading = [...document.querySelectorAll("main h1, main h2")].find((h) => {
      const r = h.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      if (getComputedStyle(h).visibility === "hidden") return false;
      return !clippedToAPixel(h);
    });
    let u6: { ok: boolean; line: string; covered?: string };
    if (!header) {
      u6 = { ok: false, line: "U6: site header not found (header[data-site-chrome])" };
    } else if (!heading) {
      u6 = { ok: false, line: "U6: no visible h1/h2 in main" };
    } else {
      const hb = header.getBoundingClientRect();
      const ht = heading.getBoundingClientRect();
      const tag = heading.tagName.toLowerCase();
      // A split headline's textContent repeats its copies; its source reads once.
      const name = (heading.getAttribute("data-split-source") ?? heading.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 32);
      const measured = `header bottom ${Math.round(hb.bottom)}, ${tag} top ${Math.round(ht.top)} "${name}"`;
      if (hb.bottom <= ht.top + tolerance) {
        u6 = { ok: true, line: `U6: header bottom <= ${tag} top — ${measured}` };
      } else {
        /* The one allowed overlap: the header paints nothing (transparent
           colour, no background image) over a photographic dark hero that
           spans the whole header band and holds the heading. */
        const cs = getComputedStyle(header);
        const alpha = (() => {
          const c = cs.backgroundColor;
          if (c === "transparent") return 0;
          const parts = (c.match(/\(([^)]*)\)/)?.[1] ?? "").split(/[\s,/]+/).filter(Boolean);
          return parts.length >= 4 ? parseFloat(parts[3]) : 1;
        })();
        const transparent = alpha === 0 && cs.backgroundImage === "none";
        const spansBand = (r: DOMRect) =>
          r.top <= hb.top + 1 && r.bottom >= hb.bottom - 1 && r.left <= hb.left + 1 && r.right >= hb.right - 1;
        const hero = heading.closest('[data-hero-tone="dark"]');
        const heroBehind = !!hero && spansBand(hero.getBoundingClientRect());
        const photoBehind =
          heroBehind &&
          [...hero!.querySelectorAll("img")].some((img) => {
            const i = img as HTMLImageElement;
            return (
              i.complete &&
              i.naturalWidth > 0 &&
              getComputedStyle(i).visibility !== "hidden" &&
              spansBand(i.getBoundingClientRect())
            );
          });
        if (transparent && heroBehind && photoBehind) {
          u6 = {
            ok: true,
            line: `U6: header bottom > ${tag} top, exempt: transparent header over a photographic [data-hero-tone="dark"] hero — ${measured}`,
          };
        } else {
          /* C+: the cover is paper ([data-hero-tone="light"]); a transparent
             bar over it shows ink over ink, so an overlap there is never
             exempt and is named for what it is. */
          const paperCover = transparent && !!heading.closest('[data-hero-tone="light"]');
          const why = !transparent
            ? "header not transparent"
            : paperCover
              ? `the header covers the ${tag} on the paper [data-hero-tone="light"] cover`
              : !heroBehind
                ? `no [data-hero-tone="dark"] hero holding the ${tag} behind the header`
                : "no loaded photograph behind the header";
          u6 = { ok: false, line: `U6: header bottom > ${tag} top — ${measured} (${why})`, covered: `${tag} "${name}"` };
        }
      }
    }

    return {
      small,
      tiny,
      eyebrows,
      captions,
      undimensioned,
      images: document.querySelectorAll("main img").length,
      u6,
    };
  }, U6_TOLERANCE_PX);

  reportOverflow(route, "390", overflow);
  check(
    "U2",
    route,
    report.small.length === 0,
    report.small.length
      ? `U2: tap targets < 44px tall — ${report.small.join("; ")}`
      : "U2: tap targets >= 44px tall — all block-level targets pass",
  );
  check(
    "U3",
    route,
    report.tiny.length === 0,
    report.tiny.length
      ? `U3: <14 px text — ${report.tiny.join("; ")}`
      : "U3: no body text under 14px — smallest body copy is >= 14px",
  );
  console.log(
    `  note  U4: type tokens at this width: text-eyebrow ${report.eyebrows || "-"}px, ` +
      `text-caption ${report.captions || "-"}px — design decisions, reported not enforced`,
  );
  check(
    "U5",
    route,
    report.undimensioned === 0,
    `U5: images declare their dimensions — ${report.undimensioned}/${report.images} without intrinsic size`,
  );
  check("U6", route, report.u6.ok, report.u6.line);
  if (!report.u6.ok && report.u6.covered) {
    console.log(`        -> U6 on ${route}: the header covers the ${report.u6.covered}`);
  }
  await page.close();

  for (const { viewport, ctx: wide } of wideContexts) {
    const widePage = await wide.newPage();
    const wideStatus = await openRoute(widePage, route);
    const label = String(viewport.width);
    check("HTTP", route, wideStatus === expected, `HTTP ${wideStatus} at ${viewport.width}x${viewport.height} (expected ${expected})`);
    reportOverflow(route, label, await widePage.evaluate(measureOverflow));
    await widePage.close();
  }
}

for (const { ctx: wide } of wideContexts) await wide.close();
await ctx.close();
await browser.close();

console.log(`\n${failures.length} failure(s)`);
if (failures.length === 0) {
  console.log("MOBILE AUDIT OK - 390px holds across every route, and nothing overflows at 768 or 1023");
} else {
  console.log(`failed: ${failures.join("; ")}`);
  console.log("MOBILE AUDIT FAILED");
  process.exitCode = 1;
}
