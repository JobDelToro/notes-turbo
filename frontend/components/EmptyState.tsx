'use client';

import { motion } from 'motion/react';
import { Button } from './Button';
import { PlusIcon, SparkleIcon } from './icons';

/** A pre-filled starting point offered on the first-run empty state. */
export type NoteTemplate = { title: string; content: string };

export interface EmptyStateProps {
  /** Called by the primary CTA to create the first (blank) note. */
  onNew?: () => void;
  /** Called by a starter chip to create a pre-filled note. */
  onUseTemplate?: (template: NoteTemplate) => void;
  /** True when the emptiness is due to a category filter (vs. no notes at all). */
  filtered?: boolean;
}

/** Starter templates — a running start that also demos the AI on day one. */
const TEMPLATES: Array<{ emoji: string; label: string } & NoteTemplate> = [
  { emoji: '📝', label: 'Daily journal', title: 'Daily journal', content: 'Today I…\n\n' },
  { emoji: '✅', label: 'To-do list', title: 'To-do list', content: '- \n- \n- ' },
  { emoji: '💡', label: 'Idea dump', title: 'Idea dump', content: '' },
];

/**
 * Designed empty state: a gently floating brand mark, a clear headline, one line
 * that teaches the AI value, a single obvious call-to-action, and — on first run
 * — a row of starter templates so the blank screen offers a running start.
 */
export function EmptyState({ onNew, onUseTemplate, filtered }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-primary-soft text-primary shadow-[var(--shadow-card)]"
      >
        <SparkleIcon size={40} />
      </motion.div>

      <h2 className="font-display text-2xl font-bold text-ink">
        {filtered ? 'Nothing here yet' : 'Your canvas is empty'}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
        {filtered
          ? 'No notes in this category yet. Create one and it lands right here.'
          : 'Jot down a thought, then let the AI file it under the right category and summarize it for you.'}
      </p>

      {onNew ? (
        <Button onClick={onNew} leadingIcon={<PlusIcon size={18} />} className="mt-6">
          Write your first note
        </Button>
      ) : null}

      {!filtered && onUseTemplate ? (
        <div className="mt-9">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Or start from a template
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {TEMPLATES.map((t, i) => (
              <motion.button
                key={t.label}
                type="button"
                onClick={() => onUseTemplate({ title: t.title, content: t.content })}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink shadow-[var(--shadow-sm)] transition-colors hover:border-primary/40 hover:bg-surface-2"
              >
                <span aria-hidden>{t.emoji}</span>
                {t.label}
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
