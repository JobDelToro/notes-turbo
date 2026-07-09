'use client';

import type { Note } from '@/lib/schemas';
import { cardColorStyle, categoryColor } from '@/lib/categoryColor';
import { formatCardDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface NoteCardProps {
  note: Note;
  onOpen: (note: Note) => void;
  className?: string;
}

/**
 * A single note tile. Fill and border derive from the note's category color
 * (50%-alpha fill, 3px solid border). Title uses Inria Serif Bold 24px; the
 * body is clamped to a few lines with an ellipsis.
 */
export function NoteCard({ note, onOpen, className }: NoteCardProps) {
  const colors = cardColorStyle(note.category_detail);
  const dotColor = categoryColor(note.category_detail);
  const categoryName = note.category_detail?.name ?? 'Uncategorized';

  return (
    <button
      type="button"
      onClick={() => onOpen(note)}
      style={{
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        boxShadow: 'var(--shadow-card)',
      }}
      className={cn(
        'flex w-full break-inside-avoid flex-col gap-3 rounded-[11px] border-[3px]',
        'p-4 text-left transition-transform duration-150 hover:-translate-y-0.5',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        className,
      )}
    >
      <h3 className="font-serif text-2xl font-bold leading-tight text-ink">
        {note.title || 'Untitled note'}
      </h3>

      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-ink">{formatCardDate(note.updated_at)}</span>
        <span
          aria-hidden
          className="inline-block h-[11px] w-[11px] shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="font-normal text-ink">{categoryName}</span>
      </div>

      {note.content ? (
        <p className="line-clamp-4 text-xs leading-relaxed text-ink/90">{note.content}</p>
      ) : (
        <p className="text-xs italic text-ink/50">No content yet…</p>
      )}
    </button>
  );
}
