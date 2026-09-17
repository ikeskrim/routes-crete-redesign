"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Lenis from "lenis";

/**
 * Lenis smooth scrolling.
 *
 * Deliberately disabled when the user prefers reduced motion — hijacking the
 * scroll is exactly the kind of motion that setting asks us to drop.
 *
 * Also resolves the legacy one-pager anchors (#portfolio, #services, …) that
 * printed material and old links still point at, mapping them onto the new
 * homepage section ids, or onto a page (#contact → /contact).
 */
export function SmoothScroll({
  legacyAnchorMap,
}: {
  legacyAnchorMap: Record<string, string>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const lenis = new Lenis({
      // Heavy, gliding scroll. lerp rather than duration so the weight is
      // consistent regardless of how far a single wheel gesture travels.
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      // Native scrolling on touch feels better than an emulated one.
      syncTouch: false,
    });

    /* An anchor lands 24 px (1.5rem) under the fixed masthead, the same place
       `scroll-padding-top: calc(var(--ed-masthead-h) + 1.5rem)` puts a native
       jump: 56 + 24 below 1024, 64 + 24 above (C+ SPEC §D.1). Read from the
       computed token on every jump, so a resize across 1024 is honoured.

       Lenis is given the resulting position as a NUMBER. Given an element,
       Lenis 1.3 already subtracts the document's scroll-padding-top (and the
       target's scroll-margin-top) before adding `offset`, so an element
       target with `offset: -(masthead + 24)` landed twice as far down: 176 px
       at 1440, 160 px at 390 (and 192 px before C+, with 6rem twice). With a
       number, Lenis applies neither, and the landing depends only on this
       token and the target's own scroll-margin-top, exactly as a native jump
       does. */
    const anchorOffset = () => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      const token = styles.getPropertyValue("--ed-masthead-h").trim();
      const value = parseFloat(token);
      const masthead = token.endsWith("rem")
        ? value * parseFloat(styles.fontSize)
        : value;
      return (Number.isFinite(masthead) ? masthead : 64) + 24;
    };

    /* Exposed so tooling (and the QA screenshot harness) can position the
       scroll deterministically instead of fighting the smoothing. */
    (window as Window & { __lenis?: Lenis }).__lenis = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Let in-page anchor links run through Lenis.
    const onAnchorClick = (event: MouseEvent) => {
      // Modified and non-primary clicks stay the browser's, so Cmd/Ctrl+click
      // and Shift+click still open the anchor in a new tab or window.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop);
      lenis.scrollTo(
        target.getBoundingClientRect().top +
          lenis.animatedScroll -
          (Number.isFinite(margin) ? margin : 0) -
          anchorOffset(),
      );
      history.pushState(null, "", hash);

      /* Cancelling the click also cancels the browser's own fragment
         navigation, and that is what moves keyboard focus to the target. The
         skip link scrolled to <main> and the next Tab went straight back into
         the nav. So focus is moved by hand: preventScroll leaves the glide to
         Lenis, and a tabindex borrowed for the purpose is handed back on blur
         so a later click inside the section cannot pull focus onto it. */
      const el = target as HTMLElement;
      if (!el.matches("a[href], button, input, select, textarea, [tabindex]")) {
        el.setAttribute("tabindex", "-1");
        el.setAttribute("data-anchor-focus", "");
        el.addEventListener(
          "blur",
          () => {
            el.removeAttribute("tabindex");
            el.removeAttribute("data-anchor-focus");
          },
          { once: true },
        );
      }
      el.focus({ preventScroll: true });
    };

    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
      delete (window as Window & { __lenis?: Lenis }).__lenis;
    };
  }, [pathname]);

  // Legacy anchor resolution runs regardless of motion preference.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const mapped = legacyAnchorMap[hash];
    if (!mapped) return;

    /* A value that is a path is a page, not a section: the old one-pager's
       #contact now lives at /contact. Only from the homepage, where the old
       anchors pointed, and only a same-site path. */
    if (mapped.startsWith("/")) {
      if (pathname === "/" && !mapped.startsWith("//")) router.replace(mapped);
      return;
    }

    const target = document.querySelector(mapped);
    if (!target) return;

    /* An explicit "smooth" overrides the reduced-motion CSS, which only governs
       "auto" — so the preference has to be read here. */
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Wait a frame so layout has settled before jumping.
    const id = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", mapped);
    });
    return () => cancelAnimationFrame(id);
  }, [legacyAnchorMap, pathname, router]);

  return null;
}
