"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Monday.com booking form, mounted only as the reader approaches it.
 *
 * Native `loading="lazy"` alone was lazy in name only: Chromium's distance
 * threshold is generous enough that, one section below the fold, the third
 * party's page was requested at load anyway — and qa/visual-check.mts records
 * that this embed can stall for minutes. So the box is reserved at its full
 * height in the server HTML (no layout shift), and the iframe is inserted when
 * the box comes within 120px below the viewport.
 *
 * Why 120px: measured on /contact, the box starts 184-633px below the fold at
 * load (1920x1080: 184, 1440x900 and 1280x900: 314, 390x844: 633). A first
 * version used 400px and mounted at load on every desktop size, i.e. not lazy at
 * all. 120px stays under the smallest gap, and still starts the third party's
 * page before the form's top edge reaches the fold.
 *
 * Deliberately NOT a click-to-load facade: the form stays one scroll away with
 * nothing to press, and qa/security-headers.mts still finds a sandboxed iframe
 * after scrolling. Without JavaScript the <noscript> copy renders the same
 * iframe, so no reader loses the form.
 */
export function LazyFormEmbed({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  /** Sizing for the reserved box; the iframe fills it. */
  className: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || mounted) return;
    if (!("IntersectionObserver" in window)) {
      // Nothing to wait for: mount straight away, from a task rather than the
      // effect body, as the observer below does from its callback.
      const timer = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px 120px 0px" },
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [mounted]);

  /* Sandboxed: the form is a third party's page, so it gets only what a form
     needs — scripts, submitting, its own origin's storage, and opening its own
     links — and nothing that could navigate or script this page. The referrer
     follows the site-wide policy rather than sending the full page URL. */
  const frame = (
    <iframe
      src={src}
      title={title}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="h-full w-full border-0"
    />
  );

  return (
    <div ref={boxRef} className={className}>
      {mounted ? frame : <noscript>{frame}</noscript>}
    </div>
  );
}
