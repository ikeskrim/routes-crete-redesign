"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";


import { OverlayMenu } from "@/components/layout/OverlayMenu";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Nav({
  items,
  brandName,
  previews,
  bookHref = "/contact",
}: {
  items: NavItem[];
  brandName: string;
  /** One photograph per nav item, shown behind the overlay on hover. */
  previews: Record<string, string | undefined>;
  bookHref?: string;
}) {
  const pathname = usePathname();
  const [overHero, setOverHero] = useState(false);
  /**
   * Whether the hero behind the bar is light or dark. Direction B's heroes sit
   * on warm sand rather than a dark scrim, and light-on-light left the nav
   * unreadable in the draft. The hero declares its own tone via
   * `data-hero-tone`; the bar inverts to match.
   */
  const [heroTone, setHeroTone] = useState<"dark" | "light">("dark");
  const [open, setOpen] = useState(false);

  /* Close the menu when the route changes. Adjusting state during render is
     React's documented pattern for this and, unlike an effect, it avoids a
     frame where the menu is still open over the new page. */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  /**
   * The bar is transparent exactly while a full-bleed hero sits behind it.
   * One IntersectionObserver replaces both a scroll listener and a "does this
   * page have a hero" probe: no hero element means it simply never fires and
   * the bar stays solid, which is the correct default.
   */
  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setOverHero(entry.intersectionRatio > 0.12);
        const tone = (entry.target as HTMLElement).dataset.heroTone;
        setHeroTone(tone === "light" ? "light" : "dark");
      },
      { threshold: [0, 0.12, 0.5, 1] },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [pathname]);

  /* Escape and the scroll lock deliberately do NOT live here. OverlayMenu owns
     both. When they were duplicated in each component, child effects committed
     before parent effects and the two cleanups restored `body.style.overflow`
     in an order that left it stuck at "hidden" after the menu closed — a
     latent freeze of the entire site, hidden only because the lock was not
     working in the first place. One owner. */

  /* Stable identity: OverlayMenu's open-effect depends on onClose, so a fresh
     closure each render would tear the effect down and rebuild it — restoring
     focus and re-locking scroll mid-interaction — every time this bar
     re-rendered. */
  const handleClose = useCallback(() => setOpen(false), []);

  const transparent = overHero && !open;
  /** Transparent over a light hero: ink, not sand. */
  const onLight = transparent && heroTone === "light";
  /** Open overlay: the bar sits on the dark panel and must read light. */
  const onDarkPanel = open;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-luxe",
          transparent || onDarkPanel
            ? "bg-transparent py-5"
            : "bg-shell/85 py-3 shadow-[0_1px_0_0_rgba(20,23,26,0.08)] backdrop-blur-xl",
        )}
      >
        {/* Over a LIGHT hero, ink alone was not enough: the links sat against
            bright, busy rock and read as marginal. A soft top-down scrim lifts
            them without making the bar look solid — chosen over simply
            darkening the ink, which fails on any bright photograph rather than
            just this one. */}
        {onLight && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-sand-50/85 via-sand-50/45 to-transparent"
          />
        )}
        <nav
          aria-label="Primary"
          className="mx-auto flex w-full max-w-[92rem] items-center justify-between px-6 sm:px-8 lg:px-12"
        >
          <Link
            href="/"
            className={cn(
              "font-display text-[0.9375rem] font-bold uppercase tracking-[0.16em] transition-colors duration-500",
              (transparent && !onLight) || onDarkPanel ? "text-sand-50" : "text-ink",
            )}
          >
            {brandName}
          </Link>


          <div className="flex items-center gap-3">
            <Link
              href={bookHref}
              className={cn(
                "hidden h-11 items-center rounded-pill px-6 font-display text-[0.6875rem] font-medium uppercase tracking-[0.16em] transition-all duration-500 ease-luxe hover:-translate-y-0.5 sm:inline-flex",
                (transparent && !onLight) || onDarkPanel
                  ? "bg-sand-50 text-ocean-950 hover:bg-white"
                  : "bg-ocean-950 text-sand-50 hover:bg-ocean-800",
              )}
            >
              Book Now
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="overlay-menu"
              className={cn(
                "relative z-50 -mr-2 flex h-11 items-center justify-center gap-3 rounded-pill px-2 transition-colors duration-500",
                onDarkPanel || (transparent && !onLight) ? "text-sand-50" : "text-ink",
              )}
            >
              <span className="sr-only">
                {open ? "Close menu" : "Open menu"}
              </span>
              <span
                aria-hidden
                className="hidden text-[0.6875rem] font-medium uppercase tracking-[0.16em] lg:inline"
              >
                {open ? "Close" : "Menu"}
              </span>
              <span aria-hidden className="relative block h-3.5 w-6">
                <span
                  className={cn(
                    "absolute left-0 block h-px w-full bg-current transition-transform duration-500 ease-luxe",
                    open ? "top-1/2 rotate-45" : "top-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-px w-full bg-current transition-transform duration-500 ease-luxe",
                    open ? "top-1/2 -rotate-45" : "top-full",
                  )}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <OverlayMenu
        items={items}
        open={open}
        onClose={handleClose}
        previews={previews}
        bookHref={bookHref}
      />
    </>
  );
}
