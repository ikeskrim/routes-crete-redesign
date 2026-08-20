import Link from "next/link";

import { BookingCta } from "@/components/sections/BookingCta";
import { Gallery } from "@/components/sections/Gallery";
import { LocationsMap } from "@/components/sections/LocationsMap";
import { ContentCard } from "@/components/ui/Card";
import { Bridge, ImageReveal } from "@/components/ui/Cinematic";
import { Reveal } from "@/components/ui/Reveal";
import { InlineText } from "@/components/ui/RichText";
import { SplitLines } from "@/components/ui/SplitLines";
import { ItemHero } from "@/components/sections/ItemHero";
import {
  getBlur,
  getMappableLocations,
  getRelatedItems,
  getSite,
  graded,
} from "@/lib/content";
import type { ContentItem } from "@/lib/types";
import { pad } from "@/lib/utils";

/**
 * The long-form editorial template. Both experiences and the transfer service
 * render through this — the content files decide everything.
 */
export function ItemDetail({ item }: { item: ContentItem }) {
  const site = getSite();
  const related = getRelatedItems(item.slug, 2);

  /* Only the locations this route actually visits, and only those we can
     place — unnamed places stay off the map entirely. */
  const locations = getMappableLocations().filter((l) =>
    item.locations.includes(l.key),
  );

  /* Photographs used as breaks between sections of the story. The card and
     hero images are skipped so nothing repeats immediately. */
  const breakImages = item.gallery
    .filter((g) => g.src !== item.heroImage && g.src !== item.cardImage)
    .slice(0, 3);

  const facts = [
    { label: "Region", value: item.facts.region },
    { label: "Duration", value: item.facts.duration ?? "On request" },
    { label: "Price", value: item.facts.price ?? "On request" },
    {
      label: "Availability",
      value: item.facts.availability ?? "Request availability",
    },
    ...(item.facts.vehicle
      ? [{ label: "Vehicle", value: item.facts.vehicle }]
      : []),
  ].filter((f) => f.value);

  /* The story is split so images can breathe between passages. */
  const chunkSize = Math.max(2, Math.ceil(item.body.length / (breakImages.length + 1)));
  const chunks: (typeof item.body)[] = [];
  for (let i = 0; i < item.body.length; i += chunkSize) {
    chunks.push(item.body.slice(i, i + chunkSize));
  }

  return (
    <>
      <ItemHero
        eyebrow={item.category}
        title={item.title}
        subtitle={item.subtitle ?? undefined}
        image={item.heroImage}
        blurDataURL={getBlur(item.heroImage)}
      />

      {/* Quick facts strip */}
      <section className="border-b border-ink/10 bg-shell">
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <dl className="grid grid-cols-2 gap-y-8 py-10 sm:grid-cols-4 lg:py-12">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-eyebrow uppercase text-rock-400">
                  {fact.label}
                </dt>
                <dd className="text-body-sm mt-2 text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Story + sticky request panel */}
      <section className="bg-shell py-section text-ink">
        <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7 xl:col-span-8">
              {chunks.map((chunk, chunkIndex) => (
                <div key={chunkIndex}>
                  <div className="flex max-w-[46rem] flex-col gap-7">
                    {chunk.map((block, i) => (
                      <p
                        key={i}
                        className={
                          chunkIndex === 0 && i === 0
                            ? "text-body-lg text-ink/80"
                            : "text-body text-rock-600"
                        }
                      >
                        <InlineText text={block.text} />
                      </p>
                    ))}
                  </div>

                  {breakImages[chunkIndex] && (
                    <figure className="my-14 lg:my-20">
                      <ImageReveal
                        src={breakImages[chunkIndex].src}
                        alt={item.title}
                        blurDataURL={getBlur(breakImages[chunkIndex].src)}
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        ratio={
                          breakImages[chunkIndex].width >
                          breakImages[chunkIndex].height
                            ? "aspect-[3/2]"
                            : "aspect-[4/5]"
                        }
                      />
                    </figure>
                  )}
                </div>
              ))}

              {/* Verified brochure facts */}
              {item.included && (
                <Reveal>
                  <div className="mt-16 max-w-[46rem] border-t border-ink/12 pt-10">
                    <p className="text-eyebrow uppercase text-rock-500">
                      {item.included.label}
                    </p>
                    <ul className="mt-7 flex flex-col">
                      {item.included.items.map((entry, i) => (
                        <li
                          key={entry}
                          className="flex gap-6 border-b border-ink/10 py-5"
                        >
                          <span className="font-display text-eyebrow tabular-nums text-gold-600">
                            {pad(i + 1)}
                          </span>
                          <span className="text-body text-ink">{entry}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}

              {/* Highlights, drawn verbatim from the story above */}
              {item.highlights && item.highlights.length > 0 && (
                <Reveal>
                  <div className="mt-16 max-w-[46rem] border-t border-ink/12 pt-10">
                    <p className="text-eyebrow uppercase text-rock-500">
                      Highlights
                    </p>
                    <ul className="mt-6 flex flex-col gap-3">
                      {item.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-4">
                          <span aria-hidden className="mt-3 h-px w-6 shrink-0 bg-gold-500" />
                          <span className="text-body text-rock-600">
                            {highlight}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
            </div>

            <div className="lg:col-span-5 xl:col-span-4">
              <BookingCta
                variant="panel"
                title={item.title}
                formUrl={site.contact.formUrl}
                whatsapp={site.contact.whatsapp}
                price={item.facts.price ?? null}
                duration={item.facts.duration ?? null}
                availability={item.facts.availability ?? null}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pull quote */}
      {item.pullQuote && (
        <section className="grain relative bg-ocean-950 py-section text-sand-50">
          <div aria-hidden className="grain-overlay" />
          <div className="relative mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
            <SplitLines
              as="p"
              text={`“${item.pullQuote}”`}
              className="text-display-md max-w-[24ch] text-sand-50"
            />
          </div>
        </section>
      )}

      {/* Editorial place breaks.
          Licensed photographs of the real places this journey visits. They sit
          apart from the gallery on purpose: the gallery is the operator's own
          tour photography, and these are not, so each carries a credit line
          saying so. A sourced landscape passing as our own would be the exact
          dishonesty this project refuses. */}
      {item.placeBreaks?.map((place) => (
        <Bridge
          key={place.src}
          src={graded(place.src)}
          alt={place.place}
          blurDataURL={getBlur(graded(place.src))}
          caption={place.place}
          creditNote="Licensed photograph — see credits"
          height="h-[56vh] min-h-[20rem] lg:h-[70vh]"
        />
      ))}

      {/* Cinematic bridge */}
      {item.gallery[2] && (
        <Bridge
          src={item.gallery[2].src}
          alt=""
          blurDataURL={getBlur(item.gallery[2].src)}
          height="h-[52vh] min-h-[18rem] lg:h-[64vh]"
        />
      )}

      {/* Route map */}
      {locations.length > 0 && (
        <section className="grain relative bg-ocean-950 py-section text-sand-50">
          <div aria-hidden className="grain-overlay" />
          <div className="relative mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-gold-400/70" />
              <p className="text-eyebrow uppercase text-sand-200/60">The route</p>
            </div>
            <SplitLines
              as="h2"
              text="Where this journey takes you"
              className="text-display-md mt-6 max-w-[16ch] text-sand-50"
            />
            <div className="mt-12">
              <LocationsMap locations={locations} links={{}} />
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {item.gallery.length > 1 && (
        <section id="gallery" className="bg-sand-50 py-section text-ink">
          <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-gold-600/60" />
              <p className="text-eyebrow uppercase text-rock-500">Gallery</p>
            </div>
            <SplitLines
              as="h2"
              text="Frames from this route"
              className="text-display-md mt-6 max-w-[16ch] text-ink"
            />
            <div className="mt-12">
              <Gallery
                images={item.gallery.map((g) => ({
                  ...g,
                  alt: item.title,
                  blurDataURL: getBlur(g.src),
                }))}
              variant="strip"
              />
            </div>
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-shell py-section-lg text-ink">
          <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-gold-600/60" />
              <p className="text-eyebrow uppercase text-rock-500">Continue</p>
            </div>
            <SplitLines
              as="h2"
              text="Other ways to see the island"
              className="text-display-md mt-6 max-w-[16ch] text-ink"
            />

            <div className="mt-14 grid gap-x-10 gap-y-14 sm:grid-cols-2">
              {related.map((other, i) => (
                <ContentCard
                  key={other.slug}
                  item={other}
                  index={i + 1}
                  ratio="aspect-[3/2]"
                  sizes="(max-width: 768px) 100vw, 46vw"
                />
              ))}
            </div>

            <Link
              href="/experiences"
              className="group mt-14 inline-flex min-h-11 items-center gap-3"
            >
              <span
                aria-hidden
                className="h-px w-10 bg-ink/30 transition-all duration-500 ease-luxe group-hover:w-16 group-hover:bg-gold-500"
              />
              <span className="text-eyebrow uppercase text-ink">
                All experiences
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* Mobile request bar */}
      <BookingCta
        variant="bar"
        title={item.title}
        formUrl={site.contact.formUrl}
        whatsapp={site.contact.whatsapp}
        price={item.facts.price ?? null}
        duration={item.facts.duration ?? null}
        availability={item.facts.availability ?? null}
      />
    </>
  );
}
