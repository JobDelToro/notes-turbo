---
name: api-design
description: "Use when designing or implementing DRF API endpoints. Triggers: 'endpoint', 'REST', 'API', 'route', 'viewset', 'serializer', 'response'."
---

# API Design Standards (DRF)

## REST Conventions

- Resources are plural nouns: `GET /api/notes/`, `POST /api/notes/`, `GET|PATCH|DELETE /api/notes/<id>/`.
- Filter with query params: `GET /api/notes/?category=<id>`. Keep nesting shallow (max 2 levels).
- Status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden,
  404 Not Found (also for cross-user access — don't leak existence), 409 Conflict, 429 Too Many Requests, 500.
- Auth endpoints set httpOnly cookies: `POST /api/auth/register|login`, `POST /api/auth/logout|refresh`, `GET /api/auth/me`.

## Validation & Ownership

- Every write endpoint validates its body with a DRF serializer (`validate_*`/`validate`) _before_ any business logic.
- `get_queryset()` filters to `request.user` — always. Look up client ids inside that scoped queryset.
- `user` is `read_only` on serializers and set in `perform_create` (`serializer.save(user=self.request.user)`).
- Separate input and output where they differ; never return the ORM object without a serializer.

## Response & Error Shape

- Success returns the serialized resource (or `{ "results": [...] }` for paginated lists).
- Errors use the custom exception handler shape: `{ "code": "...", "message": "...", "details": {...} }`.

## Pagination & Versioning

- List endpoints are paginated (page-number or limit/offset) — no unbounded `.all()`.
- Path-version only when a breaking change forces it (`/api/...`). Document the schema at `/api/schema` + `/api/docs`
  (drf-spectacular).
