'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category, Note } from '@/lib/schemas';
import { useAiCategorize, useAiSummarize, useDeleteNote, useUpdateNote } from '@/lib/queries';
import { categoryColor, overCream, UNCATEGORIZED_COLOR } from '@/lib/categoryColor';
import { formatLastEdited } from '@/lib/format';
import { useDebouncedCallback } from '@/lib/useDebouncedCallback';
import { cn } from '@/lib/cn';
import { CategoryDropdown } from './CategoryDropdown';
import { CloseIcon, SparkleIcon, TrashIcon } from './icons';

const AUTOSAVE_DELAY_MS = 600;

export interface NoteEditorProps {
  note: Note;
  categories: Category[];
  onClose: () => void;
}

/**
 * Full-screen note editor overlay.
 *
 * - Title and body are controlled locally and autosaved (debounced ~600ms) via
 *   an optimistic PATCH, so the grid updates live and the "Last Edited" stamp
 *   advances.
 * - Choosing a category recolors the surface immediately.
 * - AI actions suggest a category or summarize the body. Without an LLM key the
 *   backend still answers via a keyword heuristic, so the result is applied and a
 *   subtle note flags that it was keyword-based rather than the real model.
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
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  // When a category is selected, color from it. When explicitly uncategorized
  // (null), fall back to the neutral gold rather than the note's stale detail.
  const surfaceColor = selectedCategory
    ? categoryColor(selectedCategory)
    : categoryId === null
      ? UNCATEGORIZED_COLOR
      : categoryColor(note.category_detail);

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
    updateNote.mutate(
      { id: note.id, patch, optimistic },
      { onSuccess: (updated) => setLastEdited(updated.updated_at) },
    );
  }, [categories, note.id, updateNote]);

  const autosave = useDebouncedCallback(flushPending, AUTOSAVE_DELAY_MS);

  function handleTitleChange(next: string) {
    setTitle(next);
    pendingRef.current.title = next;
    autosave.call();
  }

  function handleContentChange(next: string) {
    setContent(next);
    setSummary(null);
    pendingRef.current.content = next;
    autosave.call();
  }

  const handleCategoryChange = useCallback(
    (nextId: number | null) => {
      setCategoryId(nextId);
      // Category saves immediately (snappy recolor + counts), flushing any pending
      // title/content edit in the same PATCH so nothing is lost. `null` is a valid
      // value (moves the note to Uncategorized) and is PATCHed as `category: null`.
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
    // races the delete (which would recreate/resurrect the row optimistically).
    autosave.cancel();
    pendingRef.current = {};
    deleteNote.mutate(note.id, { onSuccess: onClose });
  }, [autosave, deleteNote, note.id, onClose]);

  async function handleSuggestCategory() {
    setAiNotice(null);
    // The AI has nothing to work with on an empty note — say so instead of no-op.
    if (!content.trim()) {
      setAiNotice('Write something first, then let the AI suggest a category.');
      return;
    }
    try {
      const result = await aiCategorize.mutateAsync(content);
      // The backend falls back to a keyword heuristic when no LLM key is set, so a
      // suggestion still comes back — apply it, and just flag it as keyword-based.
      if (result.category_id != null) {
        handleCategoryChange(result.category_id);
        if (!result.available) {
          setAiNotice('Keyword guess — add a Groq key for smarter AI');
        }
      } else {
        setAiNotice("The AI couldn't pick a category — try adding a bit more detail.");
      }
    } catch {
      // 429/500/timeout/network — surface a retry hint and apply nothing.
      setAiNotice('Could not reach the AI service. Try again.');
    }
  }

  async function handleSummarize() {
    setAiNotice(null);
    if (!content.trim()) {
      setAiNotice('Write something first, then let the AI summarize it.');
      return;
    }
    try {
      const result = await aiSummarize.mutateAsync(content);
      if (result.summary) {
        setSummary(result.summary);
        if (!result.available) {
          setAiNotice('Keyword-based — add a Groq key for smarter AI');
        }
      } else {
        setAiNotice("The AI couldn't summarize this — try adding a bit more detail.");
      }
    } catch {
      // 429/500/timeout/network — surface a retry hint and apply nothing.
      setAiNotice('Could not reach the AI service. Try again.');
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

  // Focus management (a11y): on open, remember what was focused and move focus
  // into the dialog. On unmount, restore focus to the previously-focused element
  // so keyboard/screen-reader users land back where they started. Runs once.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    (titleInputRef.current ?? dialogRef.current)?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  // Trap Tab within the dialog: wrap focus from the last focusable to the first
  // (and Shift+Tab from first to last) so focus can never escape the modal.
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Note editor"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        style={{
          backgroundColor: overCream(surfaceColor, 0.5),
          borderColor: surfaceColor,
          boxShadow: 'var(--shadow-card)',
        }}
        className="flex h-[700px] max-h-[92vh] w-full max-w-[1199px] flex-col gap-4 rounded-[11px] border-[3px] p-6 sm:p-8 focus:outline-none"
      >
        {/* Top bar */}
        <div className="flex items-start justify-between gap-4">
          <CategoryDropdown
            categories={categories}
            value={categoryId}
            onChange={handleCategoryChange}
          />

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-ink/70 sm:inline">
              Last Edited: {formatLastEdited(lastEdited)}
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteNote.isPending}
              aria-label="Delete note"
              title="Delete note"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
            >
              <TrashIcon size={17} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close editor"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-black/10"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* AI actions */}
        <div className="flex flex-wrap items-center gap-2">
          <AiButton
            onClick={handleSuggestCategory}
            loading={aiCategorize.isPending}
            label="Suggest category"
          />
          <AiButton onClick={handleSummarize} loading={aiSummarize.isPending} label="Summarize" />
          {aiNotice ? (
            <span
              role="status"
              title="Keyword fallback is active. Set LLM_API_KEY (Groq) on the backend for smarter AI."
              className="rounded-full bg-black/5 px-2 py-1 text-[11px] text-ink/60"
            >
              {aiNotice}
            </span>
          ) : null}
        </div>

        {summary ? (
          <div className="rounded-md bg-surface/70 p-3 text-xs text-ink/80">
            <span className="font-semibold">Summary: </span>
            {summary}
          </div>
        ) : null}

        {/* Editable title */}
        <input
          ref={titleInputRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note Title"
          aria-label="Note title"
          className="w-full bg-transparent font-serif text-4xl font-bold text-ink placeholder:text-ink/40 focus:outline-none"
        />

        {/* Editable body */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Pour your heart out..."
          aria-label="Note content"
          className="min-h-0 flex-1 resize-none bg-transparent text-sm leading-relaxed text-ink placeholder:text-ink/40 focus:outline-none"
        />
      </div>
    </div>
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
        'inline-flex items-center gap-1.5 rounded-full border border-gold/70 bg-surface/60',
        'px-3 py-1.5 text-xs font-medium text-gold transition-colors',
        'hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      <SparkleIcon size={14} />
      {loading ? 'Thinking…' : label}
    </button>
  );
}
