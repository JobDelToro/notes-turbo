'use client';

import { forwardRef, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { EyeIcon, EyeOffIcon } from './icons';

type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  /** Validation message; renders below and wires up aria-describedby. */
  error?: string;
  /**
   * `password` renders an eye toggle on the right that flips visibility.
   * Any other value is passed straight to the underlying input.
   */
  type?: React.HTMLInputTypeAttribute;
};

/**
 * Field input from the design system: 1px gold border, radius 6px, 39px tall,
 * 7/15 padding, Inter 12px. Password variant adds a right-aligned eye toggle.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, type = 'text', id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword ? (revealed ? 'text' : 'password') : type;

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {label ? (
        <label htmlFor={inputId} className="text-xs font-medium text-ink">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-[39px] w-full rounded-[6px] border border-gold bg-transparent',
            'px-[15px] py-[7px] text-xs text-ink placeholder:text-ink-muted',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
            isPassword && 'pr-10',
            error && 'border-red-500',
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gold hover:text-ink"
          >
            {revealed ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
