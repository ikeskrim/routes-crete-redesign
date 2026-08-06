import { cn } from "@/lib/utils";
import { Container } from "./Container";

type Tone = "shell" | "sand" | "ocean" | "none";
type Space = "default" | "lg" | "none";

const TONES: Record<Tone, string> = {
  shell: "bg-shell text-ink",
  sand: "bg-sand-50 text-ink",
  ocean: "bg-ocean-950 text-sand-100",
  none: "",
};

const SPACING: Record<Space, string> = {
  default: "py-section",
  lg: "py-section-lg",
  none: "",
};

/**
 * A page section. `id` doubles as the scroll target for the legacy
 * `#portfolio` / `#services` style anchors from the old one-pager.
 */
export function Section({
  id,
  children,
  className,
  innerClassName,
  tone = "shell",
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
      className={cn("relative", TONES[tone], SPACING[space], className)}
    >
      {bleed ? (
        children
      ) : (
        <Container width={width} className={innerClassName}>
          {children}
        </Container>
      )}
    </section>
  );
}
