---
name: database
description: "Use when working with Django models, migrations, queries, or indexes. Triggers: 'database', 'model', 'migration', 'query', 'index', 'orm', 'queryset', 'N+1'."
---

# Database Standards (Django ORM)

## Model Conventions

- `User`: email unique, `USERNAME_FIELD = "email"`, no username. `Category`: `user` FK, `name`, `color` hex.
  `Note`: `user` FK, `category` FK (`null=True, on_delete=SET_NULL`), `title`, `content`, `created_at`, `updated_at`.
- `Note.Meta.ordering = ["-updated_at"]` (drives the default list order; `updated_at` shown as "Last Edited").
- Every owned row carries a `user` FK. Owner deletion cascades notes/categories; deleting a category nulls the note's FK.

## Indexing Strategy

- Index what you filter and sort on: `Note.user`, `Category.user`, and the `-updated_at` sort.
- FK columns are indexed automatically. Add `Meta.indexes` for the hot composite query, e.g. `models.Index(fields=["user", "-updated_at"])`.
- Don't add indexes you never query; each one costs writes.

## Migrations (expand / contract)

- Generate with `makemigrations`; `makemigrations --check --dry-run` must be clean in CI. Never hand-edit schema drift.
- Destructive change (drop/rename column, add NOT NULL to a populated table): **expand → migrate/backfill → contract**,
  in separate deploys — never a blind drop.
- Seed the 4 default categories per user via a **data migration or a signal**, made idempotent (`get_or_create`) and reversible.

## Query Performance

- No query inside a loop. `select_related("user", "category")` for FKs a serializer reads; `prefetch_related` for reverse/M2M.
- `note_count` per category = a single annotated `Count`, not one query per category.
- Paginate anything that can grow. Assert query counts in tests with `assertNumQueries`; use `.explain()` when a plan is unclear.
