import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemDetail } from "@/components/sections/ItemDetail";
import { ItemJsonLd } from "@/components/seo/ItemJsonLd";
import { getExperience, getExperiences } from "@/lib/content";
import { socialImage } from "@/lib/site-url";

/* Every experience is generated at build. Any other slug is the prerendered 404
   page (full HTML, real 404 status), not an on-demand render. That render
   answered with an empty error shell once the route-level loading boundary
   was removed (C+ S9b). */
export const dynamicParams = false;

export function generateStaticParams() {
  return getExperiences().map((experience) => ({ slug: experience.slug }));
}

export async function generateMetadata(
  props: PageProps<"/experiences/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const experience = getExperience(slug);
  if (!experience) return {};

  return {
    title: experience.title,
    description: experience.meta.description,
    alternates: { canonical: experience.href },
    openGraph: {
      title: experience.meta.title,
      description: experience.meta.description,
      url: experience.href,
      images: socialImage(experience.meta.ogImage)
        ? [{ url: socialImage(experience.meta.ogImage)! }]
        : undefined,
    },
  };
}

export default async function ExperiencePage(
  props: PageProps<"/experiences/[slug]">,
) {
  const { slug } = await props.params;
  const experience = getExperience(slug);
  if (!experience) notFound();

  return (
    <>
      <ItemJsonLd item={experience} />
      <ItemDetail item={experience} />
    </>
  );
}
