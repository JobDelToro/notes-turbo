/**
 * Shared test fixtures mirroring the API contract.
 */
import type { Category, Note } from '@/lib/schemas';

export const categories: Category[] = [
  { id: 1, name: 'Random Thoughts', color: '#EF9C66', note_count: 2 },
  { id: 2, name: 'School', color: '#FCDC94', note_count: 1 },
  { id: 3, name: 'Personal', color: '#78ABA8', note_count: 3 },
  { id: 4, name: 'Drama', color: '#C8CFA0', note_count: 0 },
];

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 100,
    title: 'A tidy title',
    content: 'Some body text that should be visible in the card.',
    category: 3,
    category_detail: { id: 3, name: 'Personal', color: '#78ABA8' },
    created_at: '2026-07-06T15:07:00Z',
    updated_at: '2026-07-06T15:07:00Z',
    ...overrides,
  };
}

export const notes: Note[] = [
  makeNote({
    id: 1,
    title: 'Buy groceries',
    category: 3,
    category_detail: { id: 3, name: 'Personal', color: '#78ABA8' },
  }),
  makeNote({
    id: 2,
    title: 'Physics homework',
    category: 2,
    category_detail: { id: 2, name: 'School', color: '#FCDC94' },
  }),
  makeNote({
    id: 3,
    title: 'Random idea',
    category: 1,
    category_detail: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
  }),
];
