"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import type { NavItem } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { pad } from "@/lib/utils";

/**
 * Fullscreen overlay menu — the navigation on every viewport.
 *
 * Huge staggered links with a photographic preview per item. The previews are
 * only mounted while the menu is open, so opening costs nothing until it is
 * actually opened, and each one is a normal lazy `next/image`.
 *
 * Accessibility: focus moves into the panel on open and returns to the trigger
 * on close, Tab is trapped inside while it is open, Escape closes, and the
 * page behind is scroll-locked. Under prefers-reduced-motion the whole thing
 * is a plain fade with no stagger.
 */
export function OverlayMenu({
  items,
  open,
  onClose,
  previews,
  backdrop,
  bookHref,
}: {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
  previews: Record<string, string | undefined>;
  /** One real photograph of Crete, drifting behind the menu. */
  backdrop?: string;
  bookHref: string;
}) {
  const reduced = useReducedMotionSafe();
  const panelRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  /* Escape, focus trap, and scroll lock all live for exactly as long as the
     menu is open. This effect is the SINGLE owner of all three — an earlier
     version had Nav install its own Escape handler and its own overflow lock
     as well, and because child effects commit before parent effects, the two
     cleanups restored in an order that left `overflow: hidden` on the body
     after the menu closed. Two locks are not safer than one. */
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    /* Locking scroll needs BOTH of these, for different readers.
     *
     * `overflow: hidden` stops a *user* gesture, but by spec it still permits
     * *programmatic* scrolling — and Lenis works by swallowing the wheel event
     * and scrolling programmatically from its own rAF loop. So with smooth
     * scroll running, the overflow lock alone did nothing at all: the page
     * scrolled a measured 1050px behind the open menu. Stopping Lenis is what
     * actually holds it.
     *
     * The overflow lock still earns its place: under prefers-reduced-motion
     * Lenis is never constructed, and then it is the only lock there is. */
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();

    /* Hide the page behind from assistive tech. `aria-modal="true"` alone is
       not reliably honoured — a screen reader in browse mode still walks the
       278 named nodes behind the overlay, including all 52 gallery buttons.
       The panel is reopened on the same DOM node by AnimatePresence, so it is
       un-inerted at the top of the effect as well as on cleanup.
       The <header> is deliberately left live: it sits above the overlay and
       holds the Close control, and the focus trap below depends on it. */
    const panel = panelRef.current;
    if (panel) panel.inert = false;
    const backdrop = [...document.body.children].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        el !== panel &&
        el.tagName !== "HEADER" &&
        el.tagName !== "SCRIPT" &&
        el.tagName !== "NOSCRIPT",
    );
    // Snapshot and restore rather than clearing, so this cannot stomp inert
    // state that something else owns.
    const wasInert = backdrop.map((el) => el.inert);
    backdrop.forEach((el) => (el.inert = true));

    /* The trap spans the header as well as the panel. The header sits above
       the overlay (z-50 over z-40) and holds the Close control, so it is part
       of the open menu's chrome, not background content — excluding it would
       leave a keyboard user unable to reach Close at all. Everything else on
       the page is behind the overlay and must stay unreachable. */
    const chrome = () =>
      [document.querySelector("header"), panelRef.current]
        .filter((el): el is HTMLElement => !!el)
        .flatMap((el) => [
          ...el.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ])
        .filter((el) => el.offsetParent !== null || el === document.activeElement);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = chrome();
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Focus can also be lost entirely — clicking the backdrop, or returning
      // from the browser's own chrome. A trap that only handles first/last
      // cannot recover from that, so anything outside is pulled back in.
      if (!active || !focusables.includes(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    /* Focus the panel itself, not its first link.
     *
     * Focusing the first link fired that link's onFocus, which sets the hover
     * preview — so merely opening the menu downloaded a full-bleed photograph
     * nobody had pointed at. Focusing the dialog also lets a screen reader
     * announce the dialog and its label before reading the list. */
    // preventScroll: focusing an element is allowed to scroll it into view,
    // which is exactly how the reader's scroll position was being destroyed.
    const id = window.setTimeout(
      () => panelRef.current?.focus({ preventScroll: true }),
      60,
    );

    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(id);
      document.body.style.overflow = previousOverflow;
      lenis?.start();
      backdrop.forEach((el, i) => (el.inert = wasInert[i]));

      /* The panel stays mounted for its whole exit fade, invisible but still
         hit-testable and still focusable — a click where a link used to be
         navigated the site. `inert` must be set BEFORE focus is restored,
         or the restore races the blur that inert forces. */
      if (panelRef.current) panelRef.current.inert = true;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const activePreview = hovered ? previews[hovered] : undefined;

  const handleHover = useCallback((key: string | null) => setHovered(key), []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          id="overlay-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          // Focused on open (see the effect above), so it needs to be
          // programmatically focusable without entering the tab order.
          tabIndex={-1}
          /* NOT `grain` here, deliberately. `@utility grain` sets
             position: relative, and Tailwind emits it AFTER `.fixed` at equal
             specificity (`.fixed{position:fixed}.grain,.relative{position:relative}`),
             so `grain fixed` silently computed to position: relative — the
             "fullscreen" overlay was an in-flow block that added its own
             height to the document, left 243px of page visible below it at
             390x844, and threw away the reader's scroll position when focus
             moved into it. The grain still paints: `grain-overlay` is the
             child that draws it, and `fixed` is itself a containing block.
             qa/preflight.mts fails the build if this pairing comes back. */
          className="fixed inset-0 z-40 flex flex-col bg-ocean-950 outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.2 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* The panel's own photograph of Crete, drifting.
              Always present, behind everything, at low opacity — the hovered
              preview still fades in over it, so the menu is never a flat black
              rectangle even before the reader reaches for a link.

              The pan is a CSS keyframe on a transform, not a JS loop: it must
              not compete with the open animation, and a 40s drift driven from
              rAF would keep a timer alive for as long as the menu is open for
              no visual gain. `menu-drift` respects prefers-reduced-motion in
              its own definition. */}
          {backdrop && (
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="menu-drift absolute inset-[-6%]">
                <Image
                  src={backdrop}
                  alt=""
                  fill
                  sizes="100vw"
                  quality={60}
                  className="object-cover opacity-[0.18]"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-ocean-950 via-ocean-950/80 to-ocean-950/40" />
            </div>
          )}

          <div aria-hidden className="grain-overlay" />

          {/* Preview: desktop only, and only while a link is hovered. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            <AnimatePresence>
              {activePreview && !reduced && (
                <motion.div
                  key={activePreview}
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 0.35, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-y-0 right-0 w-[46%]"
                >
                  <Image
                    src={activePreview}
                    alt=""
                    fill
                    sizes="46vw"
                    quality={65}
                    className="object-cover"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex flex-1 items-center overflow-y-auto">
            {/* "Menu", not "Primary": the header's own nav already claims
                "Primary" and stays live while the overlay is open, so two
                identically-named navigation landmarks were exposed at once. */}
            <nav
              aria-label="Menu"
              className="mx-auto w-full max-w-[92rem] px-6 py-24 sm:px-8 lg:px-12"
            >
              <ul className="flex flex-col">
                {items.map((item, i) => {
                  const inner = (
                    <>
                      <span className="font-display text-eyebrow tabular-nums text-gold-400/80">
                        {pad(i + 1)}
                      </span>
                      <span className="text-display-lg text-sand-50 transition-[letter-spacing,color] duration-500 ease-luxe group-hover:tracking-[-0.01em] group-hover:text-gold-200">
                        {item.label}
                      </span>
                    </>
                  );

                  const className =
                    "group flex min-h-[3.75rem] items-baseline gap-6 py-3 lg:py-4";

                  /* Mask reveal: the row is clipped by an overflow-hidden
                     box and its contents rise from fully below it, so each
                     link is uncovered rather than faded in. Same construction
                     as SplitLines uses for headlines, which is why it is
                     motion rather than GSAP — a second animation runtime in
                     this component would buy an identical result and another
                     library on the critical path. GSAP earns its place where
                     ScrollTrigger is genuinely needed. */
                  return (
                    <li
                      key={item.key}
                      className="overflow-hidden border-b border-sand-100/10"
                      onMouseEnter={() => handleHover(item.key)}
                      onMouseLeave={() => handleHover(null)}
                    >
                    <motion.div
                      initial={reduced ? false : { y: "110%" }}
                      animate={{ y: "0%" }}
                      transition={{
                        duration: 0.9,
                        delay: reduced ? 0 : 0.1 + i * 0.07,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={className}
                          onFocus={() => handleHover(item.key)}
                        >
                          {inner}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className={className}
                          onClick={onClose}
                          onFocus={() => handleHover(item.key)}
                        >
                          {inner}
                        </Link>
                      )}
                    </motion.div>
                    </li>
                  );
                })}
              </ul>

              <motion.div
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: reduced ? 0 : 0.1 + items.length * 0.055,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-12"
              >
                <Link
                  href={bookHref}
                  onClick={onClose}
                  className="inline-flex h-14 items-center rounded-pill bg-sand-50 px-9 font-display text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-ocean-950 transition-colors duration-500 hover:bg-white"
                >
                  Plan your day
                </Link>
              </motion.div>
            </nav>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
