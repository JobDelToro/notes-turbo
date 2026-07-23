'use client';

import type { Note } from '@/lib/schemas';
import { categoryColor, withAlpha } from '@/lib/categoryColor';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface NoteCardProps {
  note: Note;
  onOpen: (note: Note) => void;
  className?: string;
}

/**
 * A note tile in the "Pop" system: a surface card with a soft category-tinted
 * wash, a solid category accent bar on top, and a category pill in the footer.
 * The category color is the only saturated hue — it tags the note, nothing more.
 * Dark-text-on-light-tint keeps the pill readable (WCAG AA) regardless of hue.
 */
export function NoteCard({ note, onOpen, className }: NoteCardProps) {
  const color = categoryColor(note.category_detail);
  const categoryName = note.category_detail?.name ?? 'Uncategorized';

  return (
    <button
      type="button"
      onClick={() => onOpen(note)}
      style={{
        // Tint composited over the opaque surface so it works in light and dark.
        background: `linear-gradient(180deg, ${withAlpha(color, 0.16)}, ${withAlpha(color, 0.05)}), var(--color-surface)`,
        borderColor: withAlpha(color, 0.34),
      }}
      className={cn(
        'group relative flex w-full flex-col gap-2.5 overflow-hidden rounded-[var(--radius-card)] border p-4 text-left',
        'shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-spring)]',
        'hover:-translate-y-1 hover:shadow-[var(--shadow-card)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color }}
      />

      <h3 className="mt-1.5 font-display text-lg font-bold leading-snug text-ink">
        {note.title || 'Untitled note'}
      </h3>

      {note.content ? (
        <p className="line-clamp-4 text-sm leading-relaxed text-ink-muted">{note.content}</p>
      ) : (
        <p className="text-sm italic text-ink-muted/70">No content yet…</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink"
          style={{ backgroundColor: withAlpha(color, 0.16) }}
        >
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {categoryName}
        </span>
        <span className="shrink-0 text-xs text-ink-muted">
          Edited {formatRelative(note.updated_at)}
        </span>
      </div>
    </button>
  );
}
