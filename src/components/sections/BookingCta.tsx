"use client";

import { Fragment, useEffect, useId, useState, type ReactNode } from "react";

import { ctaClass } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

/* Words a line should not end on. */
const WEAK = /^(?:a|an|the|of|to|in|on|at|by|for|and|or)$/i;

/**
 * A title set so no line ends on a short word or starts with a spaced dash:
 * a dash is held to the word before it ("Kourtaliotis –"), and articles and
 * short prepositions to the word after them ("The Temple", "of Nature"), each
 * group a `nowrap` span. Typography only: the text is unchanged, character
 * for character, and the spaces between groups stay the break points.
 */
function bindShortWords(text: string): ReactNode[] {
  const groups: string[][] = [];
  let pending: string[] = [];
  for (const word of text.split(" ")) {
    if (word === "–" && groups.length && !pending.length) {
      groups[groups.length - 1].push(word);
      continue;
    }
    pending.push(word);
    if (!WEAK.test(word)) {
      groups.push(pending);
      pending = [];
    }
  }
  if (pending.length) groups.push(pending);
  return groups.map((group, i) => (
    <Fragment key={i}>
      {i > 0 ? " " : null}
      {group.length > 1 ? <span className="whitespace-nowrap">{group.join(" ")}</span> : group[0]}
    </Fragment>
  ));
}

/**
 * Request-to-book panel.
 *
 * There is no payment backend and none is implied: this is a request flow that
 * matches how the business already works. It routes to the existing
 * Monday.com form, and offers a WhatsApp deep link pre-filled with the
 * experience name so the traveller doesn't have to retype it.
 *
 * Desktop: a sticky panel beside the story. Mobile: a bottom bar that appears
 * once the hero is behind you, sitting above the home indicator.
 *
 * C+ (SPEC §C.12, §D.2, §D.6 items 3 and 10, §B.2 "Booking bar").
 *
 * - Panel (≥1024): a bone card with a 1 px `rule` edge (its only boundary,
 *   3.64:1 on bone), no texture; the letter-spaced "Request to book", the
 *   title in the `title` step (no line ending on a short word), the facts in
 *   hairline rows, the gold pill "Request this journey" across the card, the
 *   rule link "WhatsApp …" and the note in ink-soft. It holds still beside the story, just under the
 *   masthead.
 * - Bar (<1024): opaque `night-raised` with the night grain and a
 *   `rule-night` top rule (4.08); the price label in on-night-soft (7.14),
 *   the rule link "WhatsApp" and the small gold pill "Request" (the pill's
 *   fill is 6.11:1 against the bar). No blur. The journey's title is not
 *   repeated in the bar: at phone widths it could only be cut short with an
 *   ellipsis, and a cut proper name is app chrome, not a printed page (the
 *   page's own title is the h1 above). The price label wraps rather than
 *   truncates.
 *   It shows only while the hero is gone AND the footer is out of view, so
 *   at the page foot the back cover's "Plan your day" is the only gold pill
 *   in the fold. It sits at `z-30`, under the overlay menu's opaque panel
 *   (`z-40`), so with the menu open the menu's own pill is the only one.
 *   Hidden is the existing contract: `inert`, translated away, its links out
 *   of the tab order; `data-booking-bar` / `data-visible` let the stylesheet
 *   reserve `scroll-padding-bottom` while the bar covers the viewport's foot.
 */
export function BookingCta({
  title,
  formUrl,
  whatsapp,
  price,
  duration,
  availability,
  variant,
}: {
  title: string;
  formUrl: string;
  whatsapp: { display: string; dial: string } | null;
  price: string | null;
  duration: string | null;
  availability: string | null;
  variant: "panel" | "bar";
}) {
  const labelId = useId();
  const [heroGone, setHeroGone] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const visible = heroGone && !footerInView;

  /* The mobile bar only appears after the hero has scrolled away, and steps
     aside again while the footer (the back cover, with its own gold pill) is
     on screen: two observers, one state each. */
  useEffect(() => {
    if (variant !== "bar") return;
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;
    const observers: IntersectionObserver[] = [];

    const heroIo = new IntersectionObserver(
      ([entry]) => setHeroGone(entry.intersectionRatio < 0.15),
      { threshold: [0, 0.15, 0.5] },
    );
    heroIo.observe(hero);
    observers.push(heroIo);

    const footer = document.querySelector("footer");
    if (footer) {
      const footerIo = new IntersectionObserver(([entry]) =>
        setFooterInView(entry.isIntersecting),
      );
      footerIo.observe(footer);
      observers.push(footerIo);
    }

    return () => observers.forEach((io) => io.disconnect());
  }, [variant]);

  const message = `Hello Routes Crete, I'd like to request a booking for "${title}".`;
  const waHref = whatsapp
    ? `https://wa.me/${whatsapp.dial}?text=${encodeURIComponent(message)}`
    : null;

  if (variant === "bar") {
    return (
      <div
        /* Off-screen is not hidden: translated away, both links stayed
           focusable and listed, and focus could be left inside as it slid
           off. inert takes the whole bar out while it is away. */
        inert={!visible}
        data-booking-bar
        data-visible={visible || undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-rule-night bg-night-raised lg:hidden",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
          "transition-transform duration-500 ease-reveal",
          visible ? "translate-y-0" : "translate-y-full",
        )}
      >
        {/* The night grain, under the bar's content. A child of the fixed bar
            (its containing block), never `grain` on the bar itself (P1). */}
        <div aria-hidden className="grain-overlay" />

        <div className="relative flex items-center gap-3 px-(--ed-margin)">
          <p className="min-w-0 flex-1 text-eyebrow text-balance text-on-night-soft">
            {price ?? "Price on request"}
          </p>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(ctaClass({ variant: "rule", tone: "night" }), "shrink-0")}
            >
              WhatsApp
            </a>
          )}
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(ctaClass({ variant: "gold", tone: "night", size: "sm" }), "shrink-0")}
          >
            Request
          </a>
        </div>
      </div>
    );
  }

  const rows = [
    { label: "Price", value: price ?? "On request" },
    { label: "Duration", value: duration ?? "On request" },
    { label: "Availability", value: availability ?? "Request availability" },
  ];

  return (
    /* A named landmark ("Request to book", the panel's own label), so the
       panel is not an unnamed complementary region beside the story. */
    <aside aria-labelledby={labelId} className="sticky top-[calc(var(--ed-masthead-h)+2rem)]">
      <div className="border border-rule bg-bone p-8">
        <Eyebrow id={labelId}>Request to book</Eyebrow>
        <h2 className="mt-4 text-title text-ink">{bindShortWords(title)}</h2>

        <dl className="mt-7 border-b border-hairline-bone">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 border-t border-hairline-bone py-3"
            >
              <dt className="text-eyebrow text-label">{row.label}</dt>
              <dd className="text-right text-ui text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col items-center gap-2">
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass({ variant: "gold", full: true })}
          >
            Request this journey
          </a>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={ctaClass({ variant: "rule" })}
            >
              WhatsApp {whatsapp?.display}
            </a>
          )}
        </div>

        <p className="mt-6 text-caption text-ink-soft">
          We&rsquo;ll respond promptly with availability, final details, and
          booking confirmation.
        </p>
      </div>
    </aside>
  );
}
