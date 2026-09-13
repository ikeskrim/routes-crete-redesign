"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import styles from "./b.module.css";

type NavItem = { key: string; label: string; href: string; external: boolean };

type LenisLike = { stop: () => void; start: () => void };

const SKIP_TAGS = new Set(["SCRIPT", "NOSCRIPT", "STYLE", "TEMPLATE", "LINK", "NEXTJS-PORTAL"]);

/**
 * The phone menu: a disclosure button and a navigation panel, rendered below
 * 1024px (the desktop row replaces it).
 *
 * While it is open, the menu owns four things and hands all four back on close:
 *  - Scroll lock. `overflow: hidden` alone does not hold the page, because the
 *    site's Lenis smooth scroller swallows the wheel and scrolls
 *    programmatically; it has to be stopped (as the site's OverlayMenu does).
 *    The overflow lock still covers reduced motion, where Lenis never exists.
 *  - Inert background. Every sibling of the header, at every level up to
 *    <body>, is made inert, so neither Tab nor a screen reader's virtual
 *    cursor can reach the page behind.
 *  - Focus trap across the header (brand + this Close button) and the panel.
 *  - Escape, which closes and returns focus to the button.
 *
 * It is deliberately not role="dialog": the Close control lives in the header,
 * outside the panel, and an aria-modal panel would hide it from VoiceOver.
 */
export function CycladicMenu({
  nav,
  cta,
  address,
}: {
  nav: NavItem[];
  cta: { label: string; href: string };
  address: string | null;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const panel = panelRef.current;
    const header = button?.closest("header") ?? null;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;
    lenis?.stop();

    const backdrop: HTMLElement[] = [];
    for (let node: HTMLElement | null = header; node && node !== document.body; node = node.parentElement) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== node && sibling instanceof HTMLElement && !SKIP_TAGS.has(sibling.tagName)) {
          backdrop.push(sibling);
        }
      }
    }
    const wasInert = backdrop.map((el) => el.inert);
    backdrop.forEach((el) => (el.inert = true));

    const focusables = () =>
      [header, panel]
        .filter((el): el is HTMLElement => !!el)
        .flatMap((el) => Array.from(el.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")))
        .filter((el, i, all) => all.indexOf(el) === i && !el.closest("[inert]") && el.getClientRects().length > 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !list.includes(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    panel?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      root.style.overflow = previousOverflow;
      lenis?.start();
      backdrop.forEach((el, i) => (el.inert = wasInert[i]));
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={styles.menuOnly}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "Close" : "Menu"}</span>
        <span aria-hidden className={styles.menuBars} />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        className={styles.panel}
        data-open={open}
        inert={!open}
        data-lenis-prevent
      >
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
          <Link className={styles.pill} href={cta.href} onClick={close}>
            {cta.label}
          </Link>
          {address && <address className={styles.address}>{address}</address>}
        </div>
      </div>
    </div>
  );
}

export function ExternalIcon({ className = styles.extIcon }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5" />
    </svg>
  );
}
