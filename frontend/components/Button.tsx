'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'md' | 'sm';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Stretch to fill the container (auth submit buttons). */
  fullWidth?: boolean;
  /** Optional leading icon in an 18px slot. */
  leadingIcon?: React.ReactNode;
  /** Shows a busy spinner and disables interaction. */
  loading?: boolean;
};

// Filled primary carries the brand; ghost/outline are the quiet secondaries.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-[var(--shadow-card)] hover:bg-primary-hover',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  outline: 'border border-border bg-surface text-ink hover:bg-surface-2',
};

const SIZES: Record<Size, string> = {
  md: 'h-11 gap-2 px-5 text-[15px]',
  sm: 'h-9 gap-1.5 px-3.5 text-sm',
};

/**
 * The one button. A springy tactile press (`active:scale`), a brand-colored
 * focus ring, and a spinner for pending actions. Motion is CSS-only here so the
 * component stays a plain, ref-forwarding `<button>` with no prop-type friction.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth,
    leadingIcon,
    loading,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full font-semibold leading-none',
        'transition-[transform,background-color,box-shadow] duration-150 ease-[var(--ease-spring)]',
        'active:scale-[0.96] disabled:pointer-events-none disabled:opacity-60',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : leadingIcon ? (
        <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
});
