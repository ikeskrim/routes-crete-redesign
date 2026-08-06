import Link from "next/link";
import type { SiteContent } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Minimal, luxury footer.
 *
 * Every contact channel renders only if the content file actually has one, so
 * unknown values (email, phone, WhatsApp, socials) simply don't appear rather
 * than showing an empty placeholder.
 */
export function Footer({ site }: { site: SiteContent }) {
  const { brand, contact, footer, social, nav } = site;
  const year = new Date().getFullYear();
  const copyright = footer.copyright.replace("{year}", String(year));

  const channels = [
    ...contact.phones.map((phone) => ({
      label: phone.label,
      value: phone.display,
      href: `tel:${phone.dial}`,
    })),
    contact.whatsapp && {
      label: "WhatsApp",
      value: contact.whatsapp.display,
      href: `https://wa.me/${contact.whatsapp.dial}`,
      external: true,
    },
    contact.email && {
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
  ].filter(Boolean) as {
    label: string;
    value: string;
    href: string;
    external?: boolean;
  }[];

  const pageLinks = nav.filter((item) => !item.external);

  return (
    <footer className="grain relative bg-ocean-950 text-sand-100">
      <div aria-hidden className="grain-overlay" />

      <div className="relative mx-auto w-full max-w-[92rem] px-6 pt-20 pb-10 sm:px-8 lg:px-12 lg:pt-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          {/* Wordmark + tagline */}
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="font-display text-display-md font-bold uppercase tracking-[-0.02em] text-sand-50"
            >
              {brand.name}
            </Link>
            <p className="text-body-sm mt-5 max-w-[24rem] text-sand-200/70">
              {site.hero.subheading}
            </p>
          </div>

          {/* Navigate */}
          <nav aria-label="Footer" className="lg:col-span-3">
            <h2 className="text-eyebrow uppercase text-sand-200/50">
              Navigate
            </h2>
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

          {/* Contact + brochure */}
          <div className="lg:col-span-4">
            <h2 className="text-eyebrow uppercase text-sand-200/50">Contact</h2>

            {channels.length > 0 ? (
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
            ) : (
              <p className="text-body-sm mt-6 text-sand-200/70">
                Send us your request through the{" "}
                <Link
                  href="/contact"
                  className="text-sand-50 underline decoration-sand-100/30 underline-offset-4 transition-colors hover:text-gold-300"
                >
                  contact form
                </Link>
                .
              </p>
            )}

            <a
              href={footer.brochure.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex items-center gap-3"
            >
              <span
                aria-hidden
                className="h-px w-8 bg-sand-100/40 transition-all duration-500 ease-luxe group-hover:w-12 group-hover:bg-gold-400"
              />
              <span className="text-eyebrow uppercase text-sand-100/85 transition-colors duration-300 group-hover:text-gold-300">
                {footer.brochure.label}
              </span>
            </a>

            {social.links.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {social.links.map((link) => (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-eyebrow uppercase text-sand-100/70 transition-colors duration-300 hover:text-gold-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div
          aria-hidden
          className={cn("mt-16 h-px w-full bg-sand-100/12 lg:mt-24")}
        />

        <div className="mt-8 flex flex-col gap-2 text-caption text-sand-200/55 sm:flex-row sm:items-center sm:justify-between">
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
