import Link from "next/link";

/**
 * Shown when a collection has nothing in it yet.
 *
 * Deliberately honest: it says the routes are being prepared rather than
 * inventing filler, and always offers a way onward.
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
    <div className="rounded-media border border-ink/12 bg-sand-50 px-8 py-16 text-center sm:py-24">
      <p className="text-eyebrow uppercase text-rock-500">{eyebrow}</p>
      <h2 className="text-display-md mx-auto mt-5 max-w-[18ch] text-ink">
        {title}
      </h2>
      <p className="text-body mx-auto mt-5 max-w-[42ch] text-rock-600">{body}</p>

      {action && (
        <Link
          href={action.href}
          className="group mt-10 inline-flex items-center gap-3"
        >
          <span
            aria-hidden
            className="h-px w-10 bg-ink/30 transition-all duration-500 ease-luxe group-hover:w-16 group-hover:bg-gold-500"
          />
          <span className="text-eyebrow uppercase text-ink">{action.label}</span>
        </Link>
      )}
    </div>
  );
}
