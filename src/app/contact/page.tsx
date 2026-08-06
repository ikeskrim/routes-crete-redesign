import type { Metadata } from "next";

import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import { ContactChannels } from "@/components/sections/ContactChannels";
import { getSite } from "@/lib/content";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Contact",
    description:
      "Request a private tour or a VIP transfer in Crete. Send us your details and we’ll respond promptly with availability, final details, and booking confirmation.",
    alternates: { canonical: "/contact" },
    openGraph: {
      title: `Contact | ${site.brand.name}`,
      description: site.meta.description,
      url: "/contact",
    },
  };
}

export default function ContactPage() {
  const site = getSite();

  return (
    <>
      <section
        id="contact"
        className="grain relative bg-ocean-950 pt-40 pb-section text-sand-50 lg:pt-52"
      >
        <div aria-hidden className="grain-overlay" />
        <div className="relative mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-400/70" />
            <p className="text-eyebrow uppercase text-sand-200/60">
              {site.sections.contact.subheading}
            </p>
          </div>

          <SplitLines
            as="h1"
            text="Start your Cretan journey"
            className="mt-6 max-w-[14ch] text-display-xl text-sand-50"
          />

          <div className="mt-14 lg:mt-20">
            <ContactChannels site={site} />
          </div>
        </div>
      </section>

      {/* The existing Monday.com form, embedded exactly as before. */}
      <section className="bg-shell py-section text-ink">
        <div className="mx-auto w-full max-w-[80rem] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold-600/60" />
            <p className="text-eyebrow uppercase text-rock-500">
              {site.sections.contact.heading}
            </p>
          </div>

          <Reveal>
            <div className="mt-10 overflow-hidden rounded-media border border-ink/10 bg-white">
              <iframe
                src={site.contact.formUrl}
                title="Routes Crete booking request form"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[1600px] w-full border-0"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
