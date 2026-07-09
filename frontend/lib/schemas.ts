/**
 * Zod schemas — the runtime boundary between the untyped network and our typed
 * app. Every API response is parsed through these before it reaches React, so a
 * backend contract change surfaces as a clear error instead of a silent
 * `undefined` deep in the UI. Form inputs are validated with the same library.
 *
 * Zod v4: top-level string formats (`z.email`, `z.iso.datetime`) are preferred
 * over the deprecated method chains.
 */
import { z } from 'zod';

/* ----------------------------------------------------------------------------
 * API response schemas
 * ------------------------------------------------------------------------- */

/** Nested, read-only category view embedded on a note so we can color it. */
export const CategoryMiniSchema = z.object({
  id: z.number(),
  name: z.string(),
  // The backend guarantees a `#RRGGBB` hex string, so validate the shape rather
  // than accepting any string that would later break the color helpers.
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

/** Category list item, annotated with the owner's note count. */
export const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  // Same `#RRGGBB` guarantee as the nested view — the color feeds an inline
  // background-color, so validate the shape at the boundary rather than trust it.
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  note_count: z.number(),
});

export const NoteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  // `category` is nullable server-side (ON DELETE SET NULL).
  category: z.number().nullable(),
  category_detail: CategoryMiniSchema.nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const UserSchema = z.object({
  id: z.number(),
  email: z.email(),
  // `date_joined` is present on /auth/me but unused by the UI; keep it optional
  // so the schema stays tolerant of the exact serializer shape.
  date_joined: z.iso.datetime().optional(),
});

/** Auth endpoints wrap the user: `{ user: {...} }`. */
export const AuthResponseSchema = z.object({ user: UserSchema });

export const CategoryListSchema = z.array(CategorySchema);
export const NoteListSchema = z.array(NoteSchema);

/**
 * DRF page envelope for `GET /notes/`. The list endpoint is paginated, so the
 * notes arrive under `results` (not as a bare array). `endpoints.getNotes`
 * unwraps `.results` so the rest of the app keeps working with `Note[]`.
 */
export const PaginatedNotesSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: NoteListSchema,
});

/** AI helper responses. `available` reports whether a real LLM answered. */
export const AiCategorizeSchema = z.object({
  available: z.boolean(),
  category_id: z.number().nullable(),
  category_name: z.string().nullable(),
  source: z.enum(['llm', 'heuristic']).nullable().optional(),
});

export const AiSummarizeSchema = z.object({
  available: z.boolean(),
  summary: z.string(),
  source: z.enum(['llm', 'heuristic']).nullable().optional(),
});

/** Error envelope from config/exceptions.py: `{ error: { code, message } }`. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

/* ----------------------------------------------------------------------------
 * Form schemas
 * ------------------------------------------------------------------------- */

export const credentialsSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type Credentials = z.infer<typeof credentialsSchema>;

/* ----------------------------------------------------------------------------
 * Inferred types
 * ------------------------------------------------------------------------- */

export type CategoryMini = z.infer<typeof CategoryMiniSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Note = z.infer<typeof NoteSchema>;
export type PaginatedNotes = z.infer<typeof PaginatedNotesSchema>;
export type User = z.infer<typeof UserSchema>;
export type AiCategorizeResult = z.infer<typeof AiCategorizeSchema>;
export type AiSummarizeResult = z.infer<typeof AiSummarizeSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
