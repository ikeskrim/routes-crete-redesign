import { cn } from "@/lib/utils";

import { Container } from "./Container";

type Tone = "paper" | "bone" | "night" | "none";
type Space = "default" | "lg" | "none";

/* The C+ grounds (§D.2). Paper and bone carry their printed stock (§F.1):
   the section is the positioned, isolated ground and its first child is the
   texture layer. Night takes the density and the night grain layer. */
const TONES: Record<Tone, string> = {
  paper: "paper-stock bg-paper text-ink",
  bone: "bone-stock bg-bone text-ink",
  night: "grain night-density bg-night text-on-night",
  none: "relative",
};

const SPACING: Record<Space, string> = {
  default: "py-(--ed-space-section)",
  lg: "py-[calc(var(--ed-space-section)*1.5)]",
  none: "",
};

function Ground({ tone }: { tone: Tone }) {
  if (tone === "paper") return <div aria-hidden="true" className="paper-stock-layer no-vignette" />;
  if (tone === "bone") return <div aria-hidden="true" className="bone-stock-layer" />;
  if (tone === "night") return <div aria-hidden="true" className="grain-overlay" />;
  return null;
}

/**
 * A page section on one of the C+ grounds (§D.2, §F.1). `id` doubles as the
 * scroll target for the legacy `#portfolio` / `#services` style anchors from
 * the old one-pager.
 */
export function Section({
  id,
  children,
  className,
  innerClassName,
  tone = "paper",
  space = "default",
  width = "default",
  bleed = false,
  "aria-labelledby": ariaLabelledBy,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  tone?: Tone;
  space?: Space;
  width?: "narrow" | "default" | "wide" | "full";
  /** Skip the container entirely — for full-bleed media sections. */
  bleed?: boolean;
  "aria-labelledby"?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(TONES[tone], SPACING[space], className)}
    >
      <Ground tone={tone} />
      {bleed ? (
        children
      ) : (
        <Container width={width} className={cn("relative", innerClassName)}>
          {children}
        </Container>
      )}
    </section>
  );
}
