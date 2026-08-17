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
import { TransferSpotlight } from "@/components/sections/TransferSpotlight";
import { Marquee } from "@/components/ui/Marquee";
import { StackedPanels } from "@/components/ui/StackedPanels";
import { Bridge } from "@/components/ui/Cinematic";
import { ContentCard } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import {
  getBlur,
  getExperiences,
  getMappableLocations,
  getSignatureExperience,
  getSite,
  getTransfers,
} from "@/lib/content";

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
      <Hero
        eyebrow={site.hero.eyebrow}
        heading={site.hero.subheading}
        subheading={site.meta.description}
        image={site.hero.backgroundImage}
        blurDataURL={getBlur(site.hero.backgroundImage)}
        primaryCta={{ label: "Explore Experiences", href: "/experiences" }}
        secondaryCta={{ label: "Book Now", href: "/contact" }}
      />

      {/* 02 — The positioning statement, said once and early. */}
      <Positioning
        eyebrow={site.positioning.eyebrow}
        statement={site.positioning.statement}
        body={site.positioning.body}
        attributes={site.positioning.attributes}
      />

      {/* 03 — The Journeys.
          Experiences and Transfers were two near-identical grids one after the
          other. They are one grid now, and it scales with the content: adding
          an experience or a transfer changes nothing here.

          Both legacy anchors stay alive — #experiences on the section, and
          #transfers on the transfers group inside it — so the printed material
          and old inbound links still land somewhere correct. */}
      <section
        id="experiences"
        aria-labelledby="journeys-heading"
        className="bg-shell py-section-lg text-ink"
      >
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-600/60" />
            <p className="text-eyebrow uppercase text-rock-500">
              {site.sections.experiences.heading} &amp; {site.sections.transfers.heading}
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
                className={i % 2 === 1 ? "sm:mt-28" : undefined}
                ratio="aspect-[4/5]"
              />
            ))}
          </div>

          <span id="transfers" className="sr-only">
            {site.sections.transfers.subheading}
          </span>
        </div>
      </section>

      {/* Marquee — a dark band between the light sections. Every claim in
          it is literally true: private, family-run, 12 seats, licensed. */}
      <Marquee
        items={[
          "Private journeys",
          "Twelve seats",
          "Family-run",
          "Rethymno · Crete",
          "Booked by conversation",
        ]}
      />

      {/* Cinematic bridge into the signature journey */}
      {bridge && (
        <Bridge
          src={bridge.src}
          alt=""
          blurDataURL={getBlur(bridge.src)}
          caption={signature?.subtitle ?? undefined}
        />
      )}

      {/* 04 — The signature journey, told as a pinned film */}
      {signature && scenes.length > 0 && (
        <SignatureScene
          eyebrow="The signature journey"
          title={signature.title}
          scenes={scenes}
          href={signature.href}
        />
      )}

      {/* Why Routes Crete, as a scene that holds while it transitions.
          The three value blocks keep their copy; only the presentation
          changes from a static trio to punctuation on a dark ground. */}
      <StackedPanels
        id="why-us"
        panels={site.whyUs.map((block, i) => ({
          eyebrow: block.title,
          // Short punctuation line; the full original copy stays available in
          // `text` and is what any non-scene presentation of this block uses.
          statement: block.statement ?? block.text.split(/\r?\n/)[0],
          detail: undefined,
          image: whyUsImages[i],
          blurDataURL: whyUsImages[i] ? getBlur(whyUsImages[i]) : undefined,
        }))}
      />

      {/* The route, from real coordinates */}
      <section
        aria-labelledby="map-heading"
        className="grain relative bg-ocean-950 py-section-lg text-sand-50"
      >
        <div aria-hidden className="grain-overlay" />
        <div className="relative mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-400/70" />
            <p className="text-eyebrow uppercase text-sand-200/60">The island</p>
          </div>

          <SplitLines
            as="h2"
            text="Where these journeys take you"
            className="text-display-lg mt-6 max-w-[16ch] text-sand-50"
          />

          <Reveal delay={0.1}>
            <div className="mt-14 lg:mt-20">
              <LocationsMap locations={locations} links={locationLinks} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* VIP transfers */}
      {transfers[0] && <TransferSpotlight item={transfers[0]} />}

      {/* 05 — How to book */}
      <HowToBook
        heading={site.sections.howToBook.heading}
        subheading={site.sections.howToBook.subheading}
        steps={site.howToBook.steps}
        responsePromise={site.howToBook.responsePromise}
      />

      {/* 06 — Team */}
      <Team
        heading={site.sections.team.heading}
        subheading={site.sections.team.subheading}
        intro={site.team.intro}
        members={site.team.members}
      />

      {/* The 52-image homepage gallery is gone. Every frame still exists —
          curated selections live on the experience pages, where someone
          looking at a specific journey actually wants them. Nothing was
          deleted from the content. */}
    </>
  );
}
