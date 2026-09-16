import type { ReactNode } from "react";

import { Hero } from "@/components/sections/Hero";
import { HowToBook } from "@/components/sections/HowToBook";
import { Journeys } from "@/components/sections/HorizontalJourneys";
import { LocationsMap } from "@/components/sections/LocationsMap";
import { Positioning } from "@/components/sections/Positioning";
import { SignatureScene, type Scene } from "@/components/sections/SignatureScene";
import { Caption } from "@/components/ui/Caption";
import { Marquee } from "@/components/ui/Marquee";
import { PlateBand } from "@/components/ui/Plate";
import { StackedPanels } from "@/components/ui/StackedPanels";
import {
  graded,
  getExperiences,
  getMappableLocations,
  getSignatureExperience,
  getSite,
  getTransfers,
} from "@/lib/content";
import { GRADE } from "@/lib/edition";
import { getPlaceImages } from "@/lib/place-images";

/**
 * The homepage: one issue of the magazine, in five movements (C+ SPEC §D.4).
 *
 *   cover                 — the printed cover (no folio)
 *   I   #positioning      — the statement, evidenced by the why-us rows
 *   II  #experiences      — the journeys index and the island map
 *   III #signature        — the signature journey as a photo essay
 *   IV  #how-to-book      — booking, handing over to the back cover
 *
 * The team movement came out on the client's instruction (2026-09-11). Its
 * names, roles and intro are kept in content/site.json → team, its
 * photographs are retired to assets-src/retired/team/ and no longer served,
 * and the legacy #team anchor now lands on the positioning statement — the
 * section that says who runs this.
 *
 * Two bands sit BETWEEN movements and are `div`s, not sections: the marquee
 * strap after I, and the golden band after III. They carry no heading and make
 * no argument.
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

  /* Chapters reference paragraphs by index so the essay can never drift from
     the verbatim source text. */
  const scenes: Scene[] =
    signature?.scenes?.map((scene) => ({
      label: scene.label,
      text: signature.body[scene.bodyIndex]?.text ?? "",
      image: scene.image,
    })) ?? [];

  /* A real photograph for the places we can honestly show one of. Each is
     licence-verified and credited on /credits; the alt text says only what the
     photograph actually depicts. Locations with no honest match — the cave,
     the unnamed "historic village", the airports — simply have no preview
     rather than borrowing a lookalike. Each preview's caption is the same
     line plus its ledger credit, rendered here on the server. */
  const locationImages = getPlaceImages();
  const locationCaptions: Record<string, ReactNode> = {};
  for (const [key, image] of Object.entries(locationImages)) {
    locationCaptions[key] = <Caption file={image.src} place={image.alt} />;
  }

  const locationLinks: Record<string, string> = {};
  for (const item of [...experiences, ...transfers]) {
    for (const key of item.locations) locationLinks[key] ??= item.href;
  }

  /* One index, both collections, in a deliberate order: the experiences
     first, transfers last, because a transfer is how you reach a journey
     rather than the reason for one. Adding items to either collection
     extends the index with no code change. */
  const journeys = [...experiences, ...transfers];

  /* One operator photograph beside each why-us statement. */
  const whyUsImages = [
    signature?.gallery[4]?.src,
    experiences[0]?.gallery[6]?.src,
    signature?.gallery[9]?.src,
  ];

  return (
    <>
      {/* Cover. The plate is `hero.backgroundImage`; its caption and alt
          follow the ledger record of whichever frame that is. */}
      <Hero
        eyebrow={site.hero.eyebrow}
        heading={site.hero.subheading}
        subheading={site.hero.sub ?? site.meta.description}
        image={graded(site.hero.backgroundImage)}
        primaryCta={{ label: "Explore Experiences", href: "/experiences" }}
        secondaryCta={{ label: "Book Now", href: "/contact" }}
      />

      {/* Seams (C+ SPEC §0.4 C2): the cover's paper runs straight into the
          positioning spread's paper, with no seam element between them. */}

      {/* I — the positioning statement, and the rows that evidence it. */}
      <Positioning
        eyebrow={site.positioning.eyebrow}
        statement={site.positioning.statement}
        body={site.positioning.body}
        attributes={site.positioning.attributes}
      >
        {/* Inside the section, not after it: stating the case and evidencing
            it are one movement. #why-us stays on the rows so the legacy
            anchor still lands on them. */}
        <StackedPanels
          id="why-us"
          panels={site.whyUs.map((block, i) => ({
            eyebrow: block.title,
            // The short statement line; the full original copy stays in
            // `text` for any other presentation of this block.
            statement: block.statement ?? block.text.split(/\r?\n/)[0],
            image: whyUsImages[i],
          }))}
        />
      </Positioning>

      {/* The marquee strap: an olive band between movements. Every claim in
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

      {/* II — the journeys. Experiences and transfers in one index; the
          transfer's entry owns #transfers. The island map folds in below it:
          a map of where these journeys go belongs with the journeys. */}
      <Journeys
        eyebrow={`${site.sections.experiences.heading} & ${site.sections.transfers.heading}`}
        heading="Journeys into the unknown side of the island"
        items={journeys}
        map={
          locations.length > 0
            ? {
                heading: "Where these journeys take you",
                chart: (
                  <LocationsMap
                    locations={locations}
                    links={locationLinks}
                    images={locationImages}
                    captions={locationCaptions}
                  />
                ),
              }
            : undefined
        }
      />

      {/* III — the signature journey, told as a photo essay. */}
      {signature && scenes.length > 0 && (
        <SignatureScene
          eyebrow="The signature journey"
          title={signature.title}
          scenes={scenes}
          href={signature.href}
        />
      )}

      {/* The golden band, after the essay and before IV: a ledgered mood
          frame no content file references, so its graded path is written
          with the live grade letter. The car is cropped out at every width. */}
      <PlateBand kind="bridge" src={`/images/graded/${GRADE}/stock-local/pexels-27015910.jpg`} />

      {/* IV — how to book. Seams (C2): #signature night → golden band paper
          → #how-to-book bone → back cover night, all straight edges with no
          seam element; the back cover opens on its own night ground. */}
      <HowToBook
        heading={site.sections.howToBook.heading}
        subheading={site.sections.howToBook.subheading}
        steps={site.howToBook.steps}
        responsePromise={site.howToBook.responsePromise}
      />
    </>
  );
}
