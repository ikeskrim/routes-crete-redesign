"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { ExternalIcon } from "../c/icons";

import styles from "./c-plus.module.css";

type NavItem = { key: string; label: string; href: string; external: boolean };
type Preview = { src: string; blurDataURL?: string } | null;
type Strings = {
  open: string;
  close: string;
  openSr: string;
  closeSr: string;
  dialogLabel: string;
  cta: { label: string; href: string };
};

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

/**
 * The C+ draft masthead (spec §H.1) and its overlay menu (§H.2), modelling
 * the live OverlayMenu contract.
 *
 * The masthead is a `div[data-draft-masthead]`, never a <header>: the page
 * keeps exactly one <header>, the hidden site bar.
 *
 * Menu contract: `button[aria-controls="cp-overlay-menu"][aria-expanded]`;
 * `[role=dialog][aria-modal=true]` mounted only while open; this effect is the
 * single owner of the body overflow lock and `__lenis.stop()`; `inert` on
 * every element outside the masthead and the panel; Tab trapped across the
 * masthead and the panel; Escape closes; focus returns to the trigger; per-item
 * previews (≥1024) mounted only once an item is pointed at or focused.
 */
export function DraftMasthead({
  brand,
  nav,
  bookNow,
  address,
  strings,
  previews,
}: {
  brand: string;
  nav: NavItem[];
  bookNow: { label: string; href: string };
  address: string | null;
  strings: Strings;
  previews: Record<string, Preview>;
}) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [tone, setTone] = useState<"light" | "dark">("light");
  const [quiet, setQuiet] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [mounted, setMounted] = useState<string[]>([]);
  const mastRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Transparent over the paper cover at load; opaque paper once the cover's
     running head passes under the masthead, so nothing ever scrolls beneath
     transparent type. */
  useEffect(() => {
    const sentinel = document.querySelector("[data-masthead-sentinel]");
    const mast = mastRef.current;
    if (!sentinel || !mast) return;
    const height = mast.offsetHeight;
    const io = new IntersectionObserver(
      ([entry]) => setSolid(entry.boundingClientRect.top < height),
      { rootMargin: `-${height}px 0px 0px 0px`, threshold: [0, 1] },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  /* Amended §H.1 states. Tone: "dark" while a night surface ([data-scene],
     [data-back-cover]) is under the bar's middle line. Quiet: the masthead
     wordmark steps back while the back-cover wordmark row is on screen, so
     the name is never printed twice in one view. One rAF-throttled read of
     three rects per scroll frame; no layout writes. */
  useEffect(() => {
    const mast = mastRef.current;
    if (!mast) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const middle = mast.offsetHeight / 2;
      let dark = false;
      document.querySelectorAll("[data-scene], [data-back-cover]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= middle && r.bottom >= middle) dark = true;
      });
      setTone(dark ? "dark" : "light");
      const row = document.querySelector("[data-back-wordmark]");
      if (row) {
        const r = row.getBoundingClientRect();
        setQuiet(r.top < window.innerHeight && r.bottom > 0);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const show = useCallback((key: string) => {
    setActive(key);
    setMounted((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const mast = mastRef.current;
    const panel = panelRef.current;
    const trigger = triggerRef.current;

    /* Both locks: overflow stops a user gesture; Lenis scrolls the page
       programmatically and must itself be stopped. */
    const lenis = (window as Window & { __lenis?: { stop(): void; start(): void } }).__lenis;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();

    /* The masthead and panel sit deep inside <main>, so body children cannot
       simply be inerted: walk down the path to them and inert every branch
       that contains neither. Only what this effect inerted is restored. */
    const keep = [mast, panel].filter((el): el is HTMLDivElement => !!el);
    const inerted: HTMLElement[] = [];
    const walk = (parent: Element) => {
      for (const child of Array.from(parent.children)) {
        if (!(child instanceof HTMLElement)) continue;
        if (keep.includes(child as HTMLDivElement)) continue;
        if (["SCRIPT", "NOSCRIPT", "STYLE", "LINK", "TEMPLATE"].includes(child.tagName)) continue;
        if (keep.some((el) => child.contains(el))) {
          walk(child);
          continue;
        }
        if (!child.inert) {
          child.inert = true;
          inerted.push(child);
        }
      }
    };
    walk(document.body);

    /* The trap's first and last stops must follow the order the browser Tabs
       through, or a stop drops out of the loop. Where `reading-flow` is
       supported (.mastBar), the masthead's Tab order is its visual order, left
       to right, at every width; elsewhere it is the DOM order. */
    const visualMast = typeof CSS !== "undefined" && CSS.supports("reading-flow", "grid-rows");
    const focusables = () =>
      keep.flatMap((el) => {
        const list = [
          ...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        ].filter((node) => node.offsetParent !== null || node === document.activeElement);
        return el === mast && visualMast
          ? list.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
          : list;
      });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (!current || !list.includes(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    /* Focus the dialog itself, not its first link: a focused link would mount
       its preview photograph before anyone pointed at it. */
    const timer = window.setTimeout(() => panel?.focus({ preventScroll: true }), 60);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      lenis?.start();
      inerted.forEach((el) => (el.inert = false));
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <div
        ref={mastRef}
        data-draft-masthead=""
        data-nav-state={!open && solid ? "solid" : "transparent"}
        data-nav-tone={open ? "light" : tone}
        className={styles.masthead}
      >
        {/* the solid bar's paper stock (grain + mottle, no vignette) */}
        <div aria-hidden="true" className={cx(styles.paperStockLayer, styles.noVignette, styles.mastStock)} />
        <div className={cx(styles.edGrid, styles.mastGrid)}>
          {/* DOM order = the ≥1024 visual order (§H.1): trigger, wordmark,
              Book Now, so Tab runs left to right. Below 1024 the grid areas
              place the trigger last visually; it stays the first stop, the
              menu being the primary navigation. */}
          <div className={styles.mastBar}>
            <button
              ref={triggerRef}
              type="button"
              className={styles.mastTrigger}
              aria-expanded={open}
              aria-controls="cp-overlay-menu"
              onClick={() => {
                setActive(null);
                setOpen((value) => !value);
              }}
            >
              <span className={styles.srOnly}>{open ? strings.closeSr : strings.openSr}</span>
              <span aria-hidden="true" className={cx(styles.tUi, styles.mastTriggerLabel)}>
                {open ? strings.close : strings.open}
              </span>
              <span aria-hidden="true" className={styles.glyph} data-open={open ? "true" : "false"} />
            </button>
            <Link
              href="/"
              translate="no"
              data-quiet={quiet && !open ? "" : undefined}
              className={cx(styles.tWordmark, styles.mastBrand)}
            >
              {brand}
            </Link>
            <Link href={bookNow.href} className={cx(styles.ctaRule, styles.mastBook)}>
              {bookNow.label}
            </Link>
          </div>
        </div>
      </div>

      {open && (
        <div
          ref={panelRef}
          id="cp-overlay-menu"
          role="dialog"
          aria-modal="true"
          aria-label={strings.dialogLabel}
          tabIndex={-1}
          data-lenis-prevent=""
          className={styles.menuPanel}
        >
          <div className={cx(styles.paperStock, styles.menuScroll)}>
            <div aria-hidden="true" className={cx(styles.paperStockLayer, styles.noVignette)} />

            {/* A Close inside the dialog for screen-reader users (iOS
                VoiceOver has no Escape); hidden until focused. */}
            <button type="button" onClick={close} className={styles.menuSrClose}>
              {strings.closeSr}
            </button>

            <div className={cx(styles.edGrid, styles.menuGrid)}>
              <nav aria-label={strings.dialogLabel} className={styles.menuNav}>
                <ul className={styles.menuList}>
                  {nav.map((item, i) => {
                    const label = (
                      <span className={styles.menuMask}>
                        <span
                          className={cx(styles.tMenu, styles.menuLabel)}
                          style={{ "--i": i } as CSSProperties}
                        >
                          {item.label}
                        </span>
                      </span>
                    );
                    return (
                      <li
                        key={item.key}
                        onMouseEnter={() => show(item.key)}
                        onMouseLeave={() => setActive(null)}
                      >
                        {item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.menuLink}
                            onFocus={() => show(item.key)}
                          >
                            {label}
                            <ExternalIcon className={styles.menuExt} />
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            className={styles.menuLink}
                            onClick={close}
                            onFocus={() => show(item.key)}
                          >
                            {label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className={styles.menuFoot}>
                  <Link href={strings.cta.href} className={styles.ctaGold} onClick={close}>
                    {strings.cta.label}
                  </Link>
                  {address && <p className={cx(styles.tCaption, styles.menuAddress)}>{address}</p>}
                </div>
              </nav>

              <div aria-hidden="true" className={styles.menuPreview}>
                {mounted.map((key) => {
                  const preview = previews[key];
                  if (!preview) return null;
                  return (
                    <div
                      key={key}
                      className={cx(styles.menuPreviewFrame, styles.motionFadeReduced)}
                      data-active={active === key ? "" : undefined}
                    >
                      <Image
                        src={preview.src}
                        alt=""
                        fill
                        quality={68}
                        sizes="(min-width: 1024px) 30vw, 0px"
                        placeholder={preview.blurDataURL ? "blur" : "empty"}
                        blurDataURL={preview.blurDataURL}
                        className={styles.plateImg}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
