<!--
Reference:
  - Developer guide + Definition of Done: docs/developer-guide.md
  - Architecture / API contract:          docs/architecture.md
-->

## What does this PR do?

<!-- 1–3 sentences: the change and the motivation. -->

## Type of change

- [ ] Feature (new functionality)
- [ ] Fix (bug fix)
- [ ] Refactor (no functional change)
- [ ] Chore (deps, CI, tooling, config)
- [ ] Docs (documentation only)
- [ ] Test (test changes only)
- [ ] Perf (performance improvement)

## Area affected

- [ ] Backend (Django / DRF)
- [ ] Frontend (Next.js)
- [ ] Notes / categories domain
- [ ] Auth (accounts, JWT cookies)
- [ ] AI assist (Groq / LLM)
- [ ] Infra (CI, Docker, tooling, docs)

## Definition of Done

- [ ] `ruff check` + `ruff format --check` green (backend).
- [ ] `npx tsc --noEmit` + `npm run lint` + `npm run build` green (frontend, if touched).
- [ ] Tests added/updated and **actually run** — `pytest` (backend) and/or RTL (frontend) green locally.
- [ ] **Object ownership enforced**: every queryset filtered to `request.user`; cross-user access returns **404**;
      isolation test added/updated for any owned model or endpoint touched.
- [ ] Input validated: **Zod** at the frontend boundary; **DRF serializer** validation on the backend. No hand-rolled parsing where a serializer/schema fits.
- [ ] Errors follow the standard shape `{ code, message, details }` (DRF custom exception handler).
- [ ] Migrations: generated with `makemigrations`, `makemigrations --check` clean; destructive changes use an expand/contract plan (noted below).
- [ ] No committed secrets; any new env var added to `.env.example`.
- [ ] Docs updated (`docs/architecture.md` API table, `docs/tech-stack-versions.md`, or an ADR) when behavior/decisions changed.
- [ ] Branch + commits follow the naming convention; **no AI-attribution traces** anywhere.

## How to test

<!-- Step-by-step for the reviewer to reproduce locally. -->

1.
2.
3.

## Screenshots / logs

<!-- UI changes: before/after. Errors: a log excerpt. -->
