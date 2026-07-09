/**
 * Domain types for the Notes app. These mirror the Django/DRF API contract and
 * are the single source of truth used across queries, components and tests.
 *
 * The runtime shapes are validated at the network boundary in `lib/schemas.ts`;
 * these types are inferred from those schemas so the two can never drift.
 */
import type { AiCategorizeResult, AiSummarizeResult, Category, Note, User } from './schemas';

export type { AiCategorizeResult, AiSummarizeResult, Category, Note, User };

/** The four seeded category names, handy for heuristics and tests. */
export type CategoryName = 'Random Thoughts' | 'School' | 'Personal' | 'Drama';

/** A note id — the API uses integer primary keys. */
export type NoteId = number;
export type CategoryId = number;
