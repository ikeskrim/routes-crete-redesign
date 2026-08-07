import Image from "next/image";

import { SplitLines } from "@/components/ui/SplitLines";
import { Reveal } from "@/components/ui/Reveal";
import { cn, pad } from "@/lib/utils";

/* Graded derivatives produced by qa/grade.ps1 — same five verified
   photographs, two moods. */
const img = (grade: string, name: string) =>
  `/images/graded/${grade}/sourced/${name}.jpg`;

export const VARIANTS = {
  a: {
    name: "A — Nocturne",
    grade: "a",
    ground: "bg-ocean-950",
    ink: "text-sand-50",
    muted: "text-sand-200/70",
    rule: "bg-sand-100/20",
    accent: "text-gold-300",
    accentRule: "bg-gold-400/70",
    panel: "bg-ocean-900",
    // Editorial cinema: one relentless dark field, light used as a cut.
    sectionTwo: "bg-ocean-900 text-sand-50",
    cardMeta: "text-sand-200/60",
    eyebrow: "Rethymno · Crete",
    headline: "The Crete that doesn’t appear on the schedule.",
    sub: "Private, small-group journeys into the gorges and mountain villages of Rethymno. Twelve seats. Booked by conversation, not by cart.",
    cta: "Plan your day",
    scenePullQuote:
      "You follow a river the whole way down. It ends where it meets the Libyan Sea, under a forest of palms.",
    heroImage: "gorge-saint-nicholas-aerial",
    proofImage: "kourtaliotis-gorge-aerial",
    sceneImage: "kourtaliotis-river",
  },
  b: {
    name: "B — Sunbleached",
    grade: "b",
    ground: "bg-sand-50",
    ink: "text-ink",
    muted: "text-rock-500",
    rule: "bg-ink/15",
    accent: "text-gold-600",
    accentRule: "bg-gold-600/60",
    panel: "bg-shell",
    // Quiet luxury: warm paper, dark used once, as a held breath.
    sectionTwo: "bg-shell text-ink",
    cardMeta: "text-rock-500",
    eyebrow: "Rethymno · Crete",
    headline: "A slower way to see Crete.",
    sub: "Private, family-run journeys through Rethymno’s gorges, villages and olive country. Twelve seats. One family. No schedule but yours.",
    cta: "Plan your day",
    scenePullQuote:
      "Twelve seats, one day, and a gorge most people only ever see from the road above.",
    heroImage: "gorge-saint-nicholas-aerial",
    proofImage: "kourtaliotis-gorge-aerial",
    sceneImage: "kourtaliotis-river",
  },
} as const;

const JOURNEYS = [
  {
    title: "Kourtaliotis — The Temple of Nature",
    meta: "Full day · Rethymno · 12 seats",
    image: "preveli-palm-beach-aerial",
  },
  {
    title: "The Heart of Cretan Tradition",
    meta: "Day trip · Central Crete · 12 seats",
    image: "preveli-monastery",
  },
] as const;

export function DesignDraft({ variant }: { variant: keyof typeof VARIANTS }) {
  const v = VARIANTS[variant];

  return (
    <>
      {/* ---------------------------------------------------------- HERO */}
      <section
        data-hero
        data-hero-tone={variant === "a" ? "dark" : "light"}
        className={cn(
          "grain relative flex h-[100svh] min-h-[34rem] items-end overflow-hidden",
          v.ground,
        )}
      >
        <div className="ken-burns absolute inset-[-4%]">
          <Image
            src={img(v.grade, v.heroImage)}
            alt=""
            fill
            priority
            quality={72}
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div aria-hidden className={variant === "a" ? "scrim absolute inset-0" : "absolute inset-0 bg-gradient-to-t from-sand-50 via-sand-50/72 to-sand-50/10"} />
        <div aria-hidden className="grain-overlay" />

        <div className="relative mx-auto w-full max-w-[92rem] px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24">
          <div className="flex items-center gap-4">
            <span aria-hidden className={cn("h-px w-10", v.accentRule)} />
            <p className={cn("text-eyebrow uppercase", v.accent)}>{v.eyebrow}</p>
          </div>

          <SplitLines
            as="h1"
            text={v.headline}
            onMount
            delay={0.25}
            stagger={0.1}
            duration={1.2}
            className={cn(
              "mt-7 max-w-[16ch] text-display-2xl",
              variant === "a" ? "text-sand-50" : "text-ink",
            )}
          />

          <div className="mt-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <p
              className={cn(
                "text-body max-w-[42ch]",
                variant === "a" ? "text-sand-100/75" : "text-ink/70",
              )}
            >
              {v.sub}
            </p>

            {/* One primary CTA. The old second button is a text link now. */}
            <div className="flex flex-wrap items-center gap-6">
              <span
                className={cn(
                  "inline-flex h-14 items-center rounded-pill px-9 font-display text-[0.8125rem] font-medium uppercase tracking-[0.16em]",
                  variant === "a"
                    ? "bg-sand-50 text-ocean-950"
                    : "bg-ocean-950 text-sand-50",
                )}
              >
                {v.cta}
              </span>
              <span
                className={cn(
                  "text-eyebrow uppercase underline decoration-1 underline-offset-8",
                  variant === "a" ? "text-sand-100/75" : "text-ink/60",
                )}
              >
                See the journeys
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- PROOF */}
      <section className={cn("relative h-[78vh] overflow-hidden", v.ground)}>
        <Image
          src={img(v.grade, v.proofImage)}
          alt=""
          fill
          quality={72}
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className={
            variant === "a"
              ? "scrim-soft absolute inset-0"
              : "absolute inset-0 bg-gradient-to-t from-sand-50/85 to-transparent"
          }
        />
        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[92rem] px-6 pb-14 sm:px-8 lg:px-12">
          <p
            className={cn(
              "text-display-md max-w-[20ch]",
              variant === "a" ? "text-sand-50" : "text-ink",
            )}
          >
            We know the roads, the stories, the people.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------ JOURNEYS */}
      <section className={cn("py-section-lg", v.sectionTwo)}>
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className={cn("h-px w-10", v.accentRule)} />
            <p className={cn("text-eyebrow uppercase", v.muted)}>The journeys</p>
          </div>

          <SplitLines
            as="h2"
            text="Two journeys. Both take a day. Neither takes a crowd."
            className={cn("mt-6 max-w-[18ch] text-display-lg", v.ink)}
          />

          <div className="mt-16 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:mt-24">
            {JOURNEYS.map((j, i) => (
              <Reveal key={j.title} delay={i * 0.08}>
                <div className={cn(i === 1 && "sm:mt-24")}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-media">
                    <Image
                      src={img(v.grade, j.image)}
                      alt={j.title}
                      fill
                      quality={72}
                      sizes="(max-width: 768px) 100vw, 46vw"
                      className="object-cover"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-6 left-6 font-display text-eyebrow tabular-nums",
                        variant === "a" ? "text-sand-100/80" : "text-sand-50/90",
                      )}
                    >
                      {pad(i + 1)}
                    </span>
                  </div>
                  <h3 className={cn("text-heading-lg mt-6 max-w-[20ch]", v.ink)}>
                    {j.title}
                  </h3>
                  <p className={cn("text-caption mt-3", v.cardMeta)}>{j.meta}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------- DARK SCENE EXCERPT */}
      <section className="grain relative flex h-[100svh] items-end overflow-hidden bg-ocean-950">
        <div className="absolute inset-[-4%]">
          <Image
            src={img(v.grade, v.sceneImage)}
            alt=""
            fill
            quality={72}
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div aria-hidden className="scrim absolute inset-0" />
        <div aria-hidden className="grain-overlay" />

        <div className="relative mx-auto w-full max-w-[92rem] px-6 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-400/70" />
            <p className="text-eyebrow uppercase text-gold-300">
              01 / 05 — The journal
            </p>
          </div>
          <SplitLines
            as="p"
            text={v.scenePullQuote}
            className="text-display-md mt-6 max-w-[24ch] text-sand-50"
          />

          <div className="mt-10 flex items-center gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                aria-hidden
                className={cn("h-px", i === 0 ? "w-12 bg-gold-400" : "w-6 bg-sand-100/25")}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Label so the captures are self-identifying */}
      <div className={cn("px-6 py-10 text-center", v.ground)}>
        <p className={cn("text-eyebrow uppercase", v.muted)}>
          Direction draft {v.name}
        </p>
      </div>
    </>
  );
}
