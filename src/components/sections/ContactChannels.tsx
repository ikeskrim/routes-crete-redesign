import type { SiteContent } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Every way to reach Routes Crete that actually exists.
 *
 * There is no public email address, no social account and no newsletter, so
 * none of those appear. Nothing here is a placeholder.
 *
 * C+ (SPEC §D.6 `/contact`): two items on the night head's editorial grid,
 * on its third row.
 * - The channels, a directory at `col 1 / span 7`: hairline rows, the label
 *   as letter-spaced capitals in stone, the value in the Fraunces title cut
 *   in paper, a 1 px paper underline on hover and focus, 44 px targets and no
 *   numerals. "Where we are" is a row without a link.
 * - The details card at `col 9 / span 4` (under the channels at `col 1 /
 *   span 6` from 640 to 1023): a 1 px control rule, the gold "Message on
 *   WhatsApp" pill (this page's one gold pill) and the brochure as a rule
 *   link.
 * - 1024–1279: four columns of 61–76 px left the card's body a 230 px
 *   measure that ragged badly ("your preferred / date, the number of"), so
 *   there the card takes `col 8 / span 5` and the channels `col 1 / span 6`
 *   (column 7 stays air; the longest value, the address, needs about 270 px
 *   of the 452 at 1024). From 1280 the §D.6 placement holds.
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
    <>
      <ul className="col-[content-start/content-end] mt-(--ed-space-block) border-t-(length:--ed-hair-w) border-hairline-night lg:col-[col_1/span_6] lg:row-start-3 xl:col-[col_1/span_7]">
        {channels.map((channel, i) => {
          const inner = (
            <>
              <Eyebrow as="span" tone="night">
                {channel.label}
              </Eyebrow>
              {/* The underline lives on the value: it is the text a visitor
                  reads as the link. */}
              <span className="mt-2 block text-title text-on-night underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-[text-decoration-color] duration-250 group-hover:decoration-on-night group-focus-visible:decoration-on-night">
                {channel.value}
              </span>
            </>
          );

          return (
            <li
              key={channel.label}
              className="border-b-(length:--ed-hair-w) border-hairline-night"
            >
              <Reveal delay={i * 0.06}>
                {channel.href ? (
                  <a
                    href={channel.href}
                    {...(channel.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="group flex min-h-11 flex-col justify-center py-5"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="flex min-h-11 flex-col justify-center py-5">{inner}</div>
                )}
              </Reveal>
            </li>
          );
        })}
      </ul>

      <div className="col-[content-start/content-end] mt-(--ed-space-block) sm:col-[col_1/span_6] lg:col-[col_8/span_5] lg:row-start-3 lg:self-start xl:col-[col_9/span_4]">
        <Reveal delay={0.12}>
          <div className="border border-rule-night p-6 sm:p-8">
            <Eyebrow tone="night">Send us your details</Eyebrow>
            <p className="mt-4 text-body text-on-night-soft">
              The excursion you selected, your preferred date, the number of
              participants, and your accommodation location.
            </p>

            <div className="mt-(--ed-space-pair) flex flex-col items-start gap-2">
              {waHref && (
                <Button variant="gold" tone="night" href={waHref} external full>
                  Message on WhatsApp
                </Button>
              )}
              <Button variant="rule" tone="night" href={brochure.href} external>
                Download the brochure
              </Button>
            </div>

            <p className="mt-6 text-caption text-on-night-soft">
              We&rsquo;ll respond promptly with availability, final details, and
              booking confirmation.
            </p>
          </div>
        </Reveal>
      </div>
    </>
  );
}
