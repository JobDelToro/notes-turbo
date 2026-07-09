/**
 * Little cactus mascot for the auth screens.
 * TODO: swap real Figma asset. On-palette inline SVG placeholder for now.
 */
export function Cactus({
  className,
  title = 'A friendly cactus',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 188 134"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* pot */}
      <path
        d="M64 98 h60 l-8 30 a6 6 0 0 1 -6 5 H78 a6 6 0 0 1 -6 -5 Z"
        fill="var(--color-cat-random)"
        fillOpacity="0.55"
        stroke="var(--color-gold)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="60" y="90" width="68" height="12" rx="4" fill="var(--color-gold)" />
      {/* main stem */}
      <rect
        x="82"
        y="34"
        width="24"
        height="60"
        rx="12"
        fill="var(--color-cat-personal)"
        stroke="var(--color-gold)"
        strokeWidth="3"
      />
      {/* left arm */}
      <path
        d="M84 66 h-14 a10 10 0 0 1 -10 -10 v-8"
        fill="none"
        stroke="var(--color-cat-personal)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* right arm */}
      <path
        d="M104 60 h14 a10 10 0 0 1 10 10 v6"
        fill="none"
        stroke="var(--color-cat-personal)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* flower */}
      <circle cx="94" cy="32" r="8" fill="var(--color-cat-random)" />
      <circle cx="94" cy="32" r="3.5" fill="var(--color-surface)" />
      {/* face */}
      <circle cx="88" cy="60" r="3" fill="var(--color-ink)" />
      <circle cx="100" cy="60" r="3" fill="var(--color-ink)" />
      <path
        d="M87 68 q7 6 14 0"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
