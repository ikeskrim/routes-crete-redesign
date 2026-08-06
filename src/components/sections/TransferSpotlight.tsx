import Link from "next/link";
import type { ContentItem } from "@/lib/types";
import { getBlur } from "@/lib/content";
import { ImageReveal } from "@/components/ui/Cinematic";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";

/**
 * VIP transfers, presented as a single editorial spread rather than a card
 * grid — there is exactly one transfer service, and a lone card in a grid
 * always looks like something failed to load.
 */
export function TransferSpotlight({ item }: { item: ContentItem }) {
  const lead = item.body[0]?.text ?? "";
  const closing = item.body[item.body.length - 1]?.text ?? "";

  return (
    <section
      id="transfers"
      aria-labelledby="transfers-heading"
      className="bg-shell py-section-lg text-ink"
    >
      <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <ImageReveal
              src={item.cardImage}
              alt={item.title}
              blurDataURL={getBlur(item.cardImage)}
              sizes="(max-width: 1024px) 100vw, 46vw"
              ratio="aspect-[4/3]"
            />
          </div>

          <div className="lg:col-span-6 lg:pt-10">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-gold-600/60" />
              <p className="text-eyebrow uppercase text-rock-500">
                {item.category}
              </p>
            </div>

            <SplitLines
              as="h2"
              text={item.title}
              className="text-display-md mt-6 max-w-[18ch] text-ink"
            />

            <Reveal delay={0.1}>
              <p className="text-body-lg mt-8 text-rock-600">{lead}</p>
              <p className="text-body-lg mt-6 font-display text-ink">
                {closing}
              </p>

              <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-ink/12 pt-8">
                <div>
                  <dt className="text-eyebrow uppercase text-rock-400">
                    Region
                  </dt>
                  <dd className="text-body-sm mt-2 text-ink">
                    {item.facts.region}
                  </dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-rock-400">
                    Availability
                  </dt>
                  <dd className="text-body-sm mt-2 text-ink">
                    {item.facts.availability ?? "Request availability"}
                  </dd>
                </div>
              </dl>

              <Link
                href={item.href}
                className="group mt-10 inline-flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="h-px w-10 bg-ink/30 transition-all duration-500 ease-luxe group-hover:w-16 group-hover:bg-gold-500"
                />
                <span className="text-eyebrow uppercase text-ink transition-[letter-spacing] duration-500 group-hover:tracking-[0.26em]">
                  Explore transfers
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
