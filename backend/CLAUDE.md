# Backend — Notes API (NestJS)

NestJS 11 + TypeORM. Email-based auth with JWT delivered in httpOnly cookies.
Zero-config SQLite (sql.js) by default; Postgres via `DATABASE_URL` for prod parity.
This is a drop-in rewrite of the original Django/DRF backend: the HTTP contract
(routes, cookies, error envelope, ownership rules) is identical, so the frontend
is unchanged.

## Structure

- `src/main.ts` + `src/setup.ts` — bootstrap, `/api` prefix, cookie parser, global
  ValidationPipe, and the error-envelope filter.
- `src/common/` — the exception filter (`{error:{code,message,details}}`) and pagination.
- `src/entities/` — `User`, `Category`, `Note`, `RevokedToken` (TypeORM).
- `src/auth/` — register/login/logout/refresh/me, JWT-in-cookie guard, refresh rotation.
- `src/categories/` — owner-scoped list with note counts.
- `src/notes/` — owner-scoped CRUD, pagination, category-ownership validation.
- `src/ai/` — the AI seam (`ai.service.ts`) + keyword heuristic fallback.
- `test/` — Jest + Supertest e2e specs (one in-memory DB per test).

## Rules

- **Ownership is everything.** Every query filters by the current user. A cross-user
  lookup returns 404 (never 403 — don't leak existence). There is a test that proves this.
- JWTs live in httpOnly cookies; `JwtAuthGuard` reads them (with an `Authorization: Bearer`
  fallback for tooling and tests). Refresh tokens rotate and are blacklisted on use/logout.
- Validate at the DTO boundary (class-validator) — a note may only reference a category its
  owner holds.
- AI is optional: `ai.service.ts` calls an OpenAI-compatible endpoint (Groq) and falls back
  to a keyword heuristic when `LLM_API_KEY` is unset. AI failures must never break a request.
- TypeScript strict. Keep the build (`npm run build`) and tests green.

## Commands

- `npm run start:dev` — dev server on :8000 (watch mode).
- `npm test` — Jest + Supertest e2e suite.
- `npm run build` — typecheck + compile to `dist/`.
