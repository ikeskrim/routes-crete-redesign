import { getSite } from "@/lib/content";
import type { ContentItem } from "@/lib/types";
import { stripInline } from "@/lib/utils";

/**
 * TouristTrip + BreadcrumbList for a detail page.
 *
 * Only fields we actually have are emitted — no offer, price, duration or
 * rating is invented to satisfy a schema validator.
 */
export function ItemJsonLd({ item }: { item: ContentItem }) {
  const site = getSite();
  const url = `${site.brand.url}${item.href}`;

  const itinerary = site.locations
    .filter((l) => item.locations.includes(l.key) && !l.needsInput)
    .map((location, i) => ({
      "@type": "TouristAttraction",
      name: location.name,
      position: i + 1,
      ...(typeof location.lat === "number" && typeof location.lng === "number"
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: location.lat,
              longitude: location.lng,
            },
          }
        : {}),
    }));

  const trip: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: item.title,
    description: stripInline(item.meta.description),
    url,
    image: item.gallery.slice(0, 6).map((g) => `${site.brand.url}${g.src}`),
    provider: {
      "@type": "TravelAgency",
      name: site.brand.name,
      url: site.brand.url,
      ...(site.contact.address
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: "Rethymno",
              addressRegion: "Crete",
              addressCountry: "GR",
            },
          }
        : {}),
      telephone: site.contact.phones.map((p) => p.dial),
    },
  };

  if (itinerary.length > 0) {
    trip.itinerary = { "@type": "ItemList", itemListElement: itinerary };
  }
  if (item.facts.duration) {
    // A human-readable label only — the copy never states a precise duration,
    // so no ISO 8601 value is fabricated.
    trip.touristType = undefined;
  }

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.brand.url },
      {
        "@type": "ListItem",
        position: 2,
        name: item.collection === "experiences" ? "Experiences" : "Transfers",
        item: `${site.brand.url}/${item.collection}`,
      },
      { "@type": "ListItem", position: 3, name: item.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(trip) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
