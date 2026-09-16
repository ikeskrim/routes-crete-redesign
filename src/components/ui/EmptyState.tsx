import Link from "next/link";

import { cn } from "@/lib/utils";

import { ctaClass } from "./Button";
import { Eyebrow } from "./Eyebrow";

/**
 * Shown when a collection has nothing in it yet (C+ SPEC §D.6: a bone card
 * with a rule CTA).
 *
 * Deliberately honest: it says the routes are being prepared rather than
 * inventing filler, and always offers a way onward. Every string comes from
 * the caller.
 */
export function EmptyState({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="bg-bone px-8 py-16 text-center sm:py-24">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mx-auto mt-5 max-w-[18ch] text-title text-ink">{title}</h2>
      <p className="mx-auto mt-5 max-w-[42ch] text-body text-ink-soft">{body}</p>

      {action && (
        <Link href={action.href} className={cn(ctaClass({ variant: "rule" }), "mt-8")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
