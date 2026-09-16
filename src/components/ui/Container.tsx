import { cn } from "@/lib/utils";

type Width = "narrow" | "default" | "wide" | "full";

const WIDTHS: Record<Width, string> = {
  /** Long-form reading measure, about 66 characters (C+ SPEC §C.3). */
  narrow: "max-w-[46rem]",
  /** The editorial grid's widest content box (§D.1: 12 × 6rem + 11 × 1.5rem) on its margins. */
  default: "max-w-[calc(88.5rem+2*var(--ed-margin))]",
  wide: "max-w-[92rem]",
  full: "max-w-none",
};

/**
 * A centred content box on the page margins of the editorial grid
 * (`--ed-margin`, C+ SPEC §D.1). Compositions that place content on columns
 * use the `ed-grid` utility instead.
 */
export function Container({
  children,
  className,
  width = "default",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  width?: Width;
  as?: React.ElementType;
}) {
  return (
    <Tag className={cn("mx-auto w-full px-(--ed-margin)", WIDTHS[width], className)}>
      {children}
    </Tag>
  );
}
