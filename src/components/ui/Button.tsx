import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "onDark";
type Size = "sm" | "md" | "lg";

const BASE =
  "group/btn relative inline-flex items-center justify-center gap-2.5 " +
  "font-display font-medium uppercase tracking-[0.14em] whitespace-nowrap " +
  "overflow-hidden rounded-pill " +
  "transition-[transform,background-color,color,border-color] " +
  "duration-500 ease-luxe will-change-transform " +
  "hover:-translate-y-0.5 active:translate-y-0 " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ocean-950 text-sand-50 hover:bg-ocean-800",
  secondary:
    "border border-ink/20 bg-transparent text-ink hover:border-ink/45 hover:bg-ink/[0.03]",
  ghost: "bg-transparent text-ink hover:bg-ink/[0.05]",
  onDark:
    "border border-sand-100/30 bg-transparent text-sand-50 hover:border-sand-100/70 hover:bg-sand-50/10",
};

/* A single light sweep across the face on hover.
 *
 * The CTAs already lift and already magnetise; this is the last small thing
 * that makes one feel like an object worth pressing. Transform and opacity
 * only — the sweep is one skewed gradient translating across, so it costs a
 * compositor layer and nothing else.
 *
 * It is rendered as the LAST child and positioned absolutely, deliberately.
 * The button is an inline-flex row with a gap, so wrapping its children to
 * give them a stacking context would collapse the gap on every icon+label
 * button on the site. Absolute elements are out of flow, so the layout is
 * untouched — and painting over the label is what a sheen is.
 *
 * Tone follows the variant: a light sweep is invisible on a light button. */
const SHEEN: Record<Variant, string> = {
  primary: "via-sand-50/22",
  secondary: "via-ink/10",
  ghost: "via-ink/10",
  onDark: "via-sand-50/18",
};

const SIZES: Record<Size, string> = {
  sm: "h-10 px-5 text-[0.6875rem]",
  md: "h-12 px-7 text-[0.75rem]",
  lg: "h-14 px-9 text-[0.8125rem]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsLink = CommonProps & {
  href: string;
  external?: boolean;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, "href" | "className">;

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    href?: undefined;
  };

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    ...rest
  } = props;
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  const sheen = (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12",
        "-translate-x-[200%] bg-gradient-to-r from-transparent to-transparent",
        "transition-transform duration-[900ms] ease-luxe",
        "group-hover/btn:translate-x-[420%] motion-reduce:hidden",
        SHEEN[variant],
      )}
    />
  );

  if ("href" in props && props.href !== undefined) {
    const { href, external, ...linkRest } = rest as ButtonAsLink;

    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
        >
          {children}
          {sheen}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
        {sheen}
      </Link>
    );
  }

  const buttonRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} {...buttonRest}>
      {children}
      {sheen}
    </button>
  );
}
