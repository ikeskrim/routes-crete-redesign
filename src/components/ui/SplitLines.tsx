"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { motion } from "motion/react";

import { findEmphasis, renderEmphasis } from "@/components/ui/Emphasis";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { useRevealTrigger } from "@/lib/use-reveal-trigger";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* The line rise (C+ SPEC §G.1 #3): each line from 115 % below its mask, on
   the edition's reveal curve (`--ed-ease-reveal`, as a motion easing). */
const EASE_REVEAL = [0.2, 0.7, 0.1, 1] as const;
const HIDDEN = { y: "115%" };
const SHOWN = { y: "0%" };

/* Reduced motion is designed, not disabled: the lines are set from the first
   paint. Before hydration nothing knows the preference, so the server-rendered
   translate is cancelled in CSS (an !important class outranks motion's inline
   style); after hydration the lines render without motion at all. */
const SET_WHEN_REDUCED = "motion-reduce:transform-none!";

type SplitTag = "h1" | "h2" | "h3" | "p" | "div";

export type SplitLinesProps = {
  /** The exact source string. Rendered text always equals it (headline-guard). */
  text: string;
  /**
   * Pre-split lines (§C.2 item 2): the headline is set at server render as
   * one visible copy, one `span.ed-line[data-line]` per line, with a literal
   * space between lines and no `sr-only` duplicate. `lines.join(" ")` must
   * equal `text` (a development-time error otherwise). No measuring pass.
   */
  lines?: string[];
  /**
   * The one word set as `em.ed-em` (§C.2 item 1, §C.13): a whole word of
   * `text`, first match, case-sensitive. Never directly followed by
   * punctuation (rule 7). No match renders no `<em>`.
   */
  emphasis?: string;
  /**
   * `false` sets the lines with no hide-and-show (§C.2 item 3). Required on
   * every above-the-fold h1, so text near the LCP is never gated on
   * hydration. Default `true`.
   */
  reveal?: boolean;
  as?: SplitTag;
  /** Lands on the tag itself, so a section's aria-labelledby resolves. */
  id?: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  /** Rise on mount instead of on the first intersection. */
  onMount?: boolean;
  /** Drive the rise externally (true shows, false hides). */
  active?: boolean;
  /**
   * `lines` mode only: an extra class per line index, for compositions that
   * place or restyle single lines (the cover's indented line). The line's
   * moving child is a `span.block`; a composition that runs two lines as one
   * sets both the line and that child inline.
   */
  lineClassName?: (string | undefined)[];
  /**
   * `lines` mode only: the index of the line printed over a photograph. It
   * carries `data-on-photo`, which text-contrast measures against the plate
   * (§B.2).
   */
  onPhotoLine?: number;
};

/**
 * Headline set line by line (C+ SPEC §C.2, contract C5).
 *
 * Two modes:
 *
 * - **`lines` (pre-split).** Server-rendered, final at first paint, carries
 *   `data-lines-ready` from the start. One copy only: headline-guard reads
 *   `innerText` before settling and detects hidden copies by geometry, so a
 *   second (`sr-only`) copy here would read the headline twice (the §0 trap).
 *   The literal spaces between line spans keep `innerText` and the accessible
 *   name one sentence.
 *
 * - **Measured** (no `lines`). Real line boxes are measured after layout and
 *   after `document.fonts.ready`: words are grouped by vertical offset, every
 *   candidate line is re-measured as it will be set (overflow pushed down) and
 *   a lone middle word borrows from the line below. The measured lines are
 *   decorative (`aria-hidden`) with the real string beside them for assistive
 *   technology; the measuring copy stays mounted, invisible, so it still wraps
 *   at the container width. `data-lines-ready` appears once the lines are
 *   measured against the loaded fonts.
 *
 * Every mode keeps `data-split-source`, the harness's hook for asserting that
 * what renders equals what was written. With `reveal={false}` or reduced
 * motion the headline is set, not risen, and `data-lines-ready` is present at
 * render. With JavaScript off the root layout's noscript rule sets every
 * `[data-reveal]` in place.
 */
export function SplitLines({
  text,
  lines,
  emphasis,
  reveal = true,
  as = "h2",
  id,
  className,
  delay = 0,
  stagger = 0.12,
  duration = 1.2,
  onMount = false,
  active,
  lineClassName,
  onPhotoLine,
}: SplitLinesProps) {
  if (lines) {
    if (process.env.NODE_ENV !== "production" && lines.join(" ") !== text) {
      throw new Error(
        `SplitLines: lines ${JSON.stringify(lines)} do not join to ${JSON.stringify(text)}`,
      );
    }
    return (
      <PresetLines
        text={text}
        lines={lines}
        emphasis={emphasis}
        reveal={reveal}
        Tag={as}
        id={id}
        className={className}
        delay={delay}
        stagger={stagger}
        duration={duration}
        onMount={onMount}
        active={active}
        lineClassName={lineClassName}
        onPhotoLine={onPhotoLine}
      />
    );
  }

  return (
    <MeasuredLines
      text={text}
      emphasis={emphasis}
      reveal={reveal}
      Tag={as}
      id={id}
      className={className}
      delay={delay}
      stagger={stagger}
      duration={duration}
      onMount={onMount}
      active={active}
    />
  );
}

/** Segments of one text with the emphasis word in the first segment that has it. */
function emphasiseFirst(segments: string[], word: string | undefined): ReactNode[] {
  let done = false;
  return segments.map((segment) => {
    if (done || !findEmphasis(segment, word)) return segment;
    done = true;
    return renderEmphasis(segment, word);
  });
}

type ModeProps = {
  text: string;
  emphasis?: string;
  reveal: boolean;
  Tag: SplitTag;
  id?: string;
  className?: string;
  delay: number;
  stagger: number;
  duration: number;
  onMount: boolean;
  active?: boolean;
};

/* A ref on a tag chosen at runtime: every candidate is an HTMLElement, which
   TypeScript cannot narrow for a union of intrinsic tags. */
const asTagRef = (ref: RefObject<HTMLElement | null>) => ref as RefObject<never>;

function PresetLines({
  text,
  lines,
  emphasis,
  reveal,
  Tag,
  id,
  className,
  delay,
  stagger,
  duration,
  onMount,
  active,
  lineClassName,
  onPhotoLine,
}: ModeProps & {
  lines: string[];
  lineClassName?: (string | undefined)[];
  onPhotoLine?: number;
}) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLElement>(null);
  const seen = useRevealTrigger(ref);
  const animated = reveal && !reduced;
  const show = active !== undefined ? active : onMount || seen;
  const content = emphasiseFirst(lines, emphasis);

  return (
    <Tag
      ref={asTagRef(ref)}
      id={id}
      className={cn(lines.length > 1 && "ed-lines", className) || undefined}
      data-split-source={text}
      data-lines-ready=""
    >
      {lines.map((_, i) => (
        <Fragment key={i}>
          <span
            className={cn("ed-line", lineClassName?.[i])}
            data-line={i}
            data-on-photo={onPhotoLine === i ? "" : undefined}
          >
            {/* The reduced-motion and reveal={false} branches render the same
                span structure without motion, so the composition that depends
                on the line spans is identical and hydration moves nothing. */}
            {animated ? (
              <motion.span
                data-reveal=""
                className={cn("block will-change-transform", SET_WHEN_REDUCED)}
                initial={HIDDEN}
                animate={show ? SHOWN : HIDDEN}
                transition={{ duration, delay: delay + i * stagger, ease: EASE_REVEAL }}
              >
                {content[i]}
              </motion.span>
            ) : (
              <span data-reveal={reveal ? "" : undefined} className="block">
                {content[i]}
              </span>
            )}
          </span>
          {i < lines.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}

/* Font properties a measuring probe copies from the headline, as longhands:
   the `font` shorthand serialises to "" whenever one of its parts cannot be
   written in it, and the optical-size and variation settings (the display cut
   is "opsz" 144) change advance widths by up to a fifth. */
const PROBE_FONT_PROPERTIES = [
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-stretch",
  "font-variant",
  "font-variation-settings",
  "font-optical-sizing",
  "font-feature-settings",
  "font-kerning",
  "letter-spacing",
  "word-spacing",
  "text-rendering",
  "text-transform",
] as const;

function MeasuredLines({
  text,
  emphasis,
  reveal,
  Tag,
  id,
  className,
  delay,
  stagger,
  duration,
  onMount,
  active,
}: ModeProps) {
  const reduced = useReducedMotionSafe();
  const rootRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const lastWidth = useRef(0);
  const [lines, setLines] = useState<string[] | null>(null);
  const [ready, setReady] = useState(false);
  const seen = useRevealTrigger(rootRef);
  const animated = reveal && !reduced;

  const words = text.split(/\s+/).filter(Boolean);

  useIsomorphicLayoutEffect(() => {
    if (!animated) return;
    const root = rootRef.current;
    const measureEl = measureRef.current;
    if (!root || !measureEl) return;

    const measure = () => {
      const wordEls = measureEl.querySelectorAll<HTMLElement>("[data-word]");
      if (!wordEls.length) return;

      const grouped: string[][] = [];
      let lastTop: number | null = null;

      wordEls.forEach((wordEl) => {
        const top = wordEl.offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) > 2) {
          grouped.push([]);
          lastTop = top;
        }
        // trim(): a word span's textContent must never carry the separating
        // space, or joined lines come out wider than the box they render in.
        grouped[grouped.length - 1].push((wordEl.textContent ?? "").trim());
      });

      /* Fit correction.
       *
       * Grouping by offsetTop measures the inline-block proxy layout, which
       * does not reproduce normal text flow exactly: measured lines came out
       * 4–80px wider than their container and wrapped again on render. So
       * every candidate line is measured as it will actually be set, emphasis
       * word included, and any overflow is pushed to the next line. Each
       * rendered line then occupies exactly one line box. */
      const containerWidth = root.getBoundingClientRect().width;
      const probe = document.createElement("span");
      const cs = getComputedStyle(measureEl);
      probe.style.cssText =
        "position:absolute;visibility:hidden;white-space:nowrap;left:-10000px;top:0";
      for (const property of PROBE_FONT_PROPERTIES) {
        probe.style.setProperty(property, cs.getPropertyValue(property));
      }
      document.body.appendChild(probe);

      const widthOf = (s: string) => {
        const at = findEmphasis(s, emphasis);
        if (at) {
          const em = document.createElement("em");
          em.className = "ed-em";
          em.textContent = s.slice(at.index, at.index + at.length);
          probe.replaceChildren(s.slice(0, at.index), em, s.slice(at.index + at.length));
        } else {
          probe.textContent = s;
        }
        return probe.getBoundingClientRect().width;
      };

      const queue = grouped.map((g) => [...g]);
      for (let i = 0; i < queue.length; i++) {
        const line = queue[i];
        // Sub-pixel tolerance: a line landing within 1px of the box still
        // wraps once layout rounds it.
        while (line.length > 1 && widthOf(line.join(" ")) > containerWidth - 1) {
          const moved = line.pop();
          if (moved === undefined) break;
          if (!queue[i + 1]) queue.push([]);
          queue[i + 1].unshift(moved);
        }
      }

      /* De-orphan.
       *
       * The fit pass only pushes words DOWN, which can strand a single word
       * alone on a middle line. Borrow the FIRST word of the line below
       * (pulling the last word down from above would only move the orphan to
       * the opening line). The last line may be one word: that is where the
       * sentence ended. The donor line may not be left an orphan of its own. */
      for (let i = 0; i < queue.length - 1; i++) {
        const line = queue[i];
        const next = queue[i + 1];
        if (line.length !== 1 || next.length < 2) continue;

        const candidate = [...line, next[0]];
        if (widthOf(candidate.join(" ")) > containerWidth - 1) continue;
        if (next.length - 1 === 1 && i + 1 < queue.length - 1) continue;

        next.shift();
        line.push(candidate[1]);
      }

      probe.remove();

      setLines(queue.filter((g) => g.length > 0).map((g) => g.join(" ")));
    };

    lastWidth.current = root.getBoundingClientRect().width;
    measure();

    /* Web fonts change metrics without changing the container width, so the
       resize guard below would never re-fire. Lines measured on fallback
       metrics are ragged: measure again once the fonts are in, and only then
       declare the lines final (headline-guard's readiness signal). */
    let cancelled = false;
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (cancelled) return;
        measure();
        setReady(true);
      });
    } else {
      setReady(true);
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      // Only a width change can alter where the text wraps. Without this
      // guard, hiding the measuring copy resizes it and loops forever.
      if (Math.abs(width - lastWidth.current) < 1) return;
      lastWidth.current = width;
      measure();
    });
    observer.observe(root);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [text, emphasis, animated]);

  if (!animated) {
    /* Set, not risen: one line block holding the whole text, wrapping. */
    return (
      <Tag id={id} className={className} data-split-source={text} data-lines-ready="">
        <span className="ed-line" data-reveal={reveal ? "" : undefined}>
          {renderEmphasis(text, emphasis)}
        </span>
      </Tag>
    );
  }

  const show = active !== undefined ? active : onMount || seen;
  const wordContent = emphasiseFirst(words, emphasis);
  const lineContent = lines ? emphasiseFirst(lines, emphasis) : null;

  return (
    <Tag
      id={id}
      className={className}
      data-split-source={text}
      data-lines-ready={ready ? "" : undefined}
    >
      <span ref={rootRef} className="relative block">
        {/* Measuring copy. Visible (and the only copy) until lines are known. */}
        <span
          ref={measureRef}
          aria-hidden={lines ? true : undefined}
          className={cn(
            "block",
            lines && "pointer-events-none invisible absolute inset-x-0 top-0",
          )}
        >
          {/* The separating space MUST live outside the inline-block. Inside
              it, it is trailing whitespace at the end of that box's own line
              and CSS discards it ("Exploretheunknown"). Outside, it is
              ordinary inline whitespace between two boxes and survives. */}
          {words.map((_, i) => (
            <Fragment key={i}>
              <span data-word className="inline-block">
                {wordContent[i]}
              </span>
              {i < words.length - 1 ? " " : ""}
            </Fragment>
          ))}
        </span>

        {lineContent && (
          <>
            <span aria-hidden className="ed-lines">
              {lineContent.map((content, i) => (
                <span key={i} className="ed-line">
                  <motion.span
                    data-reveal
                    className={cn("block will-change-transform", SET_WHEN_REDUCED)}
                    initial={HIDDEN}
                    animate={show ? SHOWN : HIDDEN}
                    transition={{ duration, delay: delay + i * stagger, ease: EASE_REVEAL }}
                  >
                    {content}
                  </motion.span>
                </span>
              ))}
            </span>
            {/* The real string for assistive tech and crawlers, now that the
                visible copy is decorative. */}
            <span className="sr-only">{text}</span>
          </>
        )}
      </span>
    </Tag>
  );
}
