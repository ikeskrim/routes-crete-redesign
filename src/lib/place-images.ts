import { getBlur, graded } from "@/lib/content";

/**
 * One real, licence-verified photograph per place on the chart.
 *
 * This lived inline in the homepage while the island chart was the only thing
 * that used it. The route journey on every experience page needs exactly the
 * same mapping — same places, same verified frames — and a second hardcoded
 * copy is how two lists drift until a pin shows the wrong gorge.
 *
 * The rules that govern the list, unchanged:
 *
 *   - Every entry is a real photograph OF that place, credited on /credits.
 *   - The `alt` is what the frame actually depicts, and it doubles as the one
 *     true line shown under the place's name. It is a description, not travel
 *     copy, and nothing in it is invented.
 *   - A place we cannot honestly photograph is ABSENT rather than filled with
 *     something that resembles it. The cave, the deliberately unnamed historic
 *     village and the two airports have no entry, and the components render
 *     them as a marker and a name.
 */
const PLACE_PHOTOGRAPHS = [
  [
    "rethymno-town",
    "rethymno-harbour-mountains",
    "Rethymno harbour, with the snow-covered mountains behind it",
  ],
  [
    "kourtaliotis-gorge",
    "kourtaliotiko-waterfall",
    "The waterfall in Kourtaliotiko Gorge",
  ],
  [
    "preveli-lagoon",
    "preveli-palms-aerial",
    "The palm forest along the river at Preveli",
  ],
  ["preveli-monastery", "preveli-monastery", "Preveli Monastery"],
  ["mountain-village", "anogeia-village", "The mountain village of Anogeia"],
] as const;

export type PlaceImage = { src: string; alt: string; blurDataURL?: string };

export function getPlaceImages(): Record<string, PlaceImage> {
  const images: Record<string, PlaceImage> = {};
  for (const [key, file, alt] of PLACE_PHOTOGRAPHS) {
    const src = graded(`/images/sourced/${file}.jpg`);
    images[key] = { src, alt, blurDataURL: getBlur(src) };
  }
  return images;
}
