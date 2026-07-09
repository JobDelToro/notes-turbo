/**
 * Thin, typed functions for each API endpoint. These wrap `apiFetch` with the
 * correct path, method and response schema. Keeping them separate from the
 * React Query layer makes them trivial to unit test and reuse.
 *
 * Path note: the DRF router endpoints use a trailing slash (`/notes/`,
 * `/categories/`, `/notes/:id/`); the auth and AI views do not.
 */
import { apiFetch } from './api';
import {
  AiCategorizeSchema,
  AiSummarizeSchema,
  AuthResponseSchema,
  CategoryListSchema,
  type Credentials,
  NoteSchema,
  PaginatedNotesSchema,
  UserSchema,
} from './schemas';
import { z } from 'zod';

const MeSchema = z.object({ user: UserSchema });

/* ------------------------------- Auth ---------------------------------- */

export const getMe = (signal?: AbortSignal) =>
  apiFetch('/auth/me', { schema: MeSchema, signal }).then((r) => r.user);

export const login = (credentials: Credentials) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: credentials,
    schema: AuthResponseSchema,
  }).then((r) => r.user);

export const register = (credentials: Credentials) =>
  apiFetch('/auth/register', {
    method: 'POST',
    body: credentials,
    schema: AuthResponseSchema,
  }).then((r) => r.user);

export const logout = () => apiFetch('/auth/logout', { method: 'POST' });

/* ----------------------------- Categories ------------------------------ */

export const getCategories = (signal?: AbortSignal) =>
  apiFetch('/categories/', { schema: CategoryListSchema, signal });

/* ------------------------------- Notes --------------------------------- */

export const getNotes = (categoryId: number | null, signal?: AbortSignal) => {
  const query = categoryId != null ? `?category=${categoryId}` : '';
  // The list endpoint is paginated (DRF page envelope), so validate the envelope
  // and hand callers just the `results` array — `useNotes` still yields `Note[]`.
  return apiFetch(`/notes/${query}`, { schema: PaginatedNotesSchema, signal }).then(
    (page) => page.results,
  );
};

export interface CreateNoteInput {
  title: string;
  content: string;
  category: number | null;
}

export const createNote = (input: CreateNoteInput) =>
  apiFetch('/notes/', { method: 'POST', body: input, schema: NoteSchema });

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  category?: number | null;
}

export const updateNote = (id: number, patch: UpdateNoteInput) =>
  apiFetch(`/notes/${id}/`, { method: 'PATCH', body: patch, schema: NoteSchema });

export const deleteNote = (id: number) => apiFetch(`/notes/${id}/`, { method: 'DELETE' });

/* -------------------------------- AI ----------------------------------- */

export const aiCategorize = (content: string) =>
  apiFetch('/ai/categorize', {
    method: 'POST',
    body: { content },
    schema: AiCategorizeSchema,
  });

export const aiSummarize = (content: string) =>
  apiFetch('/ai/summarize', {
    method: 'POST',
    body: { content },
    schema: AiSummarizeSchema,
  });
