import type { Metadata } from "next";

import { ContentCard } from "@/components/ui/Card";
import { SplitLines } from "@/components/ui/SplitLines";
import { getExperiences, getSite } from "@/lib/content";

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
        </div>
      </section>
    </>
  );
}
