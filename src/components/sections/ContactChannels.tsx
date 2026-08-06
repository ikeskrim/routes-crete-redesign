import type { SiteContent } from "@/lib/types";
import { Reveal } from "@/components/ui/Reveal";
import { pad } from "@/lib/utils";

/**
 * Every way to reach Routes Crete that actually exists.
 *
 * There is no public email address, no social account and no newsletter, so
 * none of those appear. Nothing here is a placeholder.
 */
export function ContactChannels({ site }: { site: SiteContent }) {
  const { contact, brochure } = site;

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
      external: false,
    })),
    ...(waHref && contact.whatsapp
      ? [
          {
            label: "WhatsApp",
            value: contact.whatsapp.display,
            href: waHref,
            external: true,
          },
        ]
      : []),
    ...(contact.address
      ? [{ label: "Where we are", value: contact.address, href: null, external: false }]
      : []),
  ];

  return (
    <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <ul className="border-t border-sand-100/15">
          {channels.map((channel, i) => {
            const inner = (
              <span className="flex items-baseline gap-6 py-6">
                <span className="font-display text-eyebrow tabular-nums text-gold-400">
                  {pad(i + 1)}
                </span>
                <span className="flex-1">
                  <span className="block text-eyebrow uppercase text-sand-200/55">
                    {channel.label}
                  </span>
                  <span className="mt-2 block text-heading-md text-sand-50">
                    {channel.value}
                  </span>
                </span>
              </span>
            );

            return (
              <li key={channel.label} className="border-b border-sand-100/15">
                <Reveal delay={i * 0.06}>
                  {channel.href ? (
                    <a
                      href={channel.href}
                      {...(channel.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="group block transition-colors duration-500 hover:text-gold-300"
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="lg:col-span-5">
        <Reveal delay={0.12}>
          <div className="rounded-media border border-sand-100/15 p-8">
            <p className="text-eyebrow uppercase text-sand-200/55">
              Send us your details
            </p>
            <p className="text-body-sm mt-5 text-sand-200/80">
              The excursion you selected, your preferred date, the number of
              participants, and your accommodation location.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-pill bg-sand-50 px-6 py-4 font-display text-eyebrow uppercase text-ocean-950 transition-colors duration-500 hover:bg-white"
                >
                  Message on WhatsApp
                </a>
              )}
              <a
                href={brochure.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-pill border border-sand-100/30 px-6 py-4 font-display text-eyebrow uppercase text-sand-50 transition-colors duration-500 hover:border-sand-100/70"
              >
                Download the brochure
              </a>
            </div>

            <p className="text-caption mt-6 text-sand-200/55">
              We&rsquo;ll respond promptly with availability, final details, and
              booking confirmation.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
