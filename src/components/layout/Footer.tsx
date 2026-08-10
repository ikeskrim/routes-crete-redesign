import Image from "next/image";
import Link from "next/link";

import type { SiteContent } from "@/lib/types";
import { getBlur, graded } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * The footer as a destination, not a link dump.
 *
 * Three movements: a closing CTA scene over graded imagery, the wordmark at
 * roughly a third of the viewport, then the links beneath it. The wordmark and
 * the closing statement are where display scale now belongs — everything above
 * them came down in the type retune.
 *
 * Every contact channel renders only if the content file actually has one, so
 * unknown values simply don't appear rather than showing a placeholder.
 */

/** The closing frame. Graded like everything else. */
const CLOSING_IMAGE = graded(
  "/images/experiences/kourtaliotis-temple-of-nature/kudsc06440.jpg",
);

export function Footer({ site }: { site: SiteContent }) {
  const { brand, contact, footer, social, nav } = site;
  const year = new Date().getFullYear();
  const copyright = footer.copyright.replace("{year}", String(year));
  const blurDataURL = getBlur(CLOSING_IMAGE);

  const waHref = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.dial}?text=${encodeURIComponent(
        "Hello Routes Crete, I'd like to ask about a private tour or transfer.",
      )}`
    : null;

  const channels = [
    ...contact.phones.map((phone) => ({
      label: phone.label,
      value: phone.display,
      href: `tel:${phone.dial}`,
    })),
    contact.whatsapp && waHref
      ? {
          label: "WhatsApp",
          value: contact.whatsapp.display,
          href: waHref,
          external: true,
        }
      : null,
    contact.email
      ? { label: "Email", value: contact.email, href: `mailto:${contact.email}` }
      : null,
  ].filter(Boolean) as {
    label: string;
    value: string;
    href: string;
    external?: boolean;
  }[];

  const pageLinks = nav.filter((item) => !item.external);

  return (
    <footer className="grain relative bg-ocean-950 text-sand-100">
      {/* ---------------------------------------------- closing CTA scene */}
      <section
        data-footer-scene
        className="relative flex min-h-[78svh] items-center overflow-hidden"
      >
        <div className="ken-burns absolute inset-[-4%]">
          <Image
            src={CLOSING_IMAGE}
            alt=""
            fill
            quality={68}
            sizes="100vw"
            placeholder={blurDataURL ? "blur" : undefined}
            blurDataURL={blurDataURL}
            className="object-cover"
          />
        </div>

        <div aria-hidden className="absolute inset-0 bg-ocean-950/78" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_10%,rgba(4,20,29,0.6)_100%)]"
        />
        <div aria-hidden className="grain-overlay" />

        <div className="relative mx-auto w-full max-w-[92rem] px-6 text-center sm:px-8 lg:px-12">
          <p className="text-eyebrow uppercase text-gold-300">
            {contact.address}
          </p>
          <p className="text-display-xl mx-auto mt-8 max-w-[16ch] text-balance text-sand-50">
            Tell us when you&rsquo;re on the island.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex h-14 items-center rounded-pill bg-sand-50 px-9 font-display text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-ocean-950 transition-colors duration-500 hover:bg-white"
            >
              Plan your day
            </Link>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center rounded-pill border border-sand-100/30 px-9 font-display text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-sand-50 transition-colors duration-500 hover:border-sand-100/70"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- the wordmark */}
      <div className="relative overflow-hidden border-t border-sand-100/10">
        <h2
          aria-label={brand.name}
          className="select-none px-4 pt-10 pb-2 text-center font-display font-bold uppercase leading-[0.78] tracking-[-0.045em] text-sand-50/95"
          style={{ fontSize: "clamp(3rem, 15.5vw, 13rem)" }}
        >
          <span aria-hidden>{brand.name}</span>
        </h2>
      </div>

      {/* ----------------------------------------------------- the links */}
      <div className="relative mx-auto w-full max-w-[92rem] px-6 pb-10 sm:px-8 lg:px-12">
        <div className="grid gap-12 border-t border-sand-100/10 pt-12 lg:grid-cols-12 lg:gap-8">
          <nav aria-label="Footer" className="lg:col-span-4">
            <h3 className="text-eyebrow uppercase text-sand-200/50">Navigate</h3>
            <ul className="mt-6 flex flex-col gap-3.5">
              {pageLinks.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-body-sm text-sand-100/85 transition-colors duration-300 hover:text-gold-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h3 className="text-eyebrow uppercase text-sand-200/50">Contact</h3>
            <ul className="mt-6 flex flex-col gap-3.5">
              {channels.map((channel) => (
                <li key={channel.label}>
                  <a
                    href={channel.href}
                    {...(channel.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="group inline-flex items-baseline gap-3"
                  >
                    <span className="text-eyebrow uppercase text-sand-200/45">
                      {channel.label}
                    </span>
                    <span className="text-body-sm text-sand-100/85 transition-colors duration-300 group-hover:text-gold-300">
                      {channel.value}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h3 className="text-eyebrow uppercase text-sand-200/50">More</h3>
            <ul className="mt-6 flex flex-col gap-3.5">
              <li>
                <a
                  href={footer.brochure.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-sand-100/85 transition-colors duration-300 hover:text-gold-300"
                >
                  {footer.brochure.label}
                </a>
              </li>
              {social.links.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm text-sand-100/85 transition-colors duration-300 hover:text-gold-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={cn(
            "mt-14 flex flex-col gap-2 border-t border-sand-100/10 pt-8",
            "text-caption text-sand-200/55 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <p>{copyright}</p>
          {contact.address && <p>{contact.address}</p>}
          <p>
            {brand.gemiLabel}: {brand.gemiNumber}
          </p>
        </div>
      </div>
    </footer>
  );
}
