'use client';

import { forwardRef, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { EyeIcon, EyeOffIcon } from './icons';

type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  /** Validation message; renders below and wires up aria-describedby. */
  error?: string;
  /** Optional icon rendered inside the field on the left (e.g. a mail glyph). */
  leadingIcon?: React.ReactNode;
  /**
   * `password` renders an eye toggle on the right that flips visibility.
   * Any other value is passed straight to the underlying input.
   */
  type?: React.HTMLInputTypeAttribute;
};

/**
 * Field input in the "Pop" system: 44px tall (a comfortable touch target),
 * rounded, on a surface fill with a soft border that turns violet on focus.
 * An optional leading icon and the password eye toggle share the same insets.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, leadingIcon, type = 'text', id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword ? (revealed ? 'text' : 'password') : type;

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leadingIcon ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-ink-muted"
          >
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-11 w-full rounded-[var(--radius-field)] border border-border bg-surface',
            'px-4 text-sm text-ink placeholder:text-ink-muted',
            'transition-[border-color,box-shadow] duration-150',
            'focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35',
            Boolean(leadingIcon) && 'pl-11',
            isPassword && 'pr-11',
            error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/30',
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-muted transition-colors hover:text-ink"
          >
            {revealed ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
