/** Shared by the server page and the client menu — no hooks, no "use client". */
export function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
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
