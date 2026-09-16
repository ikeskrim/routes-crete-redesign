/**
 * Contrast of text that sits ON a photograph, measured against what is
 * actually rendered behind it, one text run at a time.
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
 * darkest 5%, and at the single worst pixel. The worst pixel is the one that
 * matters, because that is where a letterform actually sits on a highlight.
 *
 * PER TEXT RUN (C+ spec §I.1). The first version measured an element's whole
 * box in the element's own colour, after hiding the element with
 * `visibility: hidden`. Once a headline can span paper and a photograph, all
 * three of those are wrong:
 *
 *  - One colour for the whole box. A descendant with its own colour (a line
 *    span, an emphasis word) was measured in its ancestor's colour. Each run
 *    now takes the colour of its own parent element.
 *  - `visibility: hidden` on the element also removes every descendant's
 *    background, so a box painted inside the headline was never part of the
 *    backdrop. Now only glyphs are hidden: each text node is wrapped in a
 *    hidden span, and every box stays painted.
 *  - Text nobody reads. SplitLines keeps an invisible measuring copy and an
 *    `sr-only` copy. Runs are located with Range.getClientRects() per text
 *    node, clipped by every overflow ancestor that clips them; a run whose
 *    clipped box is at most 1 x 1 px, or whose visibility is hidden, is not
 *    painted — decided by geometry, never by class name.
 *
 * Unchanged: the routes, the selectors, the 1440 x 900 viewport, fonts.ready
 * + 2200 ms, the 250 ms settle after hiding, the in-page decode, per-pixel
 * compositing, and the 3:1 floor at the worst pixel on all three routes.
 *
 * Stricter than before, so nothing that failed can start passing by accident:
 *  - the colour's alpha is multiplied by every ancestor's opacity, so a reveal
 *    stuck half-way is measured as the half-transparent text it is;
 *  - boxes snap OUTWARD to whole pixels;
 *  - a target that exists but has no painted run fails (it no longer measures
 *    an empty box), and a run outside the viewport fails;
 *  - hiding must not move any run by more than 0.5 px, and must change at least
 *    one pixel under each run, or the instrument is measuring the wrong place.
 *
 * The runs of one element are hidden together, as the element was before:
 * where display lines overlap, a neighbouring line's glyphs are other text, not
 * the backdrop this run is read against.
 *
 * New C+ assertions (§B.2, §I.1, §I.3; on at S9 through qa/cplus-stage.mts;
 * they need C+ markup that the pre-rollout site does not have):
 *  - Per route, the measured groups are the first `h1` (on `/` the cover,
 *    which spans paper and plate), the home subcopy (optional), and every
 *    `[data-on-photo]` element outside them: the ItemHero eyebrow and
 *    subtitle, and the transparent masthead's wordmark, trigger label and
 *    "Book Now". A run inside `[data-on-photo]` is an on-photo run; the
 *    others are measured against whatever is behind them (paper, for the
 *    cover's first line), with the same instrument.
 *  - Floors per run: 3.0 for runs of 24 px and more, 4.5 below 24 px.
 *  - Non-vacuity: at least one on-photo run on each route (`/`, Kourtaliotis
 *    and the transfer detail), printed as "0 on-photo runs on <route>".
 *  - Two frames: every CSS animation under `[data-hero]` (the Ken Burns push)
 *    is paused and sought to t = 0 for the first frame, then to its end
 *    (`currentTime = effect.getComputedTiming().endTime`) for the end frame;
 *    `animation-play-state` can only pause, not seek. Each failure names its
 *    frame: "first frame: …" or "end frame: …".
 *
 * WCAG: large text needs 3:1 (AA) and 4.5:1 (AAA). These are display sizes, so
 * the floor enforced here is 3:1 at the worst pixel (before S9).
 */
import { chromium, type Page } from "playwright";
import { cplusS9, cplusS9Line } from "./cplus-stage.mts";
import { preflight } from "./preflight.mts";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3009";

/** Worst-pixel floor. Large text: 3:1 is AA, 4.5:1 is AAA. */
const FLOOR = 3.0;

/** A run clipped to at most this in both dimensions paints nothing a reader
    can see (`sr-only` is a 1 x 1 clip). */
const HIDDEN_PX = 1;

/** Hiding a run must not move any run by more than this. */
const MOVE_TOLERANCE_PX = 0.5;

/** Hiding a run must change at least one pixel under it by this much in some
    channel, or its box is not where its glyphs are painted. */
const PAINT_DELTA = 16;

interface Target {
  route: string;
  selector: string;
  label: string;
  /** Skip, rather than fail, when the selector finds nothing. */
  optional?: boolean;
}

const TARGETS: Target[] = [
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

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** C+ S9 (§B.2): runs under 24 px must clear 4.5:1 at their worst pixel. */
const SMALL_FLOOR = 4.5;
const LARGE_TEXT_PX = 24;

/** C+ S9: the routes whose text sits on photographs, and their groups. */
const S9_ROUTES: { route: string; label: string; subcopy?: boolean }[] = [
  { route: "/", label: "home", subcopy: true },
  { route: "/experiences/kourtaliotis-temple-of-nature", label: "experience hero" },
  { route: "/transfers/private-transfers-rethymno", label: "transfer hero" },
];

interface Run {
  /** Index into the page's `window.__textContrast.nodes`. */
  id: number;
  excerpt: string;
  fontSize: string;
  /** The run sits inside a `[data-on-photo]` element. */
  onPhoto: boolean;
  color: string;
  /** Product of every ancestor's computed opacity. */
  opacity: number;
  /** Unclipped client rects, for the "hiding moved nothing" check. */
  raw: Box[];
  /** Painted parts: clipped, inside the viewport, snapped outward. */
  boxes: Box[];
}

interface Group {
  tag: string;
  width: number;
  height: number;
  runs: Run[];
  hiddenByVisibility: number;
  clippedAway: number;
  offscreen: string[];
}

interface Stats {
  pixels: number;
  painted: number;
  alpha: number;
  mean: number;
  p05: number;
  worst: number;
}

/** Find the first element matching the selector and every text run inside it. */
function scan(page: Page, selector: string): Promise<Group | null> {
  return page.evaluate(
    ({ selector, hiddenPx }) => {
      interface Box {
        x: number;
        y: number;
        width: number;
        height: number;
      }
      interface Located {
        raw: Box[];
        boxes: Box[];
        offscreen: number;
      }
      interface Store {
        nodes: Text[];
        wrappers: (HTMLElement | null)[];
        locate: (node: Text) => Located;
      }

      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const px = (value: string) => parseFloat(value) || 0;

      /* Where a text node's glyphs are painted: its client rects, cut by every
         ancestor that clips it. An absolutely positioned box escapes the
         overflow of ancestors below its containing block, and a fixed one
         escapes all of them up to a transformed ancestor, so the walk tracks
         which ancestors can clip at all. */
      const locate = (node: Text): Located => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const raw = Array.from(range.getClientRects(), (r) => ({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        }));

        let left = -Infinity;
        let top = -Infinity;
        let right = Infinity;
        let bottom = Infinity;
        let mode: "flow" | "absolute" | "fixed" = "flow";

        for (let el: Element | null = node.parentElement; el; el = el.parentElement) {
          const s = getComputedStyle(el);
          const holdsFixed =
            s.transform !== "none" ||
            s.perspective !== "none" ||
            s.filter !== "none" ||
            s.willChange.includes("transform") ||
            /\b(paint|layout|strict|content)\b/.test(s.contain);
          const clipsThis =
            mode === "flow" ||
            (mode === "absolute" && (s.position !== "static" || holdsFixed)) ||
            (mode === "fixed" && holdsFixed);
          if (!clipsThis) continue;

          const b = el.getBoundingClientRect();
          if (s.overflowX !== "visible") {
            left = Math.max(left, b.left + px(s.borderLeftWidth));
            right = Math.min(right, b.right - px(s.borderRightWidth));
          }
          if (s.overflowY !== "visible") {
            top = Math.max(top, b.top + px(s.borderTopWidth));
            bottom = Math.min(bottom, b.bottom - px(s.borderBottomWidth));
          }
          // clip-path: inset(50%) removes the whole box (Tailwind's sr-only).
          if (/^inset\(\s*50%/.test(s.clipPath)) right = -Infinity;
          const legacy =
            s.position === "absolute" || s.position === "fixed"
              ? s.clip.match(/^rect\((.+)\)$/)
              : null;
          if (legacy) {
            const [t, r, bo, l] = legacy[1]
              .split(/[\s,]+/)
              .map((v) => (v === "auto" ? NaN : parseFloat(v)));
            if (!Number.isNaN(t)) top = Math.max(top, b.top + t);
            if (!Number.isNaN(r)) right = Math.min(right, b.left + r);
            if (!Number.isNaN(bo)) bottom = Math.min(bottom, b.top + bo);
            if (!Number.isNaN(l)) left = Math.max(left, b.left + l);
          }
          mode = s.position === "absolute" ? "absolute" : s.position === "fixed" ? "fixed" : "flow";
        }

        const boxes: Box[] = [];
        let offscreen = 0;
        for (const q of raw) {
          const x0 = Math.max(q.x, left);
          const y0 = Math.max(q.y, top);
          const x1 = Math.min(q.x + q.width, right);
          const y1 = Math.min(q.y + q.height, bottom);
          if (!(x1 > x0 && y1 > y0)) continue;
          if (x1 - x0 <= hiddenPx && y1 - y0 <= hiddenPx) continue;
          const sx0 = Math.max(0, Math.floor(x0));
          const sy0 = Math.max(0, Math.floor(y0));
          const sx1 = Math.min(vw, Math.ceil(x1));
          const sy1 = Math.min(vh, Math.ceil(y1));
          if (sx1 <= sx0 || sy1 <= sy0) {
            offscreen++;
            continue;
          }
          boxes.push({ x: sx0, y: sy0, width: sx1 - sx0, height: sy1 - sy0 });
        }
        return { raw, boxes, offscreen };
      };

      const host = window as unknown as { __textContrast?: Store };
      const store = (host.__textContrast ??= { nodes: [], wrappers: [], locate });

      const root = document.querySelector(selector);
      if (!root) return null;

      const bound = root.getBoundingClientRect();
      const group = {
        tag: root.tagName.toLowerCase(),
        width: bound.width,
        height: bound.height,
        runs: [] as {
          id: number;
          excerpt: string;
          fontSize: string;
          onPhoto: boolean;
          color: string;
          opacity: number;
          raw: Box[];
          boxes: Box[];
        }[],
        hiddenByVisibility: 0,
        clippedAway: 0,
        offscreen: [] as string[],
      };

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const node = n as Text;
        const parent = node.parentElement;
        if (!parent || !node.data.trim()) continue;
        const excerpt = node.data.replace(/\s+/g, " ").trim().slice(0, 48);
        const style = getComputedStyle(parent);
        if (style.visibility !== "visible") {
          group.hiddenByVisibility++;
          continue;
        }
        const where = store.locate(node);
        if (!where.boxes.length) {
          if (where.offscreen) group.offscreen.push(excerpt);
          else group.clippedAway++;
          continue;
        }
        let opacity = 1;
        for (let el: Element | null = parent; el; el = el.parentElement) {
          opacity *= parseFloat(getComputedStyle(el).opacity);
        }
        group.runs.push({
          id: store.nodes.push(node) - 1,
          excerpt,
          fontSize: style.fontSize,
          onPhoto: parent.closest("[data-on-photo]") !== null,
          color: style.webkitTextFillColor || style.color,
          opacity,
          raw: where.raw,
          boxes: where.boxes,
        });
      }
      return group;
    },
    { selector, hiddenPx: HIDDEN_PX },
  );
}

/** Hide only glyphs: wrap each text node in a `visibility: hidden` span. */
function hide(page: Page, ids: number[]): Promise<void> {
  return page.evaluate((ids) => {
    const store = (
      window as unknown as {
        __textContrast: { nodes: Text[]; wrappers: (HTMLElement | null)[] };
      }
    ).__textContrast;
    for (const id of ids) {
      const node = store.nodes[id];
      const parent = node.parentNode;
      if (!node.isConnected || !parent) {
        throw new Error(`run "${node.data.trim().slice(0, 32)}" left the document before it was hidden`);
      }
      const wrapper = document.createElement("span");
      wrapper.style.visibility = "hidden";
      parent.insertBefore(wrapper, node);
      wrapper.appendChild(node);
      store.wrappers[id] = wrapper;
    }
  }, ids);
}

function restore(page: Page, ids: number[]): Promise<void> {
  return page.evaluate((ids) => {
    const store = (
      window as unknown as {
        __textContrast: { nodes: Text[]; wrappers: (HTMLElement | null)[] };
      }
    ).__textContrast;
    for (const id of ids) {
      const wrapper = store.wrappers[id];
      if (wrapper?.parentNode) {
        wrapper.parentNode.insertBefore(store.nodes[id], wrapper);
        wrapper.remove();
      }
      store.wrappers[id] = null;
    }
  }, ids);
}

/** Unclipped rects of each run now, or null for a run no longer in the page. */
function relocate(page: Page, ids: number[]): Promise<(Box[] | null)[]> {
  return page.evaluate((ids) => {
    const store = (
      window as unknown as {
        __textContrast: {
          nodes: Text[];
          locate: (node: Text) => { raw: { x: number; y: number; width: number; height: number }[] };
        };
      }
    ).__textContrast;
    return ids.map((id) => {
      const node = store.nodes[id];
      return node.isConnected ? store.locate(node).raw : null;
    });
  }, ids);
}

function movedBy(before: Box[], after: Box[] | null): boolean {
  if (!after || after.length !== before.length) return true;
  return before.some(
    (r, i) =>
      Math.abs(r.x - after[i].x) > MOVE_TOLERANCE_PX ||
      Math.abs(r.y - after[i].y) > MOVE_TOLERANCE_PX ||
      Math.abs(r.width - after[i].width) > MOVE_TOLERANCE_PX ||
      Math.abs(r.height - after[i].height) > MOVE_TOLERANCE_PX,
  );
}

async function measure(page: Page, group: Group): Promise<{ stats: Stats[]; moved: string[] }> {
  const ids = group.runs.map((run) => run.id);
  const boxes = group.runs.flatMap((run) => run.boxes);
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.width));
  const y1 = Math.max(...boxes.map((b) => b.y + b.height));
  const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };

  const visible = await page.screenshot({ clip });

  // Hide only the glyphs, so the screenshot is of the backdrop they sit on.
  const { after, hidden } = await (async () => {
    try {
      await hide(page, ids);
      await page.waitForTimeout(250);
      const after = await relocate(page, ids);
      const hidden = await page.screenshot({ clip });
      return { after, hidden };
    } finally {
      await restore(page, ids);
    }
  })();

  const moved = group.runs
    .filter((run, i) => movedBy(run.raw, after[i]))
    .map((run) => run.excerpt);

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
    async ({ visible, hidden, origin, runs, paintDelta }) => {
      const decode = async (url: string) => {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(img, 0, 0);
        return {
          data: context.getImageData(0, 0, canvas.width, canvas.height).data,
          width: canvas.width,
          height: canvas.height,
        };
      };
      const shown = await decode(visible);
      const backdrop = await decode(hidden);
      if (shown.width !== backdrop.width || shown.height !== backdrop.height) {
        throw new Error("the two screenshots differ in size");
      }

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

      const probe = document.createElement("canvas");
      probe.width = probe.height = 1;
      const pctx = probe.getContext("2d", { willReadFrequently: true })!;

      return runs.map((run) => {
        // Resolve this run's colour — any colour space — to sRGB bytes + alpha.
        // Reset first, so an unparseable string cannot keep the last run's colour.
        pctx.clearRect(0, 0, 1, 1);
        pctx.fillStyle = "#000";
        pctx.fillStyle = run.color;
        pctx.fillRect(0, 0, 1, 1);
        const [tr, tg, tb, ta] = pctx.getImageData(0, 0, 1, 1).data;
        const alpha = (ta / 255) * run.opacity;

        const seen = new Uint8Array(backdrop.width * backdrop.height);
        const ratios: number[] = [];
        let painted = 0;
        for (const box of run.boxes) {
          const bx = box.x - origin.x;
          const by = box.y - origin.y;
          for (let y = by; y < by + box.height; y++) {
            for (let x = bx; x < bx + box.width; x++) {
              if (x < 0 || y < 0 || x >= backdrop.width || y >= backdrop.height) continue;
              const k = y * backdrop.width + x;
              if (seen[k]) continue;
              seen[k] = 1;
              const i = k * 4;
              const br = backdrop.data[i];
              const bg = backdrop.data[i + 1];
              const bb = backdrop.data[i + 2];
              // The glyph as actually painted: text over this pixel.
              const fr = alpha * tr + (1 - alpha) * br;
              const fg = alpha * tg + (1 - alpha) * bg;
              const fb = alpha * tb + (1 - alpha) * bb;
              ratios.push(ratio(lum(fr, fg, fb), lum(br, bg, bb)));
              const delta = Math.max(
                Math.abs(shown.data[i] - br),
                Math.abs(shown.data[i + 1] - bg),
                Math.abs(shown.data[i + 2] - bb),
              );
              if (delta >= paintDelta) painted++;
            }
          }
        }
        ratios.sort((a, b) => a - b);
        return {
          pixels: ratios.length,
          painted,
          alpha,
          worst: ratios.length ? ratios[0] : NaN,
          p05: ratios.length ? ratios[Math.floor(ratios.length * 0.05)] : NaN,
          mean: ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : NaN,
        };
      });
    },
    {
      visible: `data:image/png;base64,${visible.toString("base64")}`,
      hidden: `data:image/png;base64,${hidden.toString("base64")}`,
      origin: { x: clip.x, y: clip.y },
      runs: group.runs.map(({ boxes, color, opacity }) => ({ boxes, color, opacity })),
      paintDelta: PAINT_DELTA,
    },
  );

  return { stats, moved };
}

let failures = 0;
const fail = (line: string) => {
  failures++;
  console.log(line);
};

/**
 * Pause every animation under `[data-hero]` and seek it: to t = 0 (the first
 * frame) or to its end (`effect.getComputedTiming().endTime`; one millisecond
 * earlier when the animation does not fill forwards, so the end keyframe is
 * still applied). Infinite animations are left alone.
 */
function seekHero(page: Page, to: "first" | "end"): Promise<number[]> {
  return page.evaluate((to) => {
    const ends: number[] = [];
    for (const animation of document.getAnimations()) {
      const target = (animation.effect as KeyframeEffect | null)?.target as Element | null | undefined;
      if (!target?.closest?.("[data-hero]")) continue;
      const timing = animation.effect?.getComputedTiming();
      const end = Number(timing?.endTime ?? NaN);
      if (!Number.isFinite(end)) continue;
      const fillsForward = timing?.fill === "forwards" || timing?.fill === "both";
      animation.pause();
      animation.currentTime = to === "first" ? 0 : fillsForward ? end : Math.max(0, end - 1);
      ends.push(end);
    }
    return ends;
  }, to);
}

interface S9Group {
  key: string;
  label: string;
  optional: boolean;
}

/** Mark the groups measured on a C+ route: the first h1, the home subcopy,
    and the topmost `[data-on-photo]` elements outside them. */
function markGroups(page: Page, subcopy: boolean): Promise<S9Group[]> {
  return page.evaluate((subcopy) => {
    const groups: { key: string; label: string; optional: boolean }[] = [];
    const taken: Element[] = [];
    const mark = (el: Element, key: string, label: string, optional: boolean) => {
      el.setAttribute("data-tc-group", key);
      taken.push(el);
      groups.push({ key, label, optional });
    };
    const h1 = document.querySelector("h1");
    if (h1) mark(h1, "h1", "headline", false);
    if (subcopy) {
      const p = document.querySelector("h1 ~ * p, h1 + p");
      if (p) mark(p, "subcopy", "subcopy", true);
    }
    let i = 0;
    for (const el of document.querySelectorAll("[data-on-photo]")) {
      if (taken.some((t) => t.contains(el) || el.contains(t))) continue;
      const where = el.closest("header") ? "masthead" : el.closest("[data-hero]") ? "hero" : "page";
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
      mark(el, `photo-${i++}`, `on-photo ${where} <${el.tagName.toLowerCase()}> "${text}"`, true);
    }
    return groups;
  }, subcopy);
}

async function runS9(browser: import("playwright").Browser): Promise<void> {
  for (const target of S9_ROUTES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}${target.route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.waitForTimeout(2200);

      console.log(`\n${target.route}`);
      const marked = await markGroups(page, !!target.subcopy);
      const groups: { g: S9Group; group: Group }[] = [];
      for (const g of marked) {
        const where = `${target.route}  ${target.label} ${g.label}`;
        const group = await scan(page, `[data-tc-group="${g.key}"]`);
        if (!group || group.width < 1 || group.height < 1) {
          if (g.optional) console.log(`  skip  ${where}: not rendered at 1440 x 900`);
          else fail(`  MISS  ${where}: not found or no box`);
          continue;
        }
        console.log(
          `  ${where} <${group.tag}>: ${group.runs.length} painted run(s), ${group.runs.filter((r) => r.onPhoto).length} on the photograph` +
            `; not painted: ${group.hiddenByVisibility} visibility-hidden, ${group.clippedAway} clipped or not rendered`,
        );
        for (const excerpt of group.offscreen) {
          fail(`  FAIL  run ${JSON.stringify(excerpt)} lies outside the 1440 x 900 viewport, so it cannot be measured`);
        }
        if (!group.runs.length) {
          if (!group.offscreen.length && !g.optional) {
            fail(`  MISS  ${where}: the element is on the page but none of its text is painted, so nothing was measured`);
          }
          continue;
        }
        groups.push({ g, group });
      }
      if (!groups.length) fail(`  MISS  ${target.route}: no h1 was measured`);

      const onPhotoRuns = groups.reduce((n, { group }) => n + group.runs.filter((r) => r.onPhoto).length, 0);
      if (onPhotoRuns === 0) fail(`  FAIL  0 on-photo runs on ${target.route}`);
      else console.log(`  ok    ${onPhotoRuns} on-photo run(s) on ${target.route}`);

      for (const frame of ["first", "end"] as const) {
        const ends = await seekHero(page, frame);
        await page.waitForTimeout(150);
        console.log(
          ends.length
            ? `  -- ${frame} frame: ${ends.length} animation(s) under [data-hero] sought to ${frame === "first" ? "t = 0" : `the end (t = ${ends.map((e) => Math.round(e)).join(", ")} ms)`}`
            : `  -- ${frame} frame: note, no finite animation under [data-hero] to seek; the frame is the page as painted`,
        );
        for (const { g, group } of groups) {
          const { stats, moved } = await measure(page, group);
          for (const excerpt of moved) {
            fail(
              `  FAIL  ${frame} frame: hiding run ${JSON.stringify(excerpt)} moved a run by more than ${MOVE_TOLERANCE_PX} px ` +
                `(or it left the page): the backdrop is not the one the text sits on`,
            );
          }
          group.runs.forEach((run, i) => {
            const s = stats[i];
            const px = parseFloat(run.fontSize);
            const floor = px >= LARGE_TEXT_PX ? FLOOR : SMALL_FLOOR;
            const bright = s.worst >= floor;
            const ok = bright && s.painted > 0;
            const name = `${target.label} ${g.label}, run ${i + 1}`;
            console.log(
              `  ${ok ? "ok  " : "FAIL"}  ${frame.padEnd(5)} ${g.key.padEnd(8)} run ${String(i + 1).padEnd(2)} ` +
                `${JSON.stringify(run.excerpt).padEnd(30)} ${run.fontSize.padStart(8)} ${run.onPhoto ? "on photo" : "        "}  ` +
                `mean ${s.mean.toFixed(2)}:1   p05 ${s.p05.toFixed(2)}:1   worst pixel ${s.worst.toFixed(2)}:1   floor ${floor.toFixed(1)}` +
                (s.alpha < 0.999 ? `   (alpha ${s.alpha.toFixed(2)}, composited)` : ""),
            );
            if (ok) return;
            failures++;
            if (!bright) {
              console.log(
                px >= LARGE_TEXT_PX
                  ? `        -> ${frame} frame: worst pixel < ${FLOOR.toFixed(1)} on ${target.route} (${name})`
                  : `        -> ${frame} frame: run < ${SMALL_FLOOR.toFixed(1)} (${Number(px.toFixed(2))} px), worst pixel ${s.worst.toFixed(2)} on ${target.route} (${name})`,
              );
            }
            if (s.painted === 0) {
              console.log(
                `        -> ${frame} frame: hiding the run changed none of its ${s.pixels} px by ${PAINT_DELTA}+ levels: ` +
                  `its box is not where its glyphs are painted`,
              );
            }
          });
        }
      }
    } catch (error) {
      fail(`\n  FAIL  ${target.route}: instrument error — ${(error as Error).message.split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
}

const S9 = cplusS9();
console.log(cplusS9Line());
await preflight(BASE, process.cwd() + "/qa");
const browser = await chromium.launch();

try {
  if (S9) await runS9(browser);
  else for (const target of TARGETS) {
    const where = `${target.route}  ${target.label}`;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}${target.route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.waitForTimeout(2200);

      const group = await scan(page, target.selector);
      if (!group) {
        if (target.optional) console.log(`\n  skip  ${where}: "${target.selector}" found nothing`);
        else fail(`\n  MISS  ${where}: selector "${target.selector}" found nothing`);
        continue;
      }

      const head = `${where} <${group.tag}>`;
      if (group.width < 8 || group.height < 8) {
        const size = `${Math.round(group.width)} x ${Math.round(group.height)} px`;
        if (target.optional) console.log(`\n  skip  ${head}: box ${size}`);
        else fail(`\n  MISS  ${head}: box ${size}, under 8 x 8`);
        continue;
      }

      console.log(
        `\n  ${head}: ${group.runs.length} painted run(s) measured` +
          `; not painted: ${group.hiddenByVisibility} visibility-hidden, ` +
          `${group.clippedAway} clipped to <= ${HIDDEN_PX} x ${HIDDEN_PX} px or not rendered`,
      );
      for (const excerpt of group.offscreen) {
        fail(`  FAIL  run ${JSON.stringify(excerpt)} lies outside the 1440 x 900 viewport, so it cannot be measured`);
      }
      if (!group.runs.length) {
        if (!group.offscreen.length) {
          fail(`  MISS  ${head}: the element is on the page but none of its text is painted, so nothing was measured`);
        }
        continue;
      }

      const { stats, moved } = await measure(page, group);
      for (const excerpt of moved) {
        fail(
          `  FAIL  hiding run ${JSON.stringify(excerpt)} moved a run by more than ${MOVE_TOLERANCE_PX} px ` +
            `(or it left the page): the backdrop is not the one the text sits on`,
        );
      }

      group.runs.forEach((run, i) => {
        const s = stats[i];
        const bright = s.worst >= FLOOR;
        const ok = bright && s.painted > 0;
        console.log(
          `  ${ok ? "ok  " : "FAIL"}  run ${String(i + 1).padEnd(2)} ${JSON.stringify(run.excerpt).padEnd(30)} ` +
            `${run.fontSize.padStart(8)}  mean ${s.mean.toFixed(2)}:1   p05 ${s.p05.toFixed(2)}:1   ` +
            `worst pixel ${s.worst.toFixed(2)}:1` +
            (s.alpha < 0.999 ? `   (alpha ${s.alpha.toFixed(2)}, composited)` : ""),
        );
        if (ok) return;
        failures++;
        if (!bright) {
          console.log(
            `        -> worst pixel < ${FLOOR.toFixed(1)} on ${target.route} (${target.label}, run ${i + 1})`,
          );
        }
        if (s.painted === 0) {
          console.log(
            `        -> hiding the run changed none of its ${s.pixels} px by ${PAINT_DELTA}+ levels: ` +
              `its box is not where its glyphs are painted`,
          );
        }
      });
    } catch (error) {
      fail(`\n  FAIL  ${where}: instrument error — ${(error as Error).message.split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${failures} failure(s)`);
if (failures > 0) {
  console.log(
    "TEXT CONTRAST FAILED — a text run over a photograph fell under " +
      `${FLOOR}:1 at its worst pixel, or could not be measured. Darken the scrim ` +
      "in the TEXT ZONE only; the upper stops exist to let the photograph be seen.",
  );
  process.exit(1);
}
console.log(
  S9
    ? `TEXT CONTRAST OK - every painted text run over a photograph clears ${FLOOR}:1 (${LARGE_TEXT_PX} px and up) ` +
        `or ${SMALL_FLOOR}:1 (below) at its worst pixel, in the first and the Ken Burns end frame`
    : `TEXT CONTRAST OK - every painted text run of every headline over a photograph clears ${FLOOR}:1 at its worst pixel`,
);
