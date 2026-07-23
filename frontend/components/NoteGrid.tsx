'use client';

import { motion } from 'motion/react';
import type { Note } from '@/lib/schemas';
import { NoteCard } from './NoteCard';

export interface NoteGridProps {
  notes: Note[];
  onOpen: (note: Note) => void;
}

/**
 * Masonry layout (CSS columns: 1 → 2 → 3) where each card floats up and settles
 * with a short, capped stagger — enough to feel alive, never enough to make the
 * user wait. Honors reduce-motion via the app-wide MotionConfig.
 */
export function NoteGrid({ notes, onOpen }: NoteGridProps) {
  return (
    <div className="columns-1 gap-4 [column-fill:_balance] sm:columns-2 xl:columns-3">
      {notes.map((note, i) => (
        <motion.div
          key={note.id}
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 break-inside-avoid"
        >
          <NoteCard note={note} onOpen={onOpen} />
        </motion.div>
      ))}
    </div>
  );
}
