"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./a.module.css";

type NavItem = { key: string; label: string; href: string; external: boolean };
type Journey = { href: string; title: string; category: string };

/**
 * The phone menu, experience-first: the journeys are the menu, the site's
 * pages follow in a quiet grid. Only shown below 1024px.
 *
 * It is a native modal <dialog> opened with showModal(), so the browser makes
 * everything outside it inert — to VoiceOver as well as to Tab. The dialog
 * carries its own copy of the bar (brand and Close) in exactly the place the
 * page's bar sits, so the Close control is inside the modal and reachable.
 * Tab and Shift+Tab wrap inside it, Escape closes it, focus returns to Menu.
 */
export function AegeanMenu({
  brand,
  nav,
  journeysLabel,
  journeys,
  address,
}: {
  brand: string;
  nav: NavItem[];
  journeysLabel: string;
  journeys: Journey[];
  address: string | null;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!open) {
      if (dialog.open) {
        dialog.close();
        buttonRef.current?.focus({ preventScroll: true });
      }
      return;
    }

    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });

    const root = document.documentElement;
    const lenis = (window as Window & { __lenis?: { stop(): void; start(): void } }).__lenis;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    lenis?.stop();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = [...dialog.querySelectorAll<HTMLElement>("a[href], button")];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    };
    dialog.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      root.style.overflow = previous;
      lenis?.start();
      dialog.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuButton}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span>Menu</span>
        <span aria-hidden className={styles.glyph} />
      </button>

      <dialog
        ref={dialogRef}
        className={styles.panel}
        aria-label="Menu"
        onClose={close}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className={`${styles.wrap} ${styles.barRow}`}>
          <Link href="/" className={styles.brand} onClick={close}>
            {brand}
          </Link>
          <button ref={closeRef} type="button" className={styles.menuButton} onClick={close}>
            <span>Close</span>
            <span aria-hidden className={styles.glyph} data-open="true" />
          </button>
        </div>
        <div className={styles.wrap}>
          <span aria-hidden className={styles.panelHairline} />
        </div>

        <div className={`${styles.wrap} ${styles.panelInner}`}>
          <div>
            <p className={styles.panelLabel}>{journeysLabel}</p>
            <ul className={styles.panelJourneys}>
              {journeys.map((j) => (
                <li key={j.href}>
                  <Link href={j.href} className={styles.panelJourney} onClick={close}>
                    <span className={styles.panelJourneyCat}>{j.category}</span>
                    <span className={styles.panelJourneyTitle}>{j.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <ul className={styles.panelNav}>
            {nav.map((item) => (
              <li key={item.key}>
                {item.external ? (
                  <a
                    className={styles.navLink}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                  >
                    {item.label}
                    <ExternalIcon />
                  </a>
                ) : (
                  <Link className={styles.navLink} href={item.href} onClick={close}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {address && <p className={styles.panelAddress}>{address}</p>}
        </div>
      </dialog>
    </>
  );
}

export function ExternalIcon() {
  return (
    <>
      <svg aria-hidden viewBox="0 0 10 10" className={styles.extIcon} fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M3 1.5h5.5V7M8.5 1.5 1.5 8.5" />
      </svg>
      <span className={styles.srOnly}> (opens in a new tab)</span>
    </>
  );
}
