'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'motion/react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { Logomark } from './illustrations/Logomark';
import { AlertIcon, AutosaveIcon, LockIcon, MailIcon, SparkleIcon, TagIcon } from './icons';
import { credentialsSchema, type Credentials, type User } from '@/lib/schemas';
import type { ApiError } from '@/lib/api';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export interface AuthFormProps {
  heading: string;
  /** One supporting line under the heading. */
  subheading: string;
  submitLabel: string;
  /** The auth mutation (login or register). */
  mutation: UseMutationResult<User, ApiError, Credentials>;
  /** Prompt + link that swaps to the other screen. */
  altPrompt: string;
  altHref: string;
  altLabel: string;
  /** Where to send the user after success. */
  redirectTo?: string;
}

/** The three things the product does, shared by the showcase and the mobile strip. */
const FEATURES = [
  { icon: TagIcon, chip: 'Categories', label: 'Color-coded categories' },
  { icon: SparkleIcon, chip: 'AI assist', label: 'AI that pitches in' },
  { icon: AutosaveIcon, chip: 'Autosave', label: 'Autosave, always' },
] as const;

/**
 * Split-screen auth. On `lg`, a vivid brand showcase (tagline, a floating
 * product preview, and the three feature points) sits beside the form so the
 * screen reads as a product, not a bare prompt. On mobile the showcase collapses
 * to a compact brand header + a feature strip under the form. Validates with Zod
 * on submit, surfaces per-field and server errors, and redirects on success.
 */
export function AuthForm({
  heading,
  subheading,
  submitLabel,
  mutation,
  altPrompt,
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
    <main className="flex min-h-dvh">
      <Showcase />

      <section className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile brand (the showcase carries this on desktop). */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logomark size={44} />
            <div className="leading-tight">
              <p className="font-display text-lg font-extrabold text-ink">Notes</p>
              <p className="text-xs text-ink-muted">think in color</p>
            </div>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subheading}</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
            <TextInput
              type="email"
              name="email"
              label="Email"
              autoComplete="email"
              placeholder="you@example.com"
              leadingIcon={<MailIcon size={18} />}
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              error={fieldErrors.email}
            />
            <TextInput
              type="password"
              name="password"
              label="Password"
              autoComplete="current-password"
              placeholder="••••••••"
              leadingIcon={<LockIcon size={18} />}
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              error={fieldErrors.password}
            />

            {serverError ? (
              <motion.p
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 rounded-[var(--radius-field)] border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-medium text-danger"
              >
                <AlertIcon size={16} className="shrink-0" />
                {serverError}
              </motion.p>
            ) : null}

            <Button type="submit" fullWidth loading={mutation.isPending} className="mt-1">
              {mutation.isPending ? 'Just a sec…' : submitLabel}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {altPrompt}{' '}
            <Link
              href={altHref}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {altLabel}
            </Link>
          </p>

          {/* Mobile-only feature strip so the screen isn't a bare form on phones. */}
          <ul className="mt-8 flex flex-col gap-2 lg:hidden">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-ink-muted">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icon size={15} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </motion.div>
      </section>
    </main>
  );
}

/** The desktop-only brand panel: gradient, drifting blobs, a product preview, features. */
function Showcase() {
  return (
    <aside
      className="relative hidden w-[46%] max-w-[620px] shrink-0 flex-col justify-between overflow-hidden p-12 text-white lg:flex"
      style={{ background: 'linear-gradient(150deg, var(--color-primary), var(--color-accent))' }}
    >
      {/* Ambient drifting blobs (behind everything). */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        animate={{ y: [0, 24, 0], x: [0, 12, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-[var(--color-primary)]/40 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, -14, 0] }}
        transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
      />

      {/* Brand */}
      <div className="relative z-10 flex items-center gap-3">
        <Logomark size={40} tone="light" />
        <span className="font-display text-xl font-extrabold tracking-tight">Notes</span>
      </div>

      {/* Headline + product preview */}
      <div className="relative z-10 my-8">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[40px] font-extrabold leading-[1.05] tracking-tight"
        >
          Think in color.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/85"
        >
          A calm home for every idea — tag it by color, and let AI file it and sum it up for you.
        </motion.p>

        <ProductPreview />
      </div>

      {/* Feature chips + privacy line */}
      <div className="relative z-10">
        <ul className="flex flex-wrap gap-2">
          {FEATURES.map(({ icon: Icon, chip }) => (
            <li
              key={chip}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-medium backdrop-blur-sm"
            >
              <Icon size={15} />
              {chip}
            </li>
          ))}
        </ul>
        <p className="mt-5 flex items-center gap-2 text-[13px] text-white/70">
          <LockIcon size={15} />
          Private to you — only you can see your notes.
        </p>
      </div>
    </aside>
  );
}

/** A slightly tilted mini "All Notes" board that floats — the product, previewed. */
function ProductPreview() {
  const previews = [
    { color: 'var(--color-cat-personal)', title: 'Weekend plan', line: 'w-4/5', tag: 'Personal' },
    { color: 'var(--color-cat-school)', title: 'Chem revision', line: 'w-2/3', tag: 'School' },
    { color: 'var(--color-cat-random)', title: 'Shower idea', line: 'w-3/4', tag: 'Random' },
  ];

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: 20, rotate: -6 }}
      animate={{ opacity: 1, y: [0, -8, 0], rotate: -4 }}
      transition={{
        opacity: { duration: 0.6, delay: 0.2 },
        rotate: { duration: 0.6, delay: 0.2 },
        y: { repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 0.6 },
      }}
      className="mt-10 w-[300px] rounded-[var(--radius-card)] bg-white p-4 text-ink shadow-2xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm font-extrabold text-ink">All Notes</span>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[13px] font-bold text-on-primary">
          +
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {previews.map((p) => (
          <div
            key={p.title}
            className="relative overflow-hidden rounded-xl border p-2.5"
            style={{ borderColor: `${'var(--color-border)'}`, background: 'var(--color-surface)' }}
          >
            <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: p.color }} />
            <div className="pl-2">
              <p className="text-[13px] font-bold leading-tight text-ink">{p.title}</p>
              <span
                className={`mt-1.5 block h-1.5 ${p.line} rounded-full bg-[var(--color-surface-2)]`}
              />
              <span
                className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-ink"
                style={{ backgroundColor: `color-mix(in srgb, ${p.color} 18%, transparent)` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
