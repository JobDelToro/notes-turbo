# ADR-003: Data model — per-user seeded categories, note ownership, updated_at as "Last Edited"

**Status**: Accepted
**Date**: 2026-07-07
**Author**: Job
**Deciders**: Job

## Context

The domain is small: users, categories, and notes. Three modelling questions carry most of the weight:

1. **Ownership** — how do we guarantee a user only ever touches their own notes and categories?
2. **Categories** — are they a fixed global set, or per-user rows? The Figma spec ships four named, colour-coded categories
   (Random Thoughts, School, Personal, Drama), and the UI lets users tag notes by category.
3. **What happens to a note when its category is deleted**, and **what timestamp the card shows**.

## Decision Drivers

- The ownership invariant must be structural, not a per-view afterthought.
- Match the Figma spec (four seeded categories, colour per category, a "Last Edited" timestamp).
- Keep deletes non-destructive to notes (a note is more valuable than its category link).

## Options Considered

### Option A: `user` FK on both Category and Note; seed 4 categories per user; `Note.category` `SET_NULL`; show `updated_at`

- **Description**: `Category(user FK, name, color)` and `Note(user FK, category FK null on_delete=SET_NULL, title, content,
created_at, updated_at)`, `ordering = ["-updated_at"]`. On signup, seed the four spec categories for that user. Deleting a
  category nulls the note's `category` but keeps the note. The card shows `updated_at` as "Last Edited".
- **Pros**: Ownership is a column on every owned row — querysets filter by `request.user` uniformly; categories are editable
  per user; deleting a category never destroys notes; `updated_at` maps exactly to the "Last Edited" label.
- **Cons**: Four seed rows per user (trivial); category names duplicated across users (fine — they're user-owned).
- **Effort**: S–M.

### Option B: Global shared categories (no `user` FK on Category)

- **Description**: One global set of categories referenced by all users.
- **Pros**: Fewer rows; one place to edit names/colours.
- **Cons**: Users can't rename/add their own; a shared table muddies the ownership story (categories become a cross-user
  surface); editing a global category affects everyone. Rejected.
- **Effort**: S.

### Option C: Categories as a plain enum/choices field on Note (no Category table)

- **Description**: Store the category as a string/enum on the note.
- **Pros**: Simplest schema; no join.
- **Cons**: No per-user customisation, no colour metadata without a lookup, no `note_count` aggregation, awkward to extend.
  Doesn't fit the spec's colour-coded, countable categories. Rejected.
- **Effort**: S.

## Decision

**Option A.** Both `Category` and `Note` carry a `user` FK, making ownership a structural property enforced by filtering every
queryset to `request.user` (cross-user access → 404). The four spec categories are **seeded per user on signup** via a
`post_save` signal (idempotent `bulk_create(ignore_conflicts=True)`, guarded by a `UniqueConstraint(user, name)`), so each
user owns and can evolve their own set. `Note.category` uses
`on_delete=SET_NULL, null=True` so deleting a category unlinks but never deletes notes. `Note.Meta.ordering = ["-updated_at"]`
and the card surfaces `updated_at` as **"Last Edited"**. Schema-as-code lives in [../architecture.md](../architecture.md) §2.

## Consequences

### Positive

- Uniform ownership check across all endpoints; the isolation test generalises to every owned model.
- Per-user categories with colour metadata; `note_count` is a simple annotated `Count`.
- Category deletion is safe for notes; the list naturally shows most-recently-edited first.

### Negative

- Seeding logic runs on every signup and must stay idempotent and reversible.
- `category` being nullable means the UI/serializer must handle "uncategorised" notes.

### Risks

- **Seeding partially fails or double-runs.** Mitigation: `bulk_create(ignore_conflicts=True)` backed by the
  `UniqueConstraint(user, name)` makes a re-run a no-op; covered by a signup test.
- **A query forgets the `user` filter.** Mitigation: scope in `get_queryset()` once per viewset; enforce with the mandatory
  ownership-isolation test and code review (`/review`, `/db-review`).

## Follow-up Actions

- [x] Implement the models and the per-user category seed (`post_save` signal → `bulk_create(ignore_conflicts=True)`).
- [x] Composite index `(user, -updated_at)` on `Note` for the default list query (plus `(user, category)` for the filter).
- [x] Tests: seed-on-signup, category delete nulls the note, ownership isolation returns 404.
