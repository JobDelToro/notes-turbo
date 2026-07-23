'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Category, Note } from '@/lib/schemas';
import { useAiCategorize, useAiSummarize, useDeleteNote, useUpdateNote } from '@/lib/queries';
import { categoryColor } from '@/lib/categoryColor';
import { formatLastEdited, readingMinutes, wordCount } from '@/lib/format';
import { useDebouncedCallback } from '@/lib/useDebouncedCallback';
import { cn } from '@/lib/cn';
import { CategoryDropdown } from './CategoryDropdown';
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon, SparkleIcon, TrashIcon } from './icons';

const AUTOSAVE_DELAY_MS = 600;

/** Typed AI feedback — drives the styled banner (color, icon, optional retry). */
type AiFeedback = {
  tone: 'error' | 'info' | 'success';
  message: string;
  retry?: () => void;
};

export interface NoteEditorProps {
  note: Note;
  categories: Category[];
  onClose: () => void;
}

/**
 * Note editor. A bottom sheet on mobile, a centered modal on desktop.
 *
 * - Title and body are controlled locally and autosaved (debounced ~600ms) via
 *   an optimistic PATCH, so the grid updates live and "Last Edited" advances.
 * - The "AI Assist" panel makes the value obvious: it files the note under the
 *   right category (with a "Filed under …" confirmation) and returns an animated
 *   summary. All AI outcomes render as a typed banner — success / info / error
 *   (with a Try-again) — never bare text.
 * - The browser Back button (and mobile swipe-back) closes the editor instead of
 *   navigating away, via a pushed history entry.
 */
export function NoteEditor({ note, categories, onClose }: NoteEditorProps) {
  const updateNote = useUpdateNote();
  const aiCategorize = useAiCategorize();
  const aiSummarize = useAiSummarize();
  const deleteNote = useDeleteNote();

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [categoryId, setCategoryId] = useState<number | null>(note.category);
  const [lastEdited, setLastEdited] = useState(note.updated_at);
  const [summary, setSummary] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AiFeedback | null>(null);
  // 'saved' at rest (the note already exists); 'pending' while an edit debounces;
  // 'saving' while the PATCH is in flight. Drives the footer status indicator.
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving'>('saved');

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const accentColor = selectedCategory
    ? categoryColor(selectedCategory)
    : note.category_detail
      ? categoryColor(note.category_detail)
      : 'var(--color-primary)';

  const words = wordCount(content);
  const readMins = readingMinutes(words);

  // Accumulate edits in a ref so a rapid title-then-content change never drops a
  // field — the debounce only keeps the last call, so the *patch* must merge here.
  const pendingRef = useRef<{ title?: string; content?: string; category?: number | null }>({});

  const flushPending = useCallback(() => {
    const patch = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(patch).length === 0) return;
    const optimistic =
      patch.category !== undefined
        ? { category_detail: categories.find((c) => c.id === patch.category) ?? null }
        : undefined;
    setSaveState('saving');
    updateNote.mutate(
      { id: note.id, patch, optimistic },
      {
        onSuccess: (updated) => {
          setLastEdited(updated.updated_at);
          setSaveState('saved');
        },
        // The autosave hook rolls back / reconciles on error; drop the spinner so
        // the footer doesn't hang on "Saving…".
        onError: () => setSaveState('saved'),
      },
    );
  }, [categories, note.id, updateNote]);

  const autosave = useDebouncedCallback(flushPending, AUTOSAVE_DELAY_MS);

  function handleTitleChange(next: string) {
    setTitle(next);
    setSaveState('pending');
    pendingRef.current.title = next;
    autosave.call();
  }

  function handleContentChange(next: string) {
    setContent(next);
    setSummary(null);
    setAiFeedback(null);
    setSaveState('pending');
    pendingRef.current.content = next;
    autosave.call();
  }

  const handleCategoryChange = useCallback(
    (nextId: number | null) => {
      setCategoryId(nextId);
      // Category saves immediately (snappy recolor + counts), flushing any pending
      // title/content edit in the same PATCH so nothing is lost. `null` is valid
      // (moves the note to Uncategorized) and is PATCHed as `category: null`.
      pendingRef.current.category = nextId;
      autosave.cancel();
      flushPending();
    },
    [autosave, flushPending],
  );

  const handleClose = useCallback(() => {
    autosave.cancel();
    flushPending();
    onClose();
  }, [autosave, flushPending, onClose]);

  const handleDelete = useCallback(() => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    // Cancel any in-flight debounced autosave and drop pending edits so no PATCH
    // races the delete (which would resurrect the row optimistically).
    autosave.cancel();
    pendingRef.current = {};
    deleteNote.mutate(note.id, { onSuccess: onClose });
  }, [autosave, deleteNote, note.id, onClose]);

  async function handleSuggestCategory() {
    setAiFeedback(null);
    // The AI has nothing to work with on an empty note — say so instead of no-op.
    if (!content.trim()) {
      setAiFeedback({
        tone: 'info',
        message: 'Write something first, then let the AI suggest a category.',
      });
      return;
    }
    try {
      const result = await aiCategorize.mutateAsync(content);
      // The backend falls back to a keyword heuristic when no LLM key is set, so a
      // suggestion still comes back — apply it, and confirm where it landed.
      if (result.category_id != null) {
        handleCategoryChange(result.category_id);
        const name = categories.find((c) => c.id === result.category_id)?.name ?? 'a category';
        setAiFeedback({
          tone: 'success',
          message: result.available
            ? `Filed under ${name}`
            : `Filed under ${name} · keyword guess — add a Groq key for smarter AI`,
        });
      } else {
        setAiFeedback({
          tone: 'info',
          message: "The AI couldn't pick a category — try adding a bit more detail.",
        });
      }
    } catch {
      // 429/500/timeout/network — offer a retry rather than a dead end.
      setAiFeedback({
        tone: 'error',
        message: 'Could not reach the AI service.',
        retry: handleSuggestCategory,
      });
    }
  }

  async function handleSummarize() {
    setAiFeedback(null);
    if (!content.trim()) {
      setAiFeedback({
        tone: 'info',
        message: 'Write something first, then let the AI summarize it.',
      });
      return;
    }
    try {
      const result = await aiSummarize.mutateAsync(content);
      if (result.summary) {
        setSummary(result.summary);
        if (!result.available) {
          setAiFeedback({
            tone: 'info',
            message: 'Keyword-based summary — add a Groq key for smarter AI.',
          });
        }
      } else {
        setAiFeedback({
          tone: 'info',
          message: "The AI couldn't summarize this — try adding a bit more detail.",
        });
      }
    } catch {
      setAiFeedback({
        tone: 'error',
        message: 'Could not reach the AI service.',
        retry: handleSummarize,
      });
    }
  }

  // Close on Escape.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose]);

  // Back button (and mobile swipe-back) closes the editor instead of leaving the
  // app: push a history entry on open; a popstate closes the modal; a UI-driven
  // close consumes the entry so Back stays balanced. Runs once — `onClose` is read
  // via a ref so the effect never re-pushes on a parent re-render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    // One extra history entry so a Back press pops it and closes the modal
    // instead of leaving /notes. We deliberately don't rewind on a UI-driven
    // close: a stray back() during React StrictMode's mount/unmount cycle could
    // fire a popstate and slam the editor shut the instant it opens.
    window.history.pushState({ noteEditor: true }, '');
    const onPopState = () => onCloseRef.current();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Focus management (a11y): on open, remember what was focused and move focus
  // into the dialog. On unmount, restore focus to the previously-focused element.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    (titleInputRef.current ?? dialogRef.current)?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  // Trap Tab within the dialog: wrap focus from last→first (and Shift+Tab
  // first→last) so focus can never escape the modal.
  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={handleClose}
      role="presentation"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Note editor"
        tabIndex={-1}
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 28, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col gap-4 overflow-hidden border border-border bg-surface p-5',
          'rounded-t-[26px] shadow-[var(--shadow-lg)] sm:max-h-[86vh] sm:max-w-3xl sm:rounded-[24px] sm:p-6',
          'focus:outline-none',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: accentColor }}
        />
        <div aria-hidden className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" />

        {/* Top bar */}
        <div className="flex items-start justify-between gap-3">
          <CategoryDropdown
            categories={categories}
            value={categoryId}
            onChange={handleCategoryChange}
          />
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteNote.isPending}
              aria-label="Delete note"
              title="Delete note"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
            >
              <TrashIcon size={17} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close editor"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* AI Assist — the value, made obvious */}
        <div
          data-tour="ai"
          className="shrink-0 rounded-[var(--radius-menu)] border border-border bg-surface-2/50 p-3"
        >
          <div className="mb-2.5 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-primary">
              <SparkleIcon size={13} />
            </span>
            <span className="text-sm font-semibold text-ink">AI Assist</span>
            <span className="hidden text-xs text-ink-muted sm:inline">
              — file &amp; summarize this note
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AiButton
              onClick={handleSuggestCategory}
              loading={aiCategorize.isPending}
              label="Suggest category"
            />
            <AiButton onClick={handleSummarize} loading={aiSummarize.isPending} label="Summarize" />
          </div>

          <AnimatePresence>
            {aiFeedback ? (
              <AiFeedbackBanner key={aiFeedback.message} feedback={aiFeedback} />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {summary ? (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-primary/20 bg-primary-soft/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <SparkleIcon size={12} /> Summary
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink">{summary}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Editable title */}
        <input
          ref={titleInputRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          aria-label="Note title"
          className="w-full shrink-0 bg-transparent font-display text-3xl font-extrabold text-ink placeholder:text-ink-muted/50 focus:outline-none"
        />

        {/* Editable body */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Pour your heart out…"
          aria-label="Note content"
          className="min-h-0 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-ink placeholder:text-ink-muted/50 focus:outline-none"
        />

        {/* Status footer: live word count + save state. */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3 text-xs text-ink-muted">
          <span className="tabular-nums">
            {words} {words === 1 ? 'word' : 'words'}
            {readMins > 0 ? ` · ${readMins} min read` : ''}
          </span>
          <SaveIndicator saving={saveState !== 'saved'} lastEdited={lastEdited} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function AiButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5',
        'text-xs font-semibold text-primary transition-[transform,background-color]',
        'hover:bg-primary/15 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        <SparkleIcon size={13} />
      )}
      {loading ? 'Thinking…' : label}
    </button>
  );
}

/** Footer save status: a spinner while saving, a green check + timestamp at rest. */
function SaveIndicator({ saving, lastEdited }: { saving: boolean; lastEdited: string }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        Saving…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckIcon size={13} className="text-success" />
      Saved
      <span className="hidden sm:inline">· {formatLastEdited(lastEdited)}</span>
    </span>
  );
}

/** Typed AI result banner: success / info / error (with a Try-again). */
function AiFeedbackBanner({ feedback }: { feedback: AiFeedback }) {
  const { tone } = feedback;
  const styles =
    tone === 'error'
      ? 'border-danger/30 bg-danger/10 text-danger'
      : tone === 'success'
        ? 'border-primary/25 bg-primary-soft text-primary'
        : 'border-border bg-surface-2/70 text-ink-muted';
  const Icon = tone === 'error' ? AlertIcon : tone === 'success' ? SparkleIcon : InfoIcon;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
      role="status"
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium',
          styles,
        )}
      >
        <Icon size={15} className="shrink-0" />
        <span className="flex-1 leading-snug">{feedback.message}</span>
        {feedback.retry ? (
          <button
            type="button"
            onClick={feedback.retry}
            className="shrink-0 rounded-full bg-danger/15 px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/25"
          >
            Try again
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
