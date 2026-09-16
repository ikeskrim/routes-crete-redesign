/**
 * Inline icons (C+ SPEC §C.1). The served fonts carry no → or ↗, so every
 * arrow on the site is this SVG or nothing. No hooks and no "use client":
 * shared by server components and client islands alike.
 */

/** The external-link mark, drawn at 12 px (`className="size-3"`) beside a label. */
export function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5" />
    </svg>
  );
}
