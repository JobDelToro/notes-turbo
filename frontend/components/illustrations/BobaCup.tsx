/**
 * Boba-tea cup illustration for the empty state.
 * TODO: swap real Figma asset. On-palette inline SVG placeholder for now.
 */
export function BobaCup({
  className,
  title = 'A cup of boba tea',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 200"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* straw */}
      <rect
        x="92"
        y="6"
        width="14"
        height="150"
        rx="7"
        transform="rotate(12 99 80)"
        fill="var(--color-cat-personal)"
      />
      {/* lid */}
      <path d="M34 46 h92 l-4 14 H38 Z" fill="var(--color-gold)" opacity="0.9" />
      <ellipse cx="80" cy="46" rx="46" ry="9" fill="var(--color-gold)" />
      {/* cup body (tapered) */}
      <path
        d="M38 60 h84 l-10 118 a8 8 0 0 1 -8 7 H56 a8 8 0 0 1 -8 -7 Z"
        fill="var(--color-cat-random)"
        fillOpacity="0.35"
        stroke="var(--color-gold)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* tea line */}
      <path
        d="M45 118 h70 l-6 60 a8 8 0 0 1 -8 7 H59 a8 8 0 0 1 -8 -7 Z"
        fill="var(--color-cat-random)"
        fillOpacity="0.55"
      />
      {/* tapioca pearls */}
      {[
        [60, 172],
        [76, 176],
        [92, 172],
        [68, 162],
        [84, 164],
        [100, 166],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="6" fill="var(--color-ink)" opacity="0.75" />
      ))}
      {/* face */}
      <circle cx="66" cy="132" r="4" fill="var(--color-ink)" />
      <circle cx="94" cy="132" r="4" fill="var(--color-ink)" />
      <path
        d="M64 142 q16 12 32 0"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
