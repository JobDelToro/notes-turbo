'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Stretch to fill the container (auth submit buttons). */
  fullWidth?: boolean;
  /** Optional 16px leading icon (matches the design's icon slot). */
  leadingIcon?: React.ReactNode;
  /** Shows a busy state and disables interaction. */
  loading?: boolean;
};

/**
 * Outlined pill button from the design system:
 * radius 46px, 1px gold border, 43px tall, 12/16 padding, 6px gap,
 * gold Inter-Bold 16px label.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { fullWidth, leadingIcon, loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex h-[43px] items-center justify-center gap-1.5 rounded-[46px]',
        'border border-gold bg-transparent px-4 py-3',
        'text-base font-bold leading-none text-gold',
        'transition-colors duration-150 hover:bg-gold/10 active:bg-gold/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {leadingIcon ? (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
});
