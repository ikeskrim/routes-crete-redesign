import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemDetail } from "@/components/sections/ItemDetail";
import { ItemJsonLd } from "@/components/seo/ItemJsonLd";
import { getTransfer, getTransfers } from "@/lib/content";

export function generateStaticParams() {
  return getTransfers().map((transfer) => ({ slug: transfer.slug }));
}

export async function generateMetadata(
  props: PageProps<"/transfers/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const transfer = getTransfer(slug);
  if (!transfer) return {};

  return {
    title: transfer.title,
    description: transfer.meta.description,
    alternates: { canonical: transfer.href },
    openGraph: {
      title: transfer.meta.title,
      description: transfer.meta.description,
      url: transfer.href,
      images: transfer.meta.ogImage
        ? [{ url: transfer.meta.ogImage }]
        : undefined,
    },
  };
}

export default async function TransferPage(
  props: PageProps<"/transfers/[slug]">,
) {
  const { slug } = await props.params;
  const transfer = getTransfer(slug);
  if (!transfer) notFound();

  return (
    <>
      <ItemJsonLd item={transfer} />
      <ItemDetail item={transfer} />
    </>
  );
}
