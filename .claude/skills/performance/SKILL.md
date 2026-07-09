---
name: performance
description: "Use when optimizing speed, query count, or resource usage. Triggers: 'slow', 'optimize', 'N+1', 'select_related', 'prefetch', 'index', 'pagination', 'cache', 'performance'."
---

# Performance Patterns

## Query Efficiency (the main lever here)

- **Kill N+1**: `select_related("user", "category")` for the FKs a serializer reads; `prefetch_related` for reverse/M2M.
- **`note_count` per category**: one annotated `Count`, never a query per category —
  `Category.objects.filter(user=request.user).annotate(note_count=Count("notes"))`.
- **Prove it**: `assertNumQueries` in a test so the count can't silently regress; `.explain()` on a doubtful plan.

## Pagination & Bounds

- Every list endpoint is paginated (page-number or limit/offset). Never serialize an unbounded `.all()` to the client.
- Select only what you need; avoid returning large `content` blobs in list views if a preview suffices.

## Indexes

- Index the columns behind the hot query: `Note(user, -updated_at)` composite for the default list; `user` on both models.
- Measure before adding — an unused index only taxes writes.

## Caching (only if it earns its place)

- This app is small; reach for caching only after query tuning. If used: cache per-user (key includes the user id),
  invalidate on write (delete the key), keep TTLs short.

## Frontend

- TanStack Query for server state: dedupe, cache, and invalidate on mutation instead of refetching everything.
- Next.js: code-split heavy routes, `next/image` for images, keep the per-route JS lean.
