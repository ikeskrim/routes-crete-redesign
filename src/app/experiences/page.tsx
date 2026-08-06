import type { Metadata } from "next";

import { FeaturedFrame } from "@/components/sections/FeaturedFrame";
import { ContentCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SplitLines } from "@/components/ui/SplitLines";
import { getExperiences, getSite } from "@/lib/content";

/** The most arresting frame on the site. Capped at 1024px, so it is shown at
 *  its native size rather than stretched. */
const FEATURED_SRC =
  "/images/experiences/kourtaliotis-temple-of-nature/ku953-dsc05531.jpg";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Experiences",
    description: site.meta.description,
    alternates: { canonical: "/experiences" },
    openGraph: {
      title: `Experiences | ${site.brand.name}`,
      description: site.meta.description,
      url: "/experiences",
    },
  };
}

export default function ExperiencesPage() {
  const experiences = getExperiences();
  const featuredOwner = experiences.find((e) =>
    e.gallery.some((g) => g.src === FEATURED_SRC),
  );
  const featured = featuredOwner
    ? { src: FEATURED_SRC, href: featuredOwner.href }
    : null;

  return (
    <>
      <section className="bg-shell pt-40 pb-section text-ink lg:pt-52">
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-600/60" />
            <p className="text-eyebrow uppercase text-rock-500">
              {experiences.length} {experiences.length === 1 ? "route" : "routes"}
            </p>
          </div>

          <SplitLines
            as="h1"
            text="Experiences"
            className="mt-6 text-display-xl text-ink"
          />

          <p className="text-body-lg mt-8 max-w-[46rem] text-rock-600">
            Leave the sea behind for a day and travel into the mountains, the
            gorges and the villages of Crete.
          </p>
        </div>
      </section>

      <section className="bg-shell pb-section-lg">
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          {experiences.length === 0 ? (
            <EmptyState
              eyebrow="Experiences"
              title="New routes are being prepared"
              body="Nothing is listed here just yet. Tell us what you'd like to see on the island and we'll put a route together."
              action={{ label: "Contact us", href: "/contact" }}
            />
          ) : (
            <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2">
              {experiences.map((experience, i) => (
                <ContentCard
                  key={experience.slug}
                  item={experience}
                  index={i + 1}
                  priority={i === 0}
                  className={i % 2 === 1 ? "sm:mt-28" : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* A single frame, given room. */}
      {featured && (
        <section className="bg-sand-50 py-section-lg">
          <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
            <FeaturedFrame
              src={featured.src}
              href={featured.href}
              caption="Following the river’s path, visitors continue through a unique natural environment that eventually leads to the lagoon and palm forest of Preveli, where the river meets the Libyan Sea."
              credit="Kourtaliotis — The Temple of Nature"
            />
          </div>
        </section>
      )}
    </>
  );
}
