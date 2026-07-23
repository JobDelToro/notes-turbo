'use client';

import { useId } from 'react';

export interface LogomarkProps {
  size?: number;
  className?: string;
  /**
   * `brand` fills the tile with the violet→coral brand gradient (for light
   * surfaces); `light` uses a translucent-white tile (for the dark showcase
   * panel, where the gradient would disappear).
   */
  tone?: 'brand' | 'light';
}

/**
 * The Notes glyph: a rounded tile with three "written lines". Used on the auth
 * screens and the workspace rail as the app's brand mark. The gradient id is
 * per-instance (useId) so multiple marks on one page never collide.
 */
export function Logomark({ size = 40, className, tone = 'brand' }: LogomarkProps) {
  const gid = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {tone === 'brand' ? (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--color-primary)" />
            <stop offset="1" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
      ) : null}
      <rect
        width="40"
        height="40"
        rx="12"
        fill={tone === 'brand' ? `url(#${gid})` : 'rgba(255,255,255,0.16)'}
      />
      <path
        d="M12 15h16M12 20.5h16M12 26h9"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
