'use client';

import type { Note } from '@/lib/schemas';
import { NoteCard } from './NoteCard';

export interface NoteGridProps {
  notes: Note[];
  onOpen: (note: Note) => void;
}

/**
 * Masonry-style layout using CSS columns: 1 column on small screens, 2 on
 * medium, 3 on large — with a 16px gap. Cards avoid breaking across columns.
 */
export function NoteGrid({ notes, onOpen }: NoteGridProps) {
  return (
    <div className="columns-1 gap-4 [column-fill:_balance] sm:columns-2 xl:columns-3">
      {notes.map((note) => (
        <div key={note.id} className="mb-4 break-inside-avoid">
          <NoteCard note={note} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}
