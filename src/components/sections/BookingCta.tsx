"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Request-to-book panel.
 *
 * There is no payment backend and none is implied: this is a request flow that
 * matches how the business already works. It routes to the existing
 * Monday.com form, and offers a WhatsApp deep link pre-filled with the
 * experience name so the traveller doesn't have to retype it.
 *
 * Desktop: a sticky panel beside the story. Mobile: a bottom bar that appears
 * once the hero is behind you, sitting above the home indicator.
 */
export function BookingCta({
  title,
  formUrl,
  whatsapp,
  price,
  duration,
  availability,
  variant,
}: {
  title: string;
  formUrl: string;
  whatsapp: { display: string; dial: string } | null;
  price: string | null;
  duration: string | null;
  availability: string | null;
  variant: "panel" | "bar";
}) {
  const [visible, setVisible] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  /* The mobile bar only appears after the hero has scrolled away. */
  useEffect(() => {
    if (variant !== "bar") return;
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.intersectionRatio < 0.15),
      { threshold: [0, 0.15, 0.5] },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [variant]);

  const message = `Hello Routes Crete, I'd like to request a booking for "${title}".`;
  const waHref = whatsapp
    ? `https://wa.me/${whatsapp.dial}?text=${encodeURIComponent(message)}`
    : null;

  if (variant === "bar") {
    return (
      <div
        ref={sentinel}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-sand-100/15 bg-ocean-950/95 backdrop-blur-md transition-transform duration-500 ease-luxe lg:hidden",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
          visible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow uppercase text-sand-200/55">
              {price ?? "Price on request"}
            </p>
            <p className="truncate text-body-sm text-sand-50">{title}</p>
          </div>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 shrink-0 items-center rounded-pill border border-sand-100/30 px-5 text-eyebrow uppercase text-sand-50"
            >
              WhatsApp
            </a>
          )}
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 shrink-0 items-center rounded-pill bg-sand-50 px-5 text-eyebrow uppercase text-ocean-950"
          >
            Request
          </a>
        </div>
      </div>
    );
  }

  const rows = [
    { label: "Price", value: price ?? "On request" },
    { label: "Duration", value: duration ?? "On request" },
    { label: "Availability", value: availability ?? "Request availability" },
  ];

  return (
    <aside className="sticky top-28 hidden lg:block">
      <div className="rounded-media border border-ink/12 bg-sand-50 p-8">
        <p className="text-eyebrow uppercase text-rock-500">Request to book</p>
        <h2 className="text-heading-md mt-4 text-ink">{title}</h2>

        <dl className="mt-7 flex flex-col gap-4 border-t border-ink/10 pt-6">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-eyebrow uppercase text-rock-400">{row.label}</dt>
              <dd className="text-body-sm text-right text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col gap-3">
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-13 items-center justify-center rounded-pill bg-ocean-950 px-6 py-4 font-display text-eyebrow uppercase text-sand-50 transition-colors duration-500 hover:bg-ocean-800"
          >
            Request this journey
          </a>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-pill border border-ink/20 px-6 py-4 font-display text-eyebrow uppercase text-ink transition-colors duration-500 hover:border-ink/45"
            >
              WhatsApp {whatsapp?.display}
            </a>
          )}
        </div>

        <p className="text-caption mt-6 text-rock-500">
          We&rsquo;ll respond promptly with availability, final details, and
          booking confirmation.
        </p>
      </div>
    </aside>
  );
}
