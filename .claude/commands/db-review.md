---
description: 'Review the database: Django models, migrations, indexes, and query performance'
---

Execute a DATABASE REVIEW (Django ORM). Analyze:

1. **Schema / models**: Field types and nullability, `on_delete` semantics (`Note.category` is `SET_NULL` + nullable;
   `Note.user`/`Category.user` cascade with the owner), `unique` constraints (`User.email` unique; `USERNAME_FIELD = email`),
   `Meta.ordering` (`Note` is `-updated_at`), and that every owned row carries a `user` FK.
2. **Indexes**: Index the columns you filter/sort on — `Note.user`, `Category.user`, and the `-updated_at` sort. FK columns
   are indexed by Django automatically; add composite/`Meta.indexes` (e.g. `(user, updated_at)`) for the hot list query.
   Flag missing indexes and pointless/duplicate ones.
3. **Migrations**: One migration per model change; `makemigrations --check --dry-run` must be clean. `up`/reverse both sane.
   Destructive ops (drop/rename column, add NOT NULL to a populated table) → **expand → migrate → contract**, never a blind drop.
   Data migrations (e.g. seeding the 4 default categories per user) are idempotent and reversible.
4. **Query performance / N+1**: No query inside a loop. Use `select_related('user', 'category')` for FKs a serializer reads,
   `prefetch_related` for reverse/M2M. Compute `note_count` with an annotation (`Count`), not one query per category.
5. **Pagination & bounds**: List endpoints are paginated; no unbounded `.all()` serialized to the client.
6. **Verify with real numbers**: assert the query count in a test (`assertNumQueries`) for list endpoints; run `EXPLAIN` (or
   `.explain()`) on the hot path when a plan is in doubt. Quantify before/after, don't guess.

$ARGUMENTS
