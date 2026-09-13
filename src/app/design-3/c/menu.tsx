"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import styles from "./c.module.css";
import { ExternalIcon } from "./icons";

type NavItem = { key: string; label: string; href: string; external: boolean };

/**
 * The phone menu: a "Menu" button in the masthead and a full-page paper panel
 * with its own masthead row and "Close". Hidden from 1024px, where the
 * masthead shows the navigation as a row.
 *
 * Escape closes; focus moves to Close on open and back to Menu on close; the
 * page behind does not scroll; a closed panel is inert.
 */
export function EditorialMenu({
  brand,
  nav,
  cta,
  address,
}: {
  brand: string;
  nav: NavItem[];
  cta: { label: string; href: string };
  /** The site's address is optional content; nothing is rendered without it. */
  address: string | null;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const openRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) openRef.current?.focus({ preventScroll: true });
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    /* An overflow lock alone does not hold the page while the site's smooth
       scroller runs: it moves the page itself, and draft B's critic measured
       1,616px of scroll behind an open menu locked this way. Stop it while the
       panel is open, and start it again on close. */
    const lenis = (window as Window & { __lenis?: { stop(): void; start(): void } }).__lenis;
    lenis?.stop();

    /* The panel's visibility flips a frame or two after the commit, and a
       hidden element refuses focus — so keep trying until it takes. */
    let raf = 0;
    let tries = 0;
    const focusClose = () => {
      closeRef.current?.focus({ preventScroll: true });
      if (document.activeElement !== closeRef.current && tries++ < 30) raf = requestAnimationFrame(focusClose);
    };
    focusClose();

    /* A modal dialog keeps Tab inside itself: from the last control back to
       Close, and Shift+Tab from Close round to the last. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      const panel = panelRef.current;
      if (e.key !== "Tab" || !panel) return;
      const focusables = [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const outside = !panel.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      root.style.overflow = previous;
      lenis?.start();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={styles.menuOnly}>
      <button
        ref={openRef}
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        Menu
        <span aria-hidden className={styles.menuGlyph} />
      </button>

      {/* data-lenis-prevent: a stopped smooth scroller cancels every wheel and
          touchmove on the page unless the event's path carries this attribute,
          so without it a panel taller than a short phone screen could not be
          scrolled at all. */}
      <div
        ref={panelRef}
        id={panelId}
        className={styles.panel}
        data-open={open}
        data-lenis-prevent
        inert={!open}
        role="dialog"
        aria-modal={open}
        aria-label="Menu"
      >
        <div className={`${styles.wrap} ${styles.panelHead}`}>
          <span className={styles.brand}>{brand}</span>
          <button ref={closeRef} type="button" className={styles.menuButton} onClick={close}>
            Close
            <span aria-hidden className={styles.closeGlyph} />
          </button>
        </div>

        <nav className={styles.wrap} aria-label="Main">
          <ul className={styles.panelList}>
            {nav.map((item) => (
              <li key={item.key}>
                {item.external ? (
                  <a
                    className={styles.panelLink}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                  >
                    {item.label}
                    <ExternalIcon className={styles.extIconLarge} />
                  </a>
                ) : (
                  <Link className={styles.panelLink} href={item.href} onClick={close}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className={`${styles.wrap} ${styles.panelFoot}`}>
          <Link className={styles.button} href={cta.href} onClick={close}>
            {cta.label}
          </Link>
          {address && <address className={styles.address}>{address}</address>}
        </div>
      </div>
    </div>
  );
}
