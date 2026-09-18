"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { OverlayMenu } from "@/components/layout/OverlayMenu";
import { ctaClass } from "@/components/ui/Button";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark";

/** An item detail path: /experiences/<slug> or /transfers/<slug>. */
const ITEM_ROUTE = /^\/(experiences|transfers)\/[^/]+$/;

/**
 * The tone of the hero this route server-renders behind the masthead, or
 * null when it has none (C+ SPEC §0.4 C1).
 *
 * - `/` has the paper cover: "light".
 * - An item detail page has a photographic hero: "dark", but only when
 *   `itemHrefs` lists the path. A slug that 404s renders the paper 404 page, so
 *   it gets the solid bar at load instead of a transparent bar painting paper
 *   on paper until the document completes. Without `itemHrefs`, the path
 *   pattern alone decides, as before.
 * - Everything else (the index pages, /contact, /credits, 404): null.
 *
 * `usePathname` works while a client component renders on the server, so the
 * right state is in the HTML before any JavaScript runs. The observer below
 * still has the last word; this only removes a wrong first frame.
 */
function routeHeroTone(pathname: string, itemHrefs?: string[]): Tone | null {
  if (pathname === "/") return "light";
  if (!ITEM_ROUTE.test(pathname)) return null;
  if (itemHrefs && !itemHrefs.includes(pathname)) return null;
  return "dark";
}

/** Does this route server-render a hero behind the bar? Same membership test. */
function routeHasHero(pathname: string, itemHrefs?: string[]): boolean {
  return routeHeroTone(pathname, itemHrefs) !== null;
}

/**
 * The night surfaces the solid bar turns night over (amended §H.1, the C+
 * draft's `data-nav-tone="dark"` state):
 * - the signature photo essay on `/` (§D.4);
 * - the route chart of an item page (§D.6 item 7), the section its h2
 *   "Where this journey takes you" labels;
 * - the back cover, the site footer, on every route (§H.3).
 * The `/contact` head is night too, but it sits under the bar at load, where
 * the bar is contractually the solid `bg-paper` (nav-flash-guard, no-JS); a
 * bar that turned night there would flash after hydration, and would differ
 * between arriving at the top and scrolling back to it. It stays paper.
 */
const NIGHT_SURFACES = [
  "#signature",
  'section[aria-labelledby="route-heading"]',
  "footer[data-site-chrome]",
].join(", ");

/** The back cover's wordmark row (§H.3 row B); its h2 is the printed name. */
const BACK_WORDMARK = "[data-back-wordmark]";

/**
 * The hero's text boxes: what the bar watches.
 *
 * The bar stays transparent only while no hero text has reached it, so type
 * never scrolls under transparent type. That matters most on the paper cover,
 * whose headline would otherwise pass under the ink wordmark for most of a
 * screen. Decorative copies (inside `aria-hidden`) and clipped 1 x 1 boxes
 * (`sr-only`) are not text a reader sees. A split headline is watched as a
 * whole, because its line spans can be re-rendered after measuring.
 */
function heroText(hero: HTMLElement): HTMLElement[] {
  const found = new Set<HTMLElement>();
  const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue?.trim()) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest('[aria-hidden]:not([aria-hidden="false"])')) continue;
    const el = parent.closest<HTMLElement>("[data-split-source]") ?? parent;
    if (found.has(el) || !hero.contains(el)) continue;
    const box = el.getBoundingClientRect();
    if (box.width <= 1 && box.height <= 1) continue;
    found.add(el);
  }
  return [...found];
}

/**
 * The masthead (C+ SPEC §H.1): a magazine flag over a hairline.
 *
 * One fixed `<header>`, 56 / 64 px tall at every scroll position. Three cells
 * in one arrangement at every width: the menu trigger left, the wordmark
 * centred, "Book Now" right (from 640 px).
 *
 * The drawn order is the DOM order, and so the Tab order (WCAG 2.4.3). This
 * is a recorded departure from §H.1 and the C+ draft, which draw the wordmark
 * left and the trigger right below 1024 px while the trigger stays the first
 * Tab stop: one DOM order cannot match two arrangements without duplicating
 * the control, and the orchestrator ruled that the rollout must not ship a
 * first stop drawn last (MORNING.md). `reading-flow` is not used: it is not
 * supported everywhere, and the menu's Tab trap follows the DOM order.
 *
 * States (`data-nav-state`, `data-nav-tone`, one React state):
 * - transparent over the paper cover: ink;
 * - transparent over a photographic item hero: paper, with `data-on-photo` on
 *   each text run (text-contrast measures them against the photograph);
 * - solid: opaque `bg-paper` printed on the paper stock, ink;
 * - solid over a night surface (amended §H.1): opaque `bg-night`, paper ink,
 *   `hairline-night`, `rule-night` under Book Now, the night focus ring;
 * - menu open: transparent, ink over the opaque paper panel (C4).
 * `bg-transparent` stays a literal class on the transparent state (the
 * nav-flash contract).
 *
 * While the back cover's large wordmark is on screen, the masthead wordmark
 * fades out, so the name is printed once per view. It stays a link, and it
 * shows again whenever it has keyboard focus or the menu is open.
 *
 * The night tone and the quiet wordmark come from scrolling only. Both start
 * off, and nothing reads them at load, so the server HTML and every frame
 * of a load show the route's state (nav-flash-guard).
 */
export function Nav({
  items,
  brandName,
  previews,
  previewBlur,
  address,
  itemHrefs,
  bookHref = "/contact",
}: {
  items: NavItem[];
  brandName: string;
  /** One operator photograph per nav item, shown in the open menu on hover or focus (≥1024). */
  previews: Record<string, string | undefined>;
  /** The blur placeholder of each preview, by the same keys (C7). */
  previewBlur?: Record<string, string | undefined>;
  /** The menu foot's address line (C7). */
  address?: string;
  /** Every experience and transfer page that exists (C7, C1). */
  itemHrefs?: string[];
  bookHref?: string;
}) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Both initialised from the route, not discovered after hydration. */
  const [overHero, setOverHero] = useState(() => routeHasHero(pathname, itemHrefs));
  const [heroTone, setHeroTone] = useState<Tone>(() => routeHeroTone(pathname, itemHrefs) ?? "light");
  const [open, setOpen] = useState(false);
  /** A night surface is under the bar's middle line (set by scrolling only). */
  const [overNight, setOverNight] = useState(false);
  /** The back cover's wordmark is on screen (set by scrolling only). */
  const [quiet, setQuiet] = useState(false);

  /* A client navigation re-initialises the bar from the new route. Adjusting
     state during render is React's documented pattern for this and, unlike an
     effect, it leaves no frame where the menu is still open over the new page
     or the bar still wears the old page's state. */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    const tone = routeHeroTone(pathname, itemHrefs);
    setLastPathname(pathname);
    setOpen(false);
    setOverHero(tone !== null);
    setHeroTone(tone ?? "light");
    setOverNight(false);
    setQuiet(false);
  }

  /**
   * Night tone and quiet wordmark (amended §H.1), read on scroll.
   *
   * One read per animation frame at most: a scroll or resize schedules it,
   * and it reads a few rects (no layout writes). Nothing is read at mount, so
   * a load never changes the bar; a browser that restores a scroll position
   * fires a scroll event. A client navigation (not a load) schedules one read
   * of its own, for the case where the scroll position did not move. While
   * the menu is open the page cannot scroll, and neither state is shown.
   *
   * `readerPath` is the route the reader last ran for, so a changed value is
   * a client navigation. A mounted flag would also fire on React's dev-only
   * second mount, i.e. at load.
   */
  const readerPath = useRef(pathname);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const header = headerRef.current;
      if (!header) return;
      const middle = header.offsetHeight / 2;
      let night = false;
      for (const el of document.querySelectorAll(NIGHT_SURFACES)) {
        const box = el.getBoundingClientRect();
        if (box.height > 0 && box.top <= middle && box.bottom >= middle) {
          night = true;
          break;
        }
      }
      setOverNight(night);
      const row = document.querySelector(BACK_WORDMARK);
      const box = (row?.querySelector("h2") ?? row)?.getBoundingClientRect();
      setQuiet(!!box && box.height > 0 && box.top < window.innerHeight && box.bottom > 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if (readerPath.current !== pathname) schedule();
    readerPath.current = pathname;
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  /**
   * Transparent exactly while a hero covers the bar and none of its text has
   * reached the bar (see heroText). One IntersectionObserver, whose root
   * starts at the bar's foot, watches the hero and each of its text boxes; a
   * box crossing the bar's foot crosses a threshold, so every change of
   * either condition is reported. When the hero's DOM changes (a headline
   * re-split after measuring) the boxes are collected again. A hero without
   * text falls back to the hero's own visible share (> 12 %).
   */
  const expectHero = routeHasHero(pathname, itemHrefs);
  useEffect(() => {
    /* No observer: the solid bar, the same state a route without a hero
       already gets below. Nothing else can report when the hero's text
       reaches the bar, and both standing alternatives are worse than one
       settle after hydration. Staying transparent would leave the wordmark
       and the trigger printed over whatever scrolls under them, for the
       whole page rather than a frame; turning solid on the first scroll
       instead would make the bar at the top of the page depend on how the
       reader got there, which the amended §H.1 rules out for /contact's
       head. The tone is left as the route set it: it is only read while the
       bar is transparent. */
    if (!("IntersectionObserver" in window)) {
      // From a task, not the effect body (react-hooks/set-state-in-effect).
      const timer = setTimeout(() => setOverHero(false), 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    let frame = 0;
    let rewatch = 0;
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;
    let heroMo: MutationObserver | null = null;
    let current: HTMLElement | null = null;
    /** The watched hero showed no text box (not laid out yet, or none). */
    let textless = false;

    const watch = (hero: HTMLElement) => {
      current = hero;
      io?.disconnect();
      const tone: Tone = hero.dataset.heroTone === "light" ? "light" : "dark";
      const texts = heroText(hero);
      textless = texts.length === 0;

      if (texts.length) {
        const bar = headerRef.current?.offsetHeight ?? 0;
        /* Has this box's top reached the bar's foot? Kept per box between
           reports; a box only changes side by crossing a threshold. */
        const reached = new Map<Element, boolean>(texts.map((el) => [el, false]));
        let covers = true;
        io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              /* A zero-height box has not been laid out yet; it has not
                 scrolled away. Ignore the reading; the observer reports again
                 once layout lands. */
              if (entry.boundingClientRect.height === 0) continue;
              if (entry.target === hero) {
                covers = entry.boundingClientRect.bottom > bar + 0.5;
              } else {
                reached.set(entry.target, entry.boundingClientRect.top < bar - 0.5);
              }
            }
            setOverHero(covers && ![...reached.values()].some(Boolean));
            setHeroTone(tone);
          },
          { rootMargin: `-${bar}px 0px 0px 0px`, threshold: [0, 0.5, 1] },
        );
        io.observe(hero);
        texts.forEach((el) => io!.observe(el));
      } else {
        io = new IntersectionObserver(
          ([entry]) => {
            if (entry.boundingClientRect.height === 0) return;
            setOverHero(entry.intersectionRatio > 0.12);
            setHeroTone(tone);
          },
          { threshold: [0, 0.12, 0.5, 1] },
        );
        io.observe(hero);
      }

      heroMo?.disconnect();
      heroMo = new MutationObserver(() => {
        cancelAnimationFrame(rewatch);
        rewatch = requestAnimationFrame(() => {
          if (!cancelled && hero.isConnected) watch(hero);
        });
      });
      heroMo.observe(hero, { childList: true, subtree: true, characterData: true });
    };

    const attach = () => {
      if (cancelled) return;
      /* Measure only a styled page. Scripts can run before the stylesheet
         applies, and text positions read from unstyled layout would flip the
         bar solid at load. The bar's own `position: fixed` shows the site CSS
         is in. */
      const header = headerRef.current;
      if (header && getComputedStyle(header).position !== "fixed") {
        frame = requestAnimationFrame(attach);
        return;
      }
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      /* A streamed page segment is parsed into a hidden container and moved
         into place a moment later: a hero without a box yet is waited for. */
      if (hero && hero.getBoundingClientRect().height === 0 && document.readyState !== "complete") {
        frame = requestAnimationFrame(attach);
        return;
      }
      if (hero) {
        watch(hero);
        followHero();
        return;
      }
      /* The hero may not be in the DOM YET: the document streams, and under
         a throttled CPU this effect can run first. Conclude only once the
         document is complete. */
      if (document.readyState !== "complete") {
        frame = requestAnimationFrame(attach);
        return;
      }
      // No hero: the bar is solid.
      setOverHero(false);
      /* A client navigation can paint the paper loading screen before the
         page: when this route should have a hero, pick it up on arrival. */
      if (expectHero) followHero();
    };

    /* Follow the hero for as long as this route is shown: one that arrives
       late is watched, and one replaced by a re-render is swapped for its
       successor (an observer on a detached node never reports again). A
       vanished hero with no successor leaves the bar solid. A hero watched
       before it had any text box (moved into place after a streamed parse)
       is collected again once one appears. While a laid-out hero stands, the
       check per DOM change is a single `isConnected` read. */
    const followHero = () => {
      if (mo) return;
      mo = new MutationObserver(() => {
        if (cancelled) return;
        if (current?.isConnected) {
          if (textless && heroText(current).length) watch(current);
          return;
        }
        const next = document.querySelector<HTMLElement>("[data-hero]");
        if (next) {
          watch(next);
        } else if (current) {
          current = null;
          io?.disconnect();
          heroMo?.disconnect();
          setOverHero(false);
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    };

    /* A new width can change the bar's height (56 px below 1024, 64 px above)
       and which text boxes are drawn: collect again. Height-only resizes (a
       phone's URL bar while scrolling) change neither and are ignored. */
    let width = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      cancelAnimationFrame(rewatch);
      rewatch = requestAnimationFrame(() => {
        if (!cancelled && current?.isConnected) watch(current);
      });
    };

    attach();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(rewatch);
      io?.disconnect();
      mo?.disconnect();
      heroMo?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [pathname, expectHero]);

  /* Escape and the scroll lock deliberately do NOT live here. OverlayMenu owns
     both. When they were duplicated in each component, child effects committed
     before parent effects and the two cleanups restored `body.style.overflow`
     in an order that left it stuck at "hidden" after the menu closed. One
     owner. */

  /* Stable identity: OverlayMenu's open effect depends on onClose, so a fresh
     closure each render would tear the effect down and rebuild it (restoring
     focus and re-locking scroll mid-interaction) every time this bar
     re-rendered. */
  const handleClose = useCallback(() => setOpen(false), []);

  const transparent = overHero && !open;
  /** Paper type over a photographic hero. */
  const onPhoto = transparent && heroTone === "dark";
  const state = transparent || open ? "transparent" : "solid";
  /** The solid bar printed on night, over a night surface. */
  const onNight = state === "solid" && overNight;
  /** Paper type (over a photograph or on night); ink everywhere else. */
  const dark = onPhoto || onNight;
  const tone: Tone = dark ? "dark" : "light";
  const photo = onPhoto ? "" : undefined;
  /** The wordmark steps back under the back cover's name, never while open. */
  const hushed = quiet && !open;

  return (
    <>
      <header
        ref={headerRef}
        data-site-chrome
        data-nav-state={state}
        data-nav-tone={tone}
        className={cn(
          /* Constant height; only the ground changes (no condense, no blur,
             no shadow). Isolated, so the stock's multiply layers blend with
             the bar's own paper and nothing behind it. */
          "fixed inset-x-0 top-0 z-50 isolate h-(--ed-masthead-h) transition-[background-color] duration-400 ease-(--ed-ease-reveal)",
          state === "transparent" ? "bg-transparent" : onNight ? "bg-night" : "bg-paper",
        )}
      >
        {/* The solid paper bar is printed on the page's paper stock (grain
            and mottle, no vignette), so it never reads as a flat app bar laid
            over the paper. The night bar is plain night, as in the draft. */}
        <div
          aria-hidden="true"
          className={cn(
            "paper-stock-layer no-vignette transition-opacity duration-400 ease-(--ed-ease-reveal)",
            state === "solid" && !onNight ? "opacity-100" : "opacity-0",
          )}
        />

        <nav aria-label="Primary" className="ed-grid relative z-[1] h-full">
          <div
            className={cn(
              /* Trigger, wordmark, Book Now: drawn in the DOM order. */
              "relative grid h-full grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center gap-x-6 [grid-column:content-start/content-end] [grid-template-areas:'trigger_brand_book']",
              /* The hairline across the content box, at the foot. */
              "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px",
              dark ? "after:bg-hairline-night" : "after:bg-hairline",
            )}
          >
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="overlay-menu"
              className={cn(
                "-ms-1.5 inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-3 justify-self-start rounded-none px-1.5 text-ui transition-colors duration-400 ease-(--ed-ease-reveal) [grid-area:trigger]",
                dark ? "text-on-night focus-visible:outline-focus-night" : "text-ink",
              )}
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span aria-hidden="true" data-on-photo={photo} className="leading-none">
                {open ? "Close" : "Menu"}
              </span>
              {/* Two 1 px lines 6 px apart; they cross into an X by transform
                  only, never by moving `top`. */}
              <span aria-hidden="true" className="relative block h-2 w-[22px]">
                <span
                  className={cn(
                    "absolute inset-x-0 top-0 block h-px bg-current transition-transform duration-400 ease-(--ed-ease-reveal)",
                    open && "translate-y-[3.5px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "absolute inset-x-0 top-[7px] block h-px bg-current transition-transform duration-400 ease-(--ed-ease-reveal)",
                    open && "-translate-y-[3.5px] -rotate-45",
                  )}
                />
              </span>
            </button>

            <Link
              href="/"
              // The brand is a name, not words: keep browser auto-translate off it.
              translate="no"
              data-on-photo={photo}
              data-quiet={hushed ? "" : undefined}
              className={cn(
                "inline-flex min-h-11 min-w-0 items-center justify-self-center text-center text-wordmark no-underline [grid-area:brand] [overflow-wrap:anywhere] [transition:color_400ms_var(--ed-ease-reveal),opacity_300ms_var(--ed-ease-reveal)]",
                dark ? "text-on-night focus-visible:outline-focus-night" : "text-ink",
                hushed && "opacity-0 focus-visible:opacity-100",
              )}
            >
              {brandName}
            </Link>

            <Link
              href={bookHref}
              data-on-photo={photo}
              className={cn(
                ctaClass({ variant: "rule", tone: dark ? "night" : "light" }),
                "hidden justify-self-end transition-colors duration-400 [grid-area:book] sm:inline-flex",
              )}
            >
              Book Now
            </Link>
          </div>
        </nav>
      </header>

      <OverlayMenu
        items={items}
        open={open}
        onClose={handleClose}
        previews={previews}
        previewBlur={previewBlur}
        address={address}
        bookHref={bookHref}
        headerRef={headerRef}
        triggerRef={triggerRef}
      />
    </>
  );
}
