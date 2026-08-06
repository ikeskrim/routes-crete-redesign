"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Lenis smooth scrolling.
 *
 * Deliberately disabled when the user prefers reduced motion — hijacking the
 * scroll is exactly the kind of motion that setting asks us to drop.
 *
 * Also resolves the legacy one-pager anchors (#portfolio, #services, …) that
 * printed material and old links still point at, mapping them onto the new
 * homepage section ids.
 */
export function SmoothScroll({
  legacyAnchorMap,
}: {
  legacyAnchorMap: Record<string, string>;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      // Native scrolling on touch feels better than an emulated one.
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Let in-page anchor links run through Lenis.
    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -96 });
      history.pushState(null, "", hash);
    };

    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [pathname]);

  // Legacy anchor resolution runs regardless of motion preference.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const mapped = legacyAnchorMap[hash];
    if (!mapped) return;

    const target = document.querySelector(mapped);
    if (!target) return;

    // Wait a frame so layout has settled before jumping.
    const id = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", mapped);
    });
    return () => cancelAnimationFrame(id);
  }, [legacyAnchorMap, pathname]);

  return null;
}
