'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { Cactus } from './illustrations/Cactus';
import { credentialsSchema, type Credentials, type User } from '@/lib/schemas';
import type { ApiError } from '@/lib/api';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export interface AuthFormProps {
  heading: string;
  submitLabel: string;
  /** The auth mutation (login or register). */
  mutation: UseMutationResult<User, ApiError, Credentials>;
  /** Swap-screen link. */
  altHref: string;
  altLabel: string;
  /** Where to send the user after success. */
  redirectTo?: string;
}

/**
 * Shared authentication form for the Sign Up and Login screens.
 * Validates with Zod on submit, surfaces per-field and server errors, and
 * redirects on success. Layout mirrors the Figma auth screens.
 */
export function AuthForm({
  heading,
  submitLabel,
  mutation,
  altHref,
  altLabel,
  redirectTo = '/notes',
}: AuthFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Credentials>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const serverError = mutation.error?.message ?? null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = credentialsSchema.safeParse(values);
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === 'email' || key === 'password') next[key] ??= issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    mutation.mutate(result.data, {
      onSuccess: () => router.push(redirectTo),
    });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-12">
      <div className="flex w-full max-w-[384px] flex-col items-center">
        {/* TODO: swap real Figma asset */}
        <Cactus className="mb-6 h-[134px] w-[188px]" />

        <h1 className="mb-8 text-center font-serif text-[48px] font-bold leading-tight text-ink">
          {heading}
        </h1>

        <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">
          <TextInput
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            aria-label="Email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            error={fieldErrors.email}
          />
          <TextInput
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            error={fieldErrors.password}
          />

          {serverError ? (
            <p role="alert" className="text-center text-xs text-red-600">
              {serverError}
            </p>
          ) : null}

          <Button type="submit" fullWidth loading={mutation.isPending} className="mt-2">
            {mutation.isPending ? 'Just a sec…' : submitLabel}
          </Button>
        </form>

        <Link href={altHref} className="mt-6 text-xs text-gold underline-offset-4 hover:underline">
          {altLabel}
        </Link>
      </div>
    </main>
  );
}
