import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The two CTA shapes of C+ (SPEC §C.12, contract C5).
 *
 * - **Gold pill** (`variant: "gold"`): the ONLY rounded control on the site
 *   and the only place gold appears (§B.2): 48 px tall (`sm` 44 px), ink label
 *   on the warm gold fill (6.53:1; hover 5.38:1), `cta` type, fill transition
 *   250 ms. No translate, no sheen, no magnet. At most one per fold.
 * - **Rule link** (`variant: "rule"`): an underlined text link, 44 px tall, in
 *   ink (paper on night) over a 1 px rule (`rule`, or `rule-night` on night)
 *   0.55rem above its foot. Hover and focus thicken the rule (`scaleY(2)`,
 *   250 ms, transform only) and turn the label burnt sienna on light. No
 *   appended arrow.
 *
 * The focus ring is the ground's token, 2 px, offset 3 px, following the
 * pill's radius (the global `:focus-visible` rule; `tone: "night"` asks for
 * the paper ring explicitly, for night grounds painted by a module class).
 *
 * Preflight P8: the `cta` / `on-cta` / `cta-hover` utilities, `rounded-cta`
 * and every `--ed-cta-*` reference live in this file and nowhere else.
 */
export type CtaVariant = "gold" | "rule";
export type CtaTone = "light" | "night";
export type CtaSize = "md" | "sm";

export type CtaOptions = {
  variant: CtaVariant;
  tone?: CtaTone;
  size?: CtaSize;
  /** Full width of its container (the booking panel's request pill). */
  full?: boolean;
};

const GOLD =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap no-underline " +
  "rounded-cta bg-cta text-on-cta text-cta-label " +
  "transition-[background-color] duration-250 " +
  "hover:bg-cta-hover hover:text-(--ed-cta-fg-hover) " +
  "disabled:pointer-events-none disabled:opacity-50";

const GOLD_SIZE: Record<CtaSize, string> = {
  md: "min-h-(--ed-cta-min-h) px-(--ed-cta-pad)",
  sm: "min-h-11 px-5",
};

const RULE =
  "relative inline-flex min-h-11 items-center gap-2 whitespace-nowrap no-underline text-cta-label " +
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-[0.55rem] after:h-px " +
  "after:origin-bottom after:transition-transform after:duration-250 " +
  "hover:after:scale-y-200 focus-visible:after:scale-y-200 " +
  "disabled:pointer-events-none disabled:opacity-50";

const RULE_TONE: Record<CtaTone, string> = {
  light: "text-ink after:bg-rule hover:text-accent-text focus-visible:text-accent-text",
  night: "text-on-night after:bg-rule-night",
};

/** The class string of a CTA, for links and buttons a component renders itself. */
export function ctaClass({ variant, tone = "light", size = "md", full = false }: CtaOptions): string {
  if (variant === "gold") {
    return cn(
      GOLD,
      GOLD_SIZE[size],
      tone === "night" && "focus-visible:outline-focus-night",
      full && "w-full",
    );
  }
  return cn(
    RULE,
    RULE_TONE[tone],
    tone === "night" && "focus-visible:outline-focus-night",
    full && "w-full justify-center",
  );
}

/* Pre-C+ names, kept so call sites not yet migrated compile and render the
   C+ shape: primary → gold; secondary, ghost → rule; onDark → rule on night.
   `lg` renders `md`. */
type LegacyVariant = "primary" | "secondary" | "ghost" | "onDark";
type LegacySize = "lg";

const LEGACY: Record<LegacyVariant, { variant: CtaVariant; tone: CtaTone }> = {
  primary: { variant: "gold", tone: "light" },
  secondary: { variant: "rule", tone: "light" },
  ghost: { variant: "rule", tone: "light" },
  onDark: { variant: "rule", tone: "night" },
};

type CommonProps = {
  variant?: CtaVariant | LegacyVariant;
  tone?: CtaTone;
  size?: CtaSize | LegacySize;
  full?: boolean;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsLink = CommonProps & {
  href: string;
  /** Opens in a new tab with `rel="noopener noreferrer"`. */
  external?: boolean;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, "href" | "className">;

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    href?: undefined;
  };

/** `<Button variant tone size href external full>`: a link, or a `<button>` without `href`. */
export function Button(props: ButtonAsLink | ButtonAsButton) {
  const {
    variant = "gold",
    tone,
    size = "md",
    full = false,
    className,
    children,
    ...rest
  } = props;

  const legacy = variant in LEGACY ? LEGACY[variant as LegacyVariant] : undefined;
  const classes = cn(
    ctaClass({
      variant: legacy?.variant ?? (variant as CtaVariant),
      tone: tone ?? legacy?.tone ?? "light",
      size: size === "sm" ? "sm" : "md",
      full,
    }),
    className,
  );

  if ("href" in props && props.href !== undefined) {
    const { href, external, ...linkRest } = rest as ButtonAsLink;

    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
