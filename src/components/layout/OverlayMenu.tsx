"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { ctaClass } from "@/components/ui/Button";
import { ExternalIcon } from "@/components/ui/icons";
import type { NavItem } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

/** The C+ reveal curve (`--ed-ease-reveal`), for motion. */
const EASE_REVEAL: [number, number, number, number] = [0.2, 0.7, 0.1, 1];

/**
 * A transfer's operator photograph is a studio cut-out: the van on a grey
 * seamless. Cropped to the 4:5 cover frame, the van loses its front and the
 * grey sweep fills the plate. So it is shown whole on a bone mat instead:
 * contained, with an 8 % margin and no keyline. The homepage mounts the
 * transfer the same way (HorizontalJourneys `.mat`). Every other preview is
 * a landscape photograph and fills the frame.
 */
const isStudioCutout = (src: string) => src.includes("/transfers/");

/**
 * The overlay menu (C+ SPEC §H.2): the navigation on every viewport, printed
 * on an opaque paper page.
 *
 * Mechanism, unchanged from the live menu: mounted only while open; this
 * component is the single owner of the scroll lock (body overflow and
 * `__lenis.stop()`), of `inert` on everything behind it, of the Tab trap
 * across the header and the panel, of Escape and of the focus return to the
 * control that opened it. A Close inside the dialog serves screen readers
 * with no Escape key.
 *
 * Look: paper stock without vignette; the links in the `menu` step with a
 * hairline between them and a 1 px sienna rule drawn under the label on hover
 * or focus; the foot holds the gold "Plan your day" and the address. From
 * 1024 px a 4:5 preview plate shows the operator photograph of the item
 * pointed at or focused; previews are mounted on demand only.
 *
 * Motion: the panel fades (0.45 s), the labels rise out of their masks
 * (0.8 s, 0.06 s stagger), previews fade (0.6 s, opacity only). Under reduced
 * motion the panel fades in 0.2 s, the labels are set, and a preview fades in
 * 0.15 s, opacity only (§G.1 #9, #10).
 *
 * Order: the DOM follows the page as drawn: the list, the foot, then the
 * screen-reader Close, which shows at the bottom left when focused.
 */
export function OverlayMenu({
  items,
  open,
  onClose,
  previews,
  previewBlur,
  address,
  bookHref,
  headerRef,
  triggerRef,
}: {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
  previews: Record<string, string | undefined>;
  previewBlur?: Record<string, string | undefined>;
  address?: string;
  bookHref: string;
  /** The site header: live while open, and part of the Tab trap. */
  headerRef: RefObject<HTMLElement | null>;
  /** The control that opened the menu: focus returns here when nothing else held it. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const reduced = useReducedMotionSafe();
  const panelRef = useRef<HTMLDivElement>(null);
  /** The item whose preview shows. */
  const [active, setActive] = useState<string | null>(null);
  /** Previews already mounted this opening; kept so a re-point never refetches. */
  const [mounted, setMounted] = useState<string[]>([]);

  /* Each opening starts with no preview mounted, so opening downloads no
     photograph. Adjusted during render, like Nav's route reset. */
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setActive(null);
      setMounted([]);
    }
  }

  /* Escape, focus trap and scroll lock live for exactly as long as the menu
     is open, and only here. An earlier version had Nav install its own Escape
     handler and overflow lock too; child effects commit before parent effects,
     and the two cleanups restored in an order that left `overflow: hidden` on
     the body after the menu closed. */
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    /* Locking scroll needs BOTH of these. `overflow: hidden` stops a user
       gesture but still permits programmatic scrolling, which is how Lenis
       scrolls: with smooth scroll running, the overflow lock alone let the
       page move a measured 1050 px behind the open menu. Under reduced motion
       Lenis is never constructed, and the overflow lock is the only lock. */
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();

    /* Hide the page behind from assistive tech: `aria-modal` alone is not
       reliably honoured. The panel is reopened on the same kind of node by
       AnimatePresence, so it is un-inerted here as well as on cleanup. The
       header stays live: it sits above the panel, holds the Close control,
       and the Tab trap includes it. */
    const panel = panelRef.current;
    const header = headerRef.current;
    const trigger = triggerRef.current;
    if (panel) panel.inert = false;
    const background = [...document.body.children].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        el !== panel &&
        el !== header &&
        el.tagName !== "HEADER" &&
        el.tagName !== "SCRIPT" &&
        el.tagName !== "NOSCRIPT",
    );
    // Snapshot and restore rather than clearing, so this cannot stomp inert
    // state that something else owns.
    const wasInert = background.map((el) => el.inert);
    background.forEach((el) => (el.inert = true));

    /* The trap spans the header and the panel, in that order, which is the
       order they are drawn: the header row on top, the panel below it. */
    const chrome = () =>
      [headerRef.current, panelRef.current]
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
      const current = document.activeElement as HTMLElement | null;

      // Focus can also be lost entirely (a click on empty paper, a return from
      // the browser's own chrome): anything outside is pulled back in.
      if (!current || !focusables.includes(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    /* Focus the dialog itself, not its first link: a focused link would mount
       its preview photograph before anyone pointed at it, and a screen reader
       announces the dialog and its label before the list. preventScroll keeps
       the reader's place. */
    const id = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 60);

    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(id);
      document.body.style.overflow = previousOverflow;
      lenis?.start();
      background.forEach((el, i) => (el.inert = wasInert[i]));

      /* The panel stays mounted for its exit fade, invisible but still
         hit-testable and focusable: `inert` goes on BEFORE focus is restored,
         or the restore races the blur that inert forces. Focus returns to
         whatever opened the menu; where a click left nothing focused (Safari
         does not focus a clicked button), to the trigger. */
      if (panel) panel.inert = true;
      const opener =
        previouslyFocused && previouslyFocused !== document.body && previouslyFocused.isConnected
          ? previouslyFocused
          : trigger;
      opener?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, headerRef, triggerRef]);

  /** Point at an item: show its preview, mounting it the first time (≥1024 only). */
  const show = useCallback(
    (key: string) => {
      if (!previews[key] || !window.matchMedia("(min-width: 1024px)").matches) return;
      setActive(key);
      setMounted((keys) => (keys.includes(key) ? keys : [...keys, key]));
    },
    [previews],
  );

  const panelFade = reduced
    ? { duration: 0.2, ease: "linear" as const }
    : { duration: 0.45, ease: EASE_REVEAL };
  const previewFade = reduced
    ? { duration: 0.15, ease: "linear" as const }
    : { duration: 0.6, ease: EASE_REVEAL };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          id="overlay-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          // Focused on open (see the effect above), so it is programmatically
          // focusable without entering the tab order.
          tabIndex={-1}
          /* Opaque paper (C4). Not `grain` or `paper-stock` here: both set
             `position: relative`, which Tailwind emits after `.fixed` at equal
             specificity, so the "fullscreen" overlay would silently become an
             in-flow block (qa/preflight.mts P1, P7). The stock lives on the
             scroller's page below. */
          className="fixed inset-0 z-40 bg-paper outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={panelFade}
        >
          {/* The menu's own scroller, for a list taller than the viewport (a
              landscape phone, a short laptop window).
              - data-lenis-prevent: a stopped Lenis cancels every wheel and
                touchmove on the page, this one included, unless the path
                carries this attribute.
              - overscroll-contain: reaching the end must not chain to the page
                behind, which under reduced motion only body overflow holds. */}
          <div data-lenis-prevent className="absolute inset-0 overflow-y-auto overscroll-contain">
            <div className="paper-stock min-h-full">
              <div aria-hidden="true" className="paper-stock-layer no-vignette" />

              <div className="ed-grid pt-[calc(var(--ed-masthead-h)+1.5rem)] pb-(--ed-space-block) lg:pt-[calc(var(--ed-masthead-h)+clamp(3rem,6vw,5rem))]">
                {/* "Menu", not "Primary": the header's own nav claims
                    "Primary" and stays live while the panel is open. */}
                <nav
                  aria-label="Menu"
                  className="[grid-column:content-start/content-end] lg:[grid-column:col_1/span_7]"
                >
                  <ul>
                    {items.map((item, i) => {
                      /* The label rises out of a mask that pads for Fraunces
                         descenders; the link itself is never clipped, so its
                         focus ring shows in full. */
                      const label = (
                        <span className="-mt-[0.1em] -mb-[0.2em] block overflow-hidden pt-[0.1em] pb-[0.2em] text-menu">
                          <motion.span
                            className={cn(
                              "relative block text-ink",
                              "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-[0.02em] after:h-px after:origin-left after:scale-x-0 after:bg-accent-text after:transition-transform after:duration-400 after:ease-(--ed-ease-reveal)",
                              "group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100",
                            )}
                            initial={reduced ? false : { y: "110%" }}
                            animate={{ y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: EASE_REVEAL }}
                          >
                            {item.label}
                          </motion.span>
                        </span>
                      );

                      const className = "group flex min-h-15 items-center gap-3 py-[0.6rem] text-ink no-underline";

                      return (
                        <li
                          key={item.key}
                          className="border-t-(length:--ed-hair-w) border-hairline"
                          onMouseEnter={() => show(item.key)}
                          onMouseLeave={() => setActive(null)}
                        >
                          {item.external ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={className}
                              onFocus={() => show(item.key)}
                            >
                              {label}
                              <ExternalIcon className="size-3 shrink-0 text-ink-soft" />
                            </a>
                          ) : (
                            <Link
                              href={item.href}
                              className={className}
                              onClick={onClose}
                              onFocus={() => show(item.key)}
                            >
                              {label}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* The foot, directly after the list: no dead zone on phones. */}
                  <div className="mt-(--ed-space-block) flex flex-wrap items-center gap-x-8 gap-y-4 border-t-(length:--ed-hair-w) border-hairline pt-(--ed-space-pair)">
                    <Link href={bookHref} onClick={onClose} className={ctaClass({ variant: "gold" })}>
                      Plan your day
                    </Link>
                    {address && <p className="text-caption text-ink-soft">{address}</p>}
                  </div>
                </nav>

                {/* The preview plate (≥1024): 4:5, an operator photograph,
                    blur placeholder, keyline only while a full-frame
                    photograph shows (a studio cut-out sits on its bone mat
                    instead, see isStudioCutout). */}
                <div
                  aria-hidden="true"
                  data-menu-preview=""
                  className={cn(
                    "relative hidden aspect-[4/5] self-start lg:block lg:[grid-column:col_9/span_4]",
                    active &&
                      previews[active] &&
                      !isStudioCutout(previews[active]) &&
                      "after:pointer-events-none after:absolute after:inset-0 after:z-[2] after:ring-1 after:ring-plate-keyline after:ring-inset",
                  )}
                >
                  {mounted.map((key) => {
                    const src = previews[key];
                    if (!src) return null;
                    const blur = previewBlur?.[key];
                    const matted = isStudioCutout(src);
                    return (
                      <motion.div
                        key={key}
                        data-active={active === key ? "" : undefined}
                        data-mat={matted ? "" : undefined}
                        className={cn("absolute inset-0 overflow-hidden", matted && "bg-bone")}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: active === key ? 1 : 0 }}
                        transition={previewFade}
                      >
                        <div className={cn("absolute", matted ? "inset-[8%]" : "inset-0")}>
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 30vw, 0px"
                            quality={68}
                            placeholder={blur ? "blur" : "empty"}
                            blurDataURL={blur}
                            /* Passed as a style so the blur placeholder is
                               sized the same way as the photograph. */
                            style={{ objectFit: matted ? "contain" : "cover" }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* A Close INSIDE the dialog. With focus in an aria-modal dialog,
              WebKit and Chromium drop everything outside it from the
              accessibility tree, the header's Close included, and iOS
              VoiceOver has no Escape key. Hidden until focused, like the skip
              link; square, on paper (§H.2). Last in the dialog, where it is
              drawn: the bottom left. aria-modal stays: qa/menu-audit.mts finds
              the panel by it. */}
          <button
            type="button"
            onClick={onClose}
            className="sr-only focus:not-sr-only focus:absolute focus:bottom-6 focus:left-(--ed-margin) focus:z-10 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-none focus:border focus:border-rule focus:bg-paper focus:px-5 focus:text-ui focus:text-ink"
          >
            Close menu
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
