import { cn, pad } from "@/lib/utils";
import { Reveal } from "./Reveal";

/**
 * The editorial section header: a numbered waypoint index, a hairline rule,
 * then the display heading. The numbering is the spine of the brand — the site
 * is a set of routes, so every section is a marked point along one.
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  subtitle,
  id,
  align = "left",
  tone = "dark",
  className,
  children,
}: {
  index?: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  id?: string;
  align?: "left" | "center";
  /** `dark` = dark text on light bg. `light` = light text on dark bg. */
  tone?: "dark" | "light";
  className?: string;
  children?: React.ReactNode;
}) {
  const muted = tone === "dark" ? "text-rock-500" : "text-sand-200/70";
  const ruleColor = tone === "dark" ? "bg-ink/15" : "bg-sand-100/25";

  return (
    <header
      className={cn(
        "flex flex-col",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {(index !== undefined || eyebrow) && (
        <Reveal>
          <div
            className={cn(
              "flex items-center gap-4",
              align === "center" && "justify-center",
            )}
          >
            {index !== undefined && (
              <span
                className={cn(
                  "font-display text-eyebrow tabular-nums",
                  tone === "dark" ? "text-gold-600" : "text-gold-400",
                )}
              >
                {pad(index)}
              </span>
            )}
            <span aria-hidden className={cn("h-px w-8", ruleColor)} />
            {eyebrow && (
              <span className={cn("text-eyebrow uppercase", muted)}>
                {eyebrow}
              </span>
            )}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.06}>
        <h2
          id={id}
          className={cn(
            "text-display-lg mt-6",
            tone === "dark" ? "text-ink" : "text-sand-50",
          )}
        >
          {title}
        </h2>
      </Reveal>

      {subtitle && (
        <Reveal delay={0.12}>
          <p
            className={cn(
              "text-body-lg mt-5 max-w-[42rem]",
              align === "center" && "mx-auto",
              tone === "dark" ? "text-rock-600" : "text-sand-200/85",
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      )}

      {children}
    </header>
  );
}
