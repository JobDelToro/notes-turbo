# ADR-001: Tech stack — Django 5.2 LTS + Next.js 16

**Status**: Accepted
**Date**: 2026-07-07
**Author**: Job
**Deciders**: Job

## Context

This is a solo, 7-day hiring challenge: a notes app with per-user auth, notes and categories, and a small AI-assist feature.
What matters is shipping something correct, well-tested and legible, using tools that are boring, current, and well-documented
so the time goes into the product, not into fighting the stack. The challenge also expects a Python/Django backend and a
React/Next.js frontend.

The guiding principle is **moderno-estable**: the newest versions that are _stable and boring_, not bleeding-edge. Prefer an
LTS backend (long support window, no surprise breakage) and the current stable major of the frontend framework.

## Decision Drivers

- Solo build, 7 days — minimise unknowns and setup cost.
- Correctness and testability over cleverness.
- A clean HTTP boundary between backend and frontend (they are separate apps, not a shared runtime).
- Strong batteries-included auth, ORM, migrations, and admin on the backend.

## Options Considered

### Option A: Django 5.2 LTS + DRF, Next.js 16 (App Router)

- **Description**: Django + Django REST Framework for the API; Next.js 16 App Router + React 19 + TypeScript for the UI.
  SQLite in dev/CI, PostgreSQL for prod parity.
- **Pros**: Django LTS is supported into 2028; DRF gives serializers, viewsets, auth and browsable/OpenAPI docs out of the
  box; migrations and the ORM are mature; Next 16 is the current stable App Router; huge documentation surface for both.
- **Cons**: Two languages/toolchains to run; DRF conventions to learn if unfamiliar.
- **Effort**: M.

### Option B: Django (latest non-LTS) + Next.js canary

- **Description**: Track the very newest releases of both.
- **Pros**: Newest features.
- **Cons**: Non-LTS Django has a shorter support window; canary/bleeding-edge risks breaking changes mid-build — exactly the
  time sink to avoid in a 7-day window. Higher chance of docs/community lag.
- **Effort**: M–L (unpredictable).

### Option C: Single-framework full-stack (Next.js API routes, no Django)

- **Description**: Do the backend in Next.js route handlers / a Node ORM; drop Django.
- **Pros**: One language, one toolchain, one deploy.
- **Cons**: Loses Django's batteries (auth, admin, migrations, DRF serializers); the challenge expects a Django backend;
  re-implementing that surface in Node costs more than learning DRF. Weaker separation of concerns.
- **Effort**: L.

## Decision

**Option A.** Django 5.2 **LTS** + DRF for the backend, Next.js 16 App Router + React 19 + TypeScript for the frontend. This
is the moderno-estable sweet spot: a long-supported backend with first-class auth/ORM/serialization, and the current stable
frontend major, joined by an explicit REST contract. Exact pins live in
[../tech-stack-versions.md](../tech-stack-versions.md).

## Consequences

### Positive

- Long support runway (Django LTS) with no expected forced upgrades during or soon after the challenge.
- DRF removes most API boilerplate and gives OpenAPI docs via drf-spectacular for free.
- Clean, independently deployable frontend/backend with a typed boundary (Zod on the client, serializers on the server).

### Negative

- Two toolchains to install and run locally (Python venv + Node).
- DRF idioms (viewsets, routers, permission/queryset scoping) to follow consistently.

### Risks

- **Frontend/backend contract drift.** Mitigation: the API contract is documented in `architecture.md`, the schema is
  published at `/api/schema`, and the client validates responses with Zod.
- **Version skew vs. this doc.** Mitigation: `tech-stack-versions.md` is the single source of truth and is updated on every bump.

## Follow-up Actions

- [x] Pin versions in `tech-stack-versions.md`.
- [ ] Publish the OpenAPI schema (`/api/schema`, `/api/docs`) and generate/validate client types from it.
