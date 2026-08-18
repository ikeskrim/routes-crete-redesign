import type { Metadata } from "next";

import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import { getPhotoCredits, getSite } from "@/lib/content";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Photography credits",
    description:
      "Where the photographs on this site come from: the places we photographed ourselves, and the licensed images we did not, with their authors and licences.",
    alternates: { canonical: "/credits" },
    openGraph: {
      title: `Photography credits | ${site.brand.name}`,
      description: site.meta.description,
      url: "/credits",
    },
  };
}

export default function CreditsPage() {
  const { photographs, verifiedOn } = getPhotoCredits();

  return (
    <>
      <section className="grain relative bg-ocean-950 pt-40 pb-section text-sand-50 lg:pt-52">
        <div aria-hidden className="grain-overlay" />
        <div className="relative mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-400/70" />
            <p className="text-eyebrow uppercase text-sand-200/60">Credits</p>
          </div>

          <SplitLines
            as="h1"
            text="Where these photographs come from"
            className="mt-6 max-w-[16ch] text-display-xl text-sand-50"
          />

          <Reveal delay={0.1}>
            <p className="text-body-lg mt-8 max-w-[52ch] text-sand-100/80">
              Every photograph of a tour — the mill, the cave, the shepherd&rsquo;s
              house, the people we travel with — is our own. A handful of
              landscapes are not, and those are listed here with their author and
              licence. All of them have been colour-graded, which the licences
              require us to say.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-shell py-section">
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <ul className="flex flex-col border-t border-ink/10">
            {photographs.map((photo, i) => (
              <li key={photo.file} className="border-b border-ink/10 py-8 lg:py-10">
                <Reveal delay={Math.min(i * 0.05, 0.25)}>
                  <div className="grid gap-4 lg:grid-cols-[3rem_1fr_auto] lg:items-baseline lg:gap-8">
                    <span className="font-display text-eyebrow tabular-nums text-gold-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div>
                      <h2 className="text-body-lg text-ink">{photo.subject}</h2>
                      <p className="mt-2 max-w-[62ch] text-sm text-ink/60">
                        <cite className="not-italic">{photo.title}</cite> by{" "}
                        {photo.author}
                        {photo.modified ? ", colour-graded by Routes Crete" : ""}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-eyebrow uppercase">
                      <a
                        href={photo.licenceUrl}
                        target="_blank"
                        rel="noopener noreferrer license"
                        className="inline-flex min-h-11 items-center text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-300 hover:text-gold-600"
                      >
                        {photo.licence}
                      </a>
                      <a
                        href={photo.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-ink/55 underline decoration-ink/20 underline-offset-4 transition-colors duration-300 hover:text-gold-600"
                      >
                        Source
                      </a>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal delay={0.1}>
            <p className="mt-10 max-w-[62ch] text-sm text-ink/50">
              Each file above was matched to its source by SHA-1 checksum, so the
              image we publish is verifiably the one that carries that licence.
              Licences were read from each source page directly rather than
              inferred from a category or a neighbouring file. Last verified{" "}
              {verifiedOn}.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
