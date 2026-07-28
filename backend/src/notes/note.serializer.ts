import { Note } from '../entities/note.entity';

export interface NoteDto {
  id: number;
  title: string;
  content: string;
  category: number | null;
  category_detail: { id: number; name: string; color: string } | null;
  created_at: string;
  updated_at: string;
}

/** Map a Note entity (with its `category` relation loaded) to the API shape. */
export function serializeNote(note: Note): NoteDto {
  const cat = note.category ?? null;
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    category: note.categoryId ?? null,
    category_detail: cat ? { id: cat.id, name: cat.name, color: cat.color } : null,
    created_at: new Date(note.createdAt).toISOString(),
    updated_at: new Date(note.updatedAt).toISOString(),
  };
}
