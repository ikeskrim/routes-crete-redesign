import type { Metadata } from "next";
import Link from "next/link";

import { ContentCard } from "@/components/ui/Card";
import { ImageReveal } from "@/components/ui/Cinematic";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import { getBlur, getSite, getTransfers } from "@/lib/content";

export function generateMetadata(): Metadata {
  const site = getSite();
  const primary = getTransfers()[0];
  return {
    title: "Transfers",
    description: primary?.meta.description ?? site.meta.description,
    alternates: { canonical: "/transfers" },
    openGraph: {
      title: `Transfers | ${site.brand.name}`,
      description: primary?.meta.description ?? site.meta.description,
      url: "/transfers",
    },
  };
}

export default function TransfersPage() {
  const site = getSite();
  const transfers = getTransfers();
  const [primary, ...rest] = transfers;

  return (
    <>
      <section className="bg-shell pt-40 pb-section text-ink lg:pt-52">
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-600/60" />
            <p className="text-eyebrow uppercase text-rock-500">
              {site.sections.transfers.subheading}
            </p>
          </div>

          <SplitLines
            as="h1"
            text="Because getting there should feel easy"
            className="mt-6 max-w-[15ch] text-display-xl text-ink"
          />
        </div>
      </section>

      {transfers.length === 0 ? (
        <section className="bg-shell pb-section-lg">
          <div className="mx-auto w-full max-w-[80rem] px-6 sm:px-8 lg:px-12">
            <EmptyState
              eyebrow="Transfers"
              title="Our transfer routes are being prepared"
              body="Nothing is listed here just yet. Tell us where you're arriving and where you're staying, and we'll arrange it directly."
              action={{ label: "Contact us", href: "/contact" }}
            />
          </div>
        </section>
      ) : (
        /* One service, so it gets an editorial spread rather than a grid —
           a lone card in a grid always reads as something failing to load. */
        <section className="bg-shell pb-section-lg">
          <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <ImageReveal
                  src={primary.cardImage}
                  alt={primary.title}
                  blurDataURL={getBlur(primary.cardImage)}
                  sizes="(max-width: 1024px) 100vw, 56vw"
                  ratio="aspect-[3/2]"
                  priority
                />
              </div>

              <div className="lg:col-span-5 lg:pt-6">
                <Reveal>
                  <h2 className="text-display-md max-w-[18ch] text-ink">
                    {primary.title}
                  </h2>

                  <div className="mt-8 flex flex-col gap-6">
                    {primary.body.slice(0, 3).map((block, i) => (
                      <p
                        key={i}
                        className={
                          i === 0
                            ? "text-body-lg text-ink/80"
                            : "text-body text-rock-600"
                        }
                      >
                        {block.text}
                      </p>
                    ))}
                  </div>

                  <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-ink/12 pt-8">
                    <div>
                      <dt className="text-eyebrow uppercase text-rock-400">
                        Region
                      </dt>
                      <dd className="text-body-sm mt-2 text-ink">
                        {primary.facts.region}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-eyebrow uppercase text-rock-400">
                        Availability
                      </dt>
                      <dd className="text-body-sm mt-2 text-ink">
                        {primary.facts.availability ?? "Request availability"}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={primary.href}
                    className="group mt-10 inline-flex min-h-11 items-center gap-3"
                  >
                    <span
                      aria-hidden
                      className="h-px w-10 bg-ink/30 transition-all duration-500 ease-luxe group-hover:w-16 group-hover:bg-gold-500"
                    />
                    <span className="text-eyebrow uppercase text-ink transition-[letter-spacing] duration-500 group-hover:tracking-[0.26em]">
                      Full details
                    </span>
                  </Link>
                </Reveal>
              </div>
            </div>

            {/* Scales up the moment a second service is added. */}
            {rest.length > 0 && (
              <div className="mt-24 grid gap-x-10 gap-y-14 sm:grid-cols-2">
                {rest.map((transfer, i) => (
                  <ContentCard
                    key={transfer.slug}
                    item={transfer}
                    index={i + 2}
                    ratio="aspect-[3/2]"
                    sizes="(max-width: 768px) 100vw, 46vw"
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
