import { cn } from "@/lib/utils";

type Width = "narrow" | "default" | "wide" | "full";

const WIDTHS: Record<Width, string> = {
  /** Long-form reading measure — roughly 68 characters. */
  narrow: "max-w-[46rem]",
  default: "max-w-[80rem]",
  wide: "max-w-[92rem]",
  full: "max-w-none",
};

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
    <Tag
      className={cn(
        "mx-auto w-full px-6 sm:px-8 lg:px-12",
        WIDTHS[width],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
