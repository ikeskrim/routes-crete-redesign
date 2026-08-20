import dynamic from "next/dynamic";

import { Hero } from "@/components/sections/Hero";
import { HowToBook } from "@/components/sections/HowToBook";
import { Positioning } from "@/components/sections/Positioning";
import { LocationsMap } from "@/components/sections/LocationsMap";
import type { Scene } from "@/components/sections/SignatureScene";

/**
 * GSAP + ScrollTrigger are only ever used by the pinned scene, and the scene
 * sits well below the fold — so its client chunk is split out and fetched
 * after first paint instead of riding in the initial bundle.
 *
 * SSR stays on deliberately: the scene renders verbatim story paragraphs, and
 * dropping them from the server HTML would cost content parity and SEO to buy
 * a synthetic score. Only the JavaScript is deferred, never the words.
 */
const SignatureScene = dynamic(() =>
  import("@/components/sections/SignatureScene").then((m) => m.SignatureScene),
);
import { Team } from "@/components/sections/Team";
import { Marquee } from "@/components/ui/Marquee";
import { StackedPanels } from "@/components/ui/StackedPanels";
import { Bridge } from "@/components/ui/Cinematic";
import { ContentCard } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { SceneEdge } from "@/components/ui/SceneEdge";
import { SplitLines } from "@/components/ui/SplitLines";
import {
  getBlur,
  graded,
  getExperiences,
  getMappableLocations,
  getSignatureExperience,
  getSite,
  getTransfers,
} from "@/lib/content";

/**
 * The homepage, in six movements:
 *
 *   1 Hero
 *   2 Positioning        — the statement, evidenced by the stacked why-us scene
 *   3 The Journeys       — experiences + transfers in one grid, with the map
 *   4 The signature journey
 *   5 How it works
 *   6 The team, handing over to the footer-as-destination
 *
 * The marquee and the cinematic bridge are bands BETWEEN movements, not
 * movements themselves — they carry no heading and make no argument.
 *
 * `qa/arc-guard.mts` asserts this list, in this order, against the rendered
 * page. An earlier restructure was reported as six sections and shipped as
 * nine, because the claim came from the diff rather than from the page.
 */
export default function HomePage() {
  const site = getSite();
  const experiences = getExperiences();
  const transfers = getTransfers();
  const signature = getSignatureExperience();
  const locations = getMappableLocations();

  /* Chapters reference paragraphs by index so the storytelling scene can never
     drift from the verbatim source text. */
  const scenes: Scene[] =
    signature?.scenes?.map((scene) => ({
      label: scene.label,
      text: signature.body[scene.bodyIndex]?.text ?? "",
      image: scene.image,
      blurDataURL: getBlur(scene.image),
    })) ?? [];

  /* A real photograph for the places we can honestly show one of. Each is
     licence-verified and credited on /credits; the alt text says only what the
     photograph actually depicts. Locations with no honest match — the cave,
     the unnamed "historic village", the airports — simply have no preview
     rather than borrowing a lookalike. */
  const locationImages: Record<string, { src: string; alt: string; blurDataURL?: string }> = {};
  for (const [key, file, alt] of [
    ["rethymno-town", "rethymno-harbour-mountains", "Rethymno harbour, with the snow-covered mountains behind it"],
    ["kourtaliotis-gorge", "kourtaliotiko-waterfall", "The waterfall in Kourtaliotiko Gorge"],
    ["preveli-lagoon", "preveli-palms-aerial", "The palm forest along the river at Preveli"],
    ["preveli-monastery", "preveli-monastery", "Preveli Monastery"],
    ["mountain-village", "anogeia-village", "The mountain village of Anogeia"],
  ] as const) {
    const src = graded(`/images/sourced/${file}.jpg`);
    locationImages[key] = { src, alt, blurDataURL: getBlur(src) };
  }

  const locationLinks: Record<string, string> = {};
  for (const item of [...experiences, ...transfers]) {
    for (const key of item.locations) locationLinks[key] ??= item.href;
  }

  /* One grid, both collections, in a deliberate order: the experiences first,
     transfers last, because a transfer is how you reach a journey rather than
     the reason for one. Adding items to either collection extends the grid
     with no code change. */
  const journeys = [...experiences, ...transfers];

  const bridge = signature?.gallery[1] ?? experiences[0]?.gallery[0];

  /* One real photograph behind each Why-Us panel, so the scene is never
     fully still and never generic. */
  const whyUsImages = [
    signature?.gallery[4]?.src,
    experiences[0]?.gallery[6]?.src,
    signature?.gallery[9]?.src,
  ].filter(Boolean) as string[];

  return (
    <>
      {/* 01 */}
      <Hero
        eyebrow={site.hero.eyebrow}
        heading={site.hero.subheading}
        subheading={site.hero.sub ?? site.meta.description}
        image={site.hero.backgroundImage}
        blurDataURL={getBlur(site.hero.backgroundImage)}
        primaryCta={{ label: "Explore Experiences", href: "/experiences" }}
        secondaryCta={{ label: "Book Now", href: "/contact" }}
      />

      {/* The hero dissolves into the positioning statement rather than
          meeting it on a ruled line. */}
      <SceneEdge to="bg-shell" />

      {/* 02 — the positioning statement, and the panels that evidence it. */}
      <Positioning
        eyebrow={site.positioning.eyebrow}
        statement={site.positioning.statement}
        body={site.positioning.body}
        attributes={site.positioning.attributes}
      >
        {/* Inside the section, not after it: stating the case and evidencing
            it are one movement. #why-us stays on the scene so the legacy
            anchor still lands on the panels themselves. */}
        <StackedPanels
          id="why-us"
          panels={site.whyUs.map((block, i) => ({
            eyebrow: block.title,
            // Short punctuation line; the full original copy stays in `text`
            // and is what any non-scene presentation of this block uses.
            statement: block.statement ?? block.text.split(/\r?\n/)[0],
            detail: undefined,
            image: whyUsImages[i],
            blurDataURL: whyUsImages[i] ? getBlur(whyUsImages[i]) : undefined,
          }))}
        />
      </Positioning>

      {/* Marquee — a dark band between movements. Every claim in it is
          literally true: private, family-run, 12 seats, licensed. */}
      <Marquee
        items={[
          "Private journeys",
          "Twelve seats",
          "Family-run",
          "Rethymno · Crete",
          "Booked by conversation",
        ]}
      />

      {/* 03 — The Journeys.
          Experiences and Transfers were two near-identical grids one after the
          other, and a VIP-transfer spotlight below them restated the transfers
          item a third time. One grid now, scaling with the content.

          #experiences lives on this section. #transfers is deliberately NOT
          duplicated here — it belongs to the transfers item's own page, which
          the card links to. One id, one owner. */}
      <section
        id="experiences"
        aria-labelledby="journeys-heading"
        className="sand bg-shell py-section-lg text-ink"
      >
        <div aria-hidden className="sand-wash" />
        <div aria-hidden className="sand-overlay" />
        <div className="relative mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-600/60" />
            <p className="text-eyebrow uppercase text-rock-500">
              {site.sections.experiences.heading} &amp;{" "}
              {site.sections.transfers.heading}
            </p>
          </div>

          <SplitLines
            as="h2"
            text="Journeys into the unknown side of the island"
            className="text-display-lg mt-6 max-w-[15ch] text-ink"
          />

          <div className="mt-16 grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:mt-24">
            {journeys.map((item, i) => (
              <ContentCard
                key={item.href}
                item={item}
                index={i + 1}
                /* The transfers card owns #transfers now. legacyAnchorMap
                   points #portfolio1 at it, and cutting the spotlight must
                   not leave that link pointing at nothing. */
                id={item.href.startsWith("/transfers") ? "transfers" : undefined}
                className={i % 2 === 1 ? "sm:mt-28" : undefined}
                ratio="aspect-[4/5]"
              />
            ))}
          </div>

          {/* The island map, folded in from what used to be a section of its
              own. Every pin and every link is unchanged — a map of where these
              journeys go belongs with the journeys. */}
          <Reveal delay={0.1}>
            <div className="mt-24 border-t border-ink/10 pt-16 lg:mt-32">
              <h3 className="text-heading-lg max-w-[18ch] text-ink">
                Where these journeys take you
              </h3>
              <div className="mt-12">
                <LocationsMap
                  locations={locations}
                  links={locationLinks}
                  images={locationImages}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Cinematic bridge into the signature journey — a band, not a movement. */}
      {bridge && (
        <Bridge
          src={bridge.src}
          alt=""
          blurDataURL={getBlur(bridge.src)}
          caption={signature?.subtitle ?? undefined}
        />
      )}

      {/* 04 — The signature journey, told as a pinned film. */}
      {signature && scenes.length > 0 && (
        <SignatureScene
          eyebrow="The signature journey"
          title={signature.title}
          scenes={scenes}
          href={signature.href}
        />
      )}

      {/* 05 — How to book. */}
      <HowToBook
        heading={site.sections.howToBook.heading}
        subheading={site.sections.howToBook.subheading}
        steps={site.howToBook.steps}
        responsePromise={site.howToBook.responsePromise}
      />

      {/* Dark how-it-works dissolves into the light team movement. */}
      <SceneEdge to="bg-shell" />

      {/* 06 — The team, which hands over to the footer-as-destination. */}
      <Team
        heading={site.sections.team.heading}
        subheading={site.sections.team.subheading}
        intro={site.team.intro}
        members={site.team.members}
      />
    </>
  );
}
