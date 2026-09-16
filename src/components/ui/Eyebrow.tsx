import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Folio = "I" | "II" | "III" | "IV";

/**
 * Eyebrows and folio rows (C+ SPEC §C.5, §C.6, contract C6). Server component.
 *
 * **Letter-spaced capitals, never "small caps":** no served font carries
 * true small caps, and faux small caps are forbidden. Real Inter capitals at
 * 12.8 px, whose cap height (9.31 px) equals the x-height of 17 px body text,
 * weight 540, tracking 0.1em (`text-eyebrow`, all Layer E tokens). Olive on
 * paper and bone; stone on night.
 *
 * The children are always an existing string (a content field or a live code
 * string); this component adds none.
 *
 * With `folio`, the folio row of a movement opener (§C.6):
 *
 *     [Roman numeral]  [3.5rem hairline]  [department name]
 *
 * baseline-aligned, 1rem apart, then `clamp(2.5rem, 4vw, 3.5rem)` of air. The
 * numeral is structural numbering (`aria-hidden`), set in the `folio` step in
 * burnt sienna (stone on night), hung 0.04em into the margin so it sits on
 * the column line. The Roman folios I–IV on the four interior movements are
 * the only folios on the site (§H.5).
 */
export function Eyebrow({
  children,
  folio,
  tone = "light",
  as: Tag = "p",
  className,
  id,
}: {
  children: ReactNode;
  folio?: Folio;
  tone?: "light" | "night";
  as?: "p" | "span" | "h3";
  /** On the label; on the row when there is a folio. */
  className?: string;
  /** Lands on the label element. */
  id?: string;
}) {
  const night = tone === "night";
  /* `font-variation-settings: normal`: an eyebrow set inside a display
     heading must not inherit its "opsz" 144. */
  const label = cn(
    "block text-eyebrow [font-variation-settings:normal]",
    night ? "text-stone" : "text-label",
  );

  if (!folio) {
    return (
      <Tag id={id} className={cn(label, className)}>
        {children}
      </Tag>
    );
  }

  return (
    <div
      className={cn(
        "mb-[clamp(2.5rem,4vw,3.5rem)] flex items-baseline gap-4",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("-ms-[0.04em] text-folio", night ? "text-stone" : "text-accent-text")}
      >
        {folio}
      </span>
      {/* An empty flex item's baseline is its bottom edge: the hairline sits
          on the shared baseline. */}
      <span
        aria-hidden="true"
        className={cn(
          "h-(--ed-hair-w) w-14 flex-none",
          night ? "bg-hairline-night" : "bg-hairline",
        )}
      />
      <Tag id={id} className={label}>
        {children}
      </Tag>
    </div>
  );
}
