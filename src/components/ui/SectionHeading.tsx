import { cn } from "@/lib/utils";

import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";

/**
 * A movement opener (C+ SPEC §C.6): the folio row (Roman numeral, hairline,
 * department name) or a plain eyebrow, then the `section`-step heading and an
 * optional deck. A `div`, never a `<header>`: the masthead is the page's one
 * header. Numbering is Roman and only on the four interior movements; there
 * are no Arabic section numbers.
 */
export function SectionHeading({
  folio,
  eyebrow,
  title,
  subtitle,
  id,
  align = "left",
  tone = "dark",
  className,
  children,
}: {
  folio?: "I" | "II" | "III" | "IV";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  id?: string;
  align?: "left" | "center";
  /** `dark` = ink on a light ground. `light` = paper on night. */
  tone?: "dark" | "light";
  className?: string;
  children?: React.ReactNode;
}) {
  const night = tone === "light";

  return (
    <div
      className={cn(
        "flex flex-col",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow && (
        <Reveal>
          <Eyebrow
            folio={folio}
            tone={night ? "night" : "light"}
            className={cn(folio && align === "center" && "justify-center")}
          >
            {eyebrow}
          </Eyebrow>
        </Reveal>
      )}

      <Reveal delay={0.06}>
        <h2
          id={id}
          className={cn(
            "text-section",
            !(eyebrow && folio) && "mt-6",
            night ? "text-on-night" : "text-ink",
          )}
        >
          {title}
        </h2>
      </Reveal>

      {subtitle && (
        <Reveal delay={0.12}>
          <p
            className={cn(
              "mt-5 max-w-[34ch] text-deck",
              align === "center" && "mx-auto",
              night ? "text-on-night-soft" : "text-ink-soft",
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      )}

      {children}
    </div>
  );
}
