import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemDetail } from "@/components/sections/ItemDetail";
import { ItemJsonLd } from "@/components/seo/ItemJsonLd";
import { getExperience, getExperiences } from "@/lib/content";

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
      images: experience.meta.ogImage
        ? [{ url: experience.meta.ogImage }]
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
