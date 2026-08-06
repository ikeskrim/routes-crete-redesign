import { Hero } from "@/components/sections/Hero";
import { ContentCard } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getBlur, getExperiences, getSite, getTransfers } from "@/lib/content";

export default function HomePage() {
  const site = getSite();
  const experiences = getExperiences();
  const transfers = getTransfers();

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

      <Section
        id="experiences"
        tone="shell"
        space="lg"
        width="wide"
        aria-labelledby="experiences-heading"
      >
        <SectionHeading
          index={1}
          eyebrow="Journeys"
          title={site.sections.experiences.heading}
          id="experiences-heading"
        />

        <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:mt-24">
          {experiences.map((experience, i) => (
            <Reveal key={experience.slug} delay={i * 0.08}>
              <ContentCard
                item={experience}
                index={i + 1}
                className={i % 2 === 1 ? "sm:mt-24" : undefined}
              />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section
        id="transfers"
        tone="sand"
        space="lg"
        width="wide"
        aria-labelledby="transfers-heading"
      >
        <SectionHeading
          index={2}
          eyebrow="Arrivals & departures"
          title={site.sections.transfers.heading}
          subtitle={site.sections.transfers.subheading}
          id="transfers-heading"
        />

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:mt-24">
          {transfers.map((transfer, i) => (
            <Reveal key={transfer.slug} delay={i * 0.08}>
              <ContentCard
                item={transfer}
                index={i + 1}
                ratio="aspect-[3/2]"
                sizes="(max-width: 768px) 100vw, 46vw"
              />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
