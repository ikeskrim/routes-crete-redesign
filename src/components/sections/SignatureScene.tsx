"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import { SplitLines } from "@/components/ui/SplitLines";
import { cn, pad } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface Scene {
  label: string;
  text: string;
  image: string;
  blurDataURL?: string;
}

/**
 * The signature journey, told as a pinned film.
 *
 * The section is tall; an inner sticky frame holds the viewport while
 * ScrollTrigger scrubs the photographs across each other and advances the
 * chapter. Text is verbatim from the experience content — the scene only
 * references paragraphs, it never restates them.
 *
 * Under prefers-reduced-motion the pin is dropped entirely and the chapters
 * render as a plain stacked sequence.
 */
export function SignatureScene({
  eyebrow,
  title,
  scenes,
  href,
  ctaLabel = "Read the full journey",
}: {
  eyebrow: string;
  title: string;
  scenes: Scene[];
  href: string;
  ctaLabel?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotionSafe();

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    gsap.registerPlugin(ScrollTrigger);

    /* Lenis drives scroll from its own rAF loop, so ScrollTrigger has to be
       told when to recompute rather than relying on native scroll events. */
    const lenis = (
      window as Window & { __lenis?: { on: (e: string, cb: () => void) => void; off?: (e: string, cb: () => void) => void } }
    ).__lenis;
    const update = () => ScrollTrigger.update();
    lenis?.on("scroll", update);

    const ctx = gsap.context(() => {
      const layers = gsap.utils.toArray<HTMLElement>("[data-scene-image]");

      // Crossfade + slow push between consecutive photographs.
      layers.forEach((layer, i) => {
        if (i === 0) return;
        gsap.fromTo(
          layer,
          { opacity: 0 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: wrapper,
              start: `${(i - 0.55) / scenes.length * 100}% top`,
              end: `${(i + 0.1) / scenes.length * 100}% top`,
              scrub: true,
            },
          },
        );
      });

      layers.forEach((layer, i) => {
        gsap.fromTo(
          layer.querySelector("[data-scene-inner]"),
          { scale: 1.16 },
          {
            scale: 1.02,
            ease: "none",
            scrollTrigger: {
              trigger: wrapper,
              start: `${(i - 0.6) / scenes.length * 100}% top`,
              end: `${(i + 1) / scenes.length * 100}% top`,
              scrub: true,
            },
          },
        );
      });

      // Which chapter's words are showing.
      ScrollTrigger.create({
        trigger: wrapper,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const index = Math.min(
            scenes.length - 1,
            Math.floor(self.progress * scenes.length + 0.15),
          );
          setActive((current) => (current === index ? current : index));
        },
      });
    }, wrapper);

    ScrollTrigger.refresh();

    return () => {
      lenis?.off?.("scroll", update);
      ctx.revert();
    };
  }, [reduced, scenes.length]);

  /* ---------------------------------------------- reduced-motion variant */
  if (reduced) {
    return (
      <section
        id="signature"
        className="grain relative bg-ocean-950 py-section-lg text-sand-50"
      >
        <div aria-hidden className="grain-overlay" />
        <div className="relative mx-auto max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <p className="text-eyebrow uppercase text-gold-300">{eyebrow}</p>
          <h2 className="text-display-lg mt-6 max-w-[18ch]">{title}</h2>

          <div className="mt-16 flex flex-col gap-20">
            {scenes.map((scene, i) => (
              <article key={i} className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={scene.image}
                    alt={scene.label}
                    fill
                    sizes="(max-width: 1024px) 100vw, 46vw"
                    placeholder={scene.blurDataURL ? "blur" : undefined}
                    blurDataURL={scene.blurDataURL}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-eyebrow uppercase text-gold-300">
                    {pad(i + 1)} — {scene.label}
                  </p>
                  <p className="text-body-lg mt-5 text-sand-100/85">{scene.text}</p>
                </div>
              </article>
            ))}
          </div>

          <Link
            href={href}
            className="mt-16 inline-flex items-center gap-3 text-eyebrow uppercase text-sand-50"
          >
            <span aria-hidden className="h-px w-10 bg-gold-400" />
            {ctaLabel}
          </Link>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------ pinned variant */
  return (
    <section
      id="signature"
      ref={wrapperRef}
      data-scene
      className="relative bg-ocean-950"
      style={{ height: `${scenes.length * 100}svh` }}
    >
      <div className="grain sticky top-0 h-[100svh] overflow-hidden">
        {/* Stacked photographs — the first is the base, the rest fade over it */}
        {scenes.map((scene, i) => (
          <div
            key={i}
            data-scene-image
            className="absolute inset-0 will-change-[opacity]"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            <div
              data-scene-inner
              className="absolute inset-[-6%] will-change-transform"
            >
              <Image
                src={scene.image}
                alt=""
                fill
                sizes="100vw"
                quality={68}
                placeholder={scene.blurDataURL ? "blur" : undefined}
                blurDataURL={scene.blurDataURL}
                className="object-cover"
              />
            </div>
          </div>
        ))}

        <div aria-hidden className="scrim absolute inset-0" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(110%_80%_at_78%_20%,transparent_20%,rgba(4,20,29,0.62)_100%)]"
        />
        <div aria-hidden className="grain-overlay" />

        {/* Chapter copy */}
        <div className="relative flex h-full items-end">
          <div className="mx-auto w-full max-w-[92rem] px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-gold-400/70" />
              <p className="text-eyebrow uppercase text-gold-300">{eyebrow}</p>
            </div>

            <h2 className="text-display-md mt-5 max-w-[20ch] text-sand-50">
              {title}
            </h2>

            {/* Height is reserved for the longest chapter so the progress row
                below never moves as chapters change. */}
            <div className="relative mt-8 min-h-[19rem] max-w-[42rem] sm:min-h-[15rem] lg:min-h-[13rem]">
              {scenes.map((scene, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute inset-0 ease-luxe",
                    // The outgoing chapter clears fast and the incoming one
                    // waits for it. Fading both over the same 700ms left two
                    // chapters legible at once, which read as a printing error
                    // rather than a crossfade.
                    i === active
                      ? "opacity-100 transition-opacity delay-300 duration-500"
                      : "pointer-events-none opacity-0 transition-opacity delay-0 duration-200",
                  )}
                  aria-hidden={i !== active}
                >
                  <p className="text-eyebrow uppercase text-sand-200/60">
                    {pad(i + 1)} / {pad(scenes.length)} — {scene.label}
                  </p>
                  <SplitLines
                    as="p"
                    text={scene.text}
                    active={i === active}
                    stagger={0.045}
                    duration={0.95}
                    className="text-body-lg mt-4 text-sand-50"
                  />
                </div>
              ))}
            </div>

            {/* Chapter progress */}
            <div className="mt-10 flex items-center gap-2">
              {scenes.map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={cn(
                    "h-px transition-all duration-700 ease-luxe",
                    i === active ? "w-12 bg-gold-400" : "w-6 bg-sand-100/25",
                  )}
                />
              ))}
              <Link
                href={href}
                className="ml-6 inline-flex items-center gap-3 text-eyebrow uppercase text-sand-100/80 transition-colors duration-300 hover:text-gold-300"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
