import { Hero } from "@/components/sections/Hero";
import { Gallery } from "@/components/sections/Gallery";
import { HowToBook } from "@/components/sections/HowToBook";
import { LocationsMap } from "@/components/sections/LocationsMap";
import { SignatureScene, type Scene } from "@/components/sections/SignatureScene";
import { Team } from "@/components/sections/Team";
import { TransferSpotlight } from "@/components/sections/TransferSpotlight";
import { WhyUs } from "@/components/sections/WhyUs";
import { Bridge } from "@/components/ui/Cinematic";
import { ContentCard } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import {
  getBlur,
  getBlurMap,
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
  const blurMap = getBlurMap();

  /* Chapters reference paragraphs by index so the storytelling scene can never
     drift from the verbatim source text. */
  const scenes: Scene[] =
    signature?.scenes?.map((scene) => ({
      label: scene.label,
      text: signature.body[scene.bodyIndex]?.text ?? "",
      image: scene.image,
      blurDataURL: getBlur(scene.image),
    })) ?? [];

  /* Every photograph from every collection, for the closing gallery. */
  const galleryImages = [...experiences, ...transfers].flatMap((item) =>
    item.gallery.map((image) => ({ ...image, alt: item.title })),
  );

  const locationLinks: Record<string, string> = {};
  for (const item of [...experiences, ...transfers]) {
    for (const key of item.locations) locationLinks[key] ??= item.href;
  }

  const bridge = signature?.gallery[1] ?? experiences[0]?.gallery[0];

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

      {/* 01 — Experiences */}
      <section
        id="experiences"
        aria-labelledby="experiences-heading"
        className="bg-shell py-section-lg text-ink"
      >
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-600/60" />
            <p className="text-eyebrow uppercase text-rock-500">
              {site.sections.experiences.heading}
            </p>
          </div>

          <SplitLines
            as="h2"
            text="Journeys into the unknown side of the island"
            className="text-display-lg mt-6 max-w-[15ch] text-ink"
          />

          <div className="mt-16 grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:mt-24">
            {experiences.map((experience, i) => (
              <ContentCard
                key={experience.slug}
                item={experience}
                index={i + 1}
                className={i % 2 === 1 ? "sm:mt-28" : undefined}
                ratio="aspect-[4/5]"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Cinematic bridge into the signature journey */}
      {bridge && (
        <Bridge
          src={bridge.src}
          alt=""
          blurDataURL={getBlur(bridge.src)}
          caption={signature?.subtitle ?? undefined}
        />
      )}

      {/* 02 — The signature journey, told as a pinned film */}
      {signature && scenes.length > 0 && (
        <SignatureScene
          eyebrow="The signature journey"
          title={signature.title}
          scenes={scenes}
          href={signature.href}
        />
      )}

      {/* 03 — Why Routes Crete */}
      <WhyUs
        heading="We know the roads, the stories, the people"
        blocks={site.whyUs}
      />

      {/* 04 — The route, from real coordinates */}
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

      {/* 05 — VIP transfers */}
      {transfers[0] && <TransferSpotlight item={transfers[0]} />}

      {/* 06 — How to book */}
      <HowToBook
        heading={site.sections.howToBook.heading}
        subheading={site.sections.howToBook.subheading}
        steps={site.howToBook.steps}
      />

      {/* 07 — Team */}
      <Team
        heading={site.sections.team.heading}
        subheading={site.sections.team.subheading}
        intro={site.team.intro}
        members={site.team.members}
      />

      {/* 08 — Gallery */}
      <section
        id="gallery"
        aria-labelledby="gallery-heading"
        className="bg-sand-50 py-section-lg text-ink"
      >
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-600/60" />
            <p className="text-eyebrow uppercase text-rock-500">Gallery</p>
          </div>

          <SplitLines
            as="h2"
            text="Every frame, from the road"
            className="text-display-lg mt-6 max-w-[14ch] text-ink"
          />

          <div className="mt-14 lg:mt-20">
            <Gallery images={galleryImages} blurMap={blurMap} />
          </div>
        </div>
      </section>
    </>
  );
}
