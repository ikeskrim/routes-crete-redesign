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
  bookHref,
}: {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
  previews: Record<string, string | undefined>;
  bookHref: string;
}) {
  const reduced = useReducedMotionSafe();
  const panelRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  /* Escape, focus trap, and scroll lock all live for exactly as long as the
     menu is open. */
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    // Move focus into the panel so the keyboard lands somewhere sensible.
    const id = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('a[href], button:not([disabled])')
        ?.focus();
    }, 60);

    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(id);
      document.body.style.overflow = previousOverflow;
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
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={reduced ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.2 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grain fixed inset-0 z-40 flex flex-col bg-ocean-950"
        >
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
            <nav
              aria-label="Primary"
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

                  return (
                    <motion.li
                      key={item.key}
                      initial={reduced ? false : { opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.8,
                        delay: reduced ? 0 : 0.08 + i * 0.055,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="border-b border-sand-100/10"
                      onMouseEnter={() => handleHover(item.key)}
                      onMouseLeave={() => handleHover(null)}
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
                    </motion.li>
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
