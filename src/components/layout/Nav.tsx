"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import type { NavItem } from "@/lib/types";
import { cn, pad } from "@/lib/utils";

export function Nav({
  items,
  brandName,
  bookHref = "/contact",
}: {
  items: NavItem[];
  brandName: string;
  bookHref?: string;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotionSafe();
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

  /* Escape to close + lock background scroll while the menu is open. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = useCallback(
    (href: string) => {
      // In-page hash links are not a route state — treating them as active
      // lit up Why Us, Book Guide and Team all at once on the homepage.
      if (href.startsWith("/#") || href === "/") return false;
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  const transparent = overHero && !open;
  /** Transparent over a light hero: ink, not sand. */
  const onLight = transparent && heroTone === "light";

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-luxe",
          transparent
            ? "bg-transparent py-5"
            : "bg-shell/85 py-3 shadow-[0_1px_0_0_rgba(20,23,26,0.08)] backdrop-blur-xl",
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex w-full max-w-[92rem] items-center justify-between px-6 sm:px-8 lg:px-12"
        >
          <Link
            href="/"
            className={cn(
              "font-display text-[0.9375rem] font-bold uppercase tracking-[0.16em] transition-colors duration-500",
              transparent && !onLight ? "text-sand-50" : "text-ink",
            )}
          >
            {brandName}
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-8 lg:flex">
            {items.map((item) => (
              <li key={item.key}>
                <NavLink
                  item={item}
                  active={isActive(item.href)}
                  transparent={transparent}
                  onLight={onLight}
                />
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Link
              href={bookHref}
              className={cn(
                "hidden h-11 items-center rounded-pill px-6 font-display text-[0.6875rem] font-medium uppercase tracking-[0.16em] transition-all duration-500 ease-luxe hover:-translate-y-0.5 sm:inline-flex",
                transparent && !onLight
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
              aria-controls="mobile-menu"
              className={cn(
                "relative z-50 -mr-2 flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-500 lg:hidden",
                open || !transparent || onLight ? "text-ink" : "text-sand-50",
              )}
            >
              <span className="sr-only">
                {open ? "Close menu" : "Open menu"}
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

      {/* Fullscreen mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex flex-col bg-shell lg:hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 pt-28 pb-8">
              <ul className="flex flex-col">
                {items.map((item, i) => (
                  <motion.li
                    key={item.key}
                    initial={reduced ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: reduced ? 0 : 0.06 + i * 0.045,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="border-b border-ink/10"
                  >
                    <MobileLink item={item} index={i + 1} />
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Thumb-friendly, bottom-safe CTA */}
            <div className="border-t border-ink/10 px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Link
                href={bookHref}
                className="flex h-14 w-full items-center justify-center rounded-pill bg-ocean-950 font-display text-[0.75rem] font-medium uppercase tracking-[0.16em] text-sand-50"
              >
                Book Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({
  item,
  active,
  transparent,
  onLight,
}: {
  item: NavItem;
  active: boolean;
  transparent: boolean;
  onLight: boolean;
}) {
  const light = transparent && !onLight;
  const className = cn(
    "group relative inline-block py-1 text-[0.75rem] font-medium uppercase tracking-[0.16em] transition-colors duration-500",
    light
      ? "text-sand-100/85 hover:text-sand-50"
      : "text-rock-600 hover:text-ink",
    active && (light ? "text-sand-50" : "text-ink"),
  );

  const underline = (
    <span
      aria-hidden
      className={cn(
        "absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-luxe group-hover:scale-x-100",
        light ? "bg-sand-50" : "bg-ink",
        active && "scale-x-100",
      )}
    />
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {item.label}
        {underline}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
      {item.label}
      {underline}
    </Link>
  );
}

function MobileLink({ item, index }: { item: NavItem; index: number }) {
  const inner = (
    <>
      <span className="font-display text-eyebrow tabular-nums text-gold-600">
        {pad(index)}
      </span>
      <span className="text-display-md text-ink">{item.label}</span>
    </>
  );

  const className =
    "flex min-h-[4.25rem] items-baseline gap-5 py-4 active:opacity-60";

  return item.external ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {inner}
    </a>
  ) : (
    <Link href={item.href} className={className}>
      {inner}
    </Link>
  );
}
