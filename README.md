# 🍵 Notes — Turbo AI Challenge

A cozy, color-coded notes app: pour your heart out, tag it, and let a little AI
tidy up after you. Built to match the provided Figma pixel-for-pixel, with a
Django REST API and a Next.js front end.

> **Stack:** Django 5.2 LTS + DRF · Next.js 16 + React 19 · Postgres · Groq (AI) · Docker

---

## ✨ Features

- **Auth** — email sign-up / login / logout, JWTs stored in **httpOnly cookies** (XSS-safe),
  with **silent token refresh**: an expired access token is transparently refreshed and the
  request replayed, so a valid session never bounces you to the login screen.
- **Notes CRUD** with **instant autosave** (debounced) and a live "Last edited" stamp.
- **Four color-coded categories** — Random Thoughts, School, Personal, Drama — seeded per user.
- **Filter by category**, masonry grid, empty state — matched to the Figma tokens.
- **AI assist** — auto-categorize and summarize a note. Powered by **Groq** (OpenAI-compatible),
  with a **graceful keyword-heuristic fallback** so the app works even without an API key.
- **Ownership guarantees** — you only ever see your own data. Cross-user access returns `404`
  (never leaks existence), and there's a test that proves it.

## 🧱 Tech stack

| Layer    | Choices                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Backend  | Python 3.13 · Django 5.2 LTS · DRF 3.17 · djangorestframework-simplejwt · drf-spectacular · Ruff · pytest |
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · TanStack Query · Zod · Vitest/RTL          |
| AI       | Groq via the OpenAI-compatible SDK (`llama-3.1-8b-instant` / `llama-3.3-70b-versatile`)                   |
| Infra    | Docker Compose · Postgres 18 · GitHub Actions CI · Husky + commitlint                                     |

## 🚀 Quick start

### Option A — Docker (one command)

```bash
cp .env.example .env         # optional: set LLM_API_KEY to enable real AI
docker compose up --build
```

- Web → http://localhost:3000
- API → http://localhost:8000/api
- API docs (Swagger) → http://localhost:8000/api/docs

### Option B — run each side manually

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env    # set DJANGO_DEBUG=True and a DJANGO_SECRET_KEY
python manage.py migrate
python manage.py runserver    # → http://localhost:8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                   # → http://localhost:3000
```

## 🧠 The AI feature

The AI helpers (`POST /api/ai/categorize`, `POST /api/ai/summarize`) sit behind a small,
**provider-swappable seam** (`backend/notes/services/ai.py`) that speaks the OpenAI API.
It points at **Groq** by default — a free, blazing-fast inference host (fittingly _turbo_).

- Grab a free key (`gsk_…`) at [console.groq.com](https://console.groq.com) and set `LLM_API_KEY`.
- **No key? No problem.** Categorize falls back to a keyword heuristic and summarize to an
  extractive summary; the API reports `available:false` so the UI can label it honestly.

## 🔌 API

| Method           | Path                                                     | Purpose                                 |
| ---------------- | -------------------------------------------------------- | --------------------------------------- |
| POST             | `/api/auth/register` · `/login` · `/logout` · `/refresh` | Auth (sets/clears httpOnly cookies)     |
| GET              | `/api/auth/me`                                           | Current user (used for auth state)      |
| GET              | `/api/categories/`                                       | The user's categories, with note counts |
| GET/POST         | `/api/notes/`                                            | List (`?category=<id>`) / create        |
| GET/PATCH/DELETE | `/api/notes/<id>/`                                       | Retrieve / autosave / delete            |
| POST             | `/api/ai/categorize` · `/api/ai/summarize`               | AI helpers                              |

Full, always-up-to-date schema at `/api/docs`. See [`docs/architecture.md`](docs/architecture.md).

## 🧪 Testing

```bash
cd backend  && pytest         # 27 tests, ~90% coverage (incl. the ownership-isolation 404 test)
cd frontend && npm test       # 53 tests — Vitest + React Testing Library (incl. silent-refresh & autosave-race)
```

Every endpoint has a happy path + an auth-failure path, and every owned model has the
**ownership-isolation 404** test. The suite is deterministic (no real network — the LLM and
refresh flows are mocked). CI (GitHub Actions) runs Ruff + pytest for the backend and
ESLint + `tsc` + `next build` for the frontend, plus commitlint, on every PR.

## 🎨 Design fidelity

Colors, typography (Inria Serif + Inter), radii and spacing were pulled **straight from the
Figma** via the Figma MCP rather than eyeballed — including the four exact category hexes
(`#EF9C66` / `#FCDC94` / `#78ABA8` / `#C8CFA0`). See [`docs/design-tokens.md`](docs/design-tokens.md).

## 🗺️ Key design & technical decisions

Documented as ADRs in [`docs/adr/`](docs/adr/):

1. **Stack** — Django 5.2 **LTS** + Next 16 ("modern-stable": newest that's already battle-tested).
2. **Auth** — JWT in **httpOnly cookies** (not localStorage) for XSS safety; `SameSite=Lax` + CSRF notes;
   refresh rotation + **single-flight silent refresh** on the client.
3. **Data model** — per-user seeded categories; notes owned by users; `updated_at` = "Last edited".
4. **AI** — an OpenAI-compatible seam (Groq) with a heuristic fallback, so AI is a bonus, not a dependency.

## ⚠️ Gotchas & things to be careful about

The non-obvious details a maintainer (or interviewer) should know:

- **Ownership is enforced in `get_queryset()`, once per viewset — never per-object.** The pattern is
  _scope the queryset to `request.user`, then look up inside it_. Never trust a client id to imply
  ownership. Cross-user access returns **404, not 403** (403 would leak that the row exists). Adding a
  new owned model? Add the ownership-isolation 404 test with it — it's mandatory.
- **`SameSite=Lax` is the actual CSRF defense**, not Django's CSRF token. Because auth is JWT-cookie-based
  (not Django sessions), the CSRF-token check never fires. This is safe **only while the frontend and API
  are same-site**. A genuinely cross-domain deploy needs `SameSite=None; Secure` — which _removes_ that
  protection — so it must be paired with a double-submit CSRF token before shipping that topology.
- **Silent refresh is single-flight on purpose.** Refresh rotation blacklists the old token server-side,
  so if several requests 401 at once and each fired its own refresh, they'd invalidate each other. All
  concurrent 401s share one in-flight refresh promise (`lib/api.ts`). Auth endpoints are excluded from the
  retry so a bad login or dead refresh token can't loop.
- **CORS is pinned to `FRONTEND_ORIGIN` (never `*`).** If you change the frontend port/host, update
  `FRONTEND_ORIGIN` (backend) **and** `NEXT_PUBLIC_API_URL` (frontend) together, or requests fail CORS.
- **Config lives in the repo-root `.env`** (git-ignored; `.env.example` is the template). Settings reads it
  via `read_env(REPO_ROOT/.env)`. In production the app **fails fast** if `DJANGO_SECRET_KEY` is still the
  dev default — a missing key is a crash, not a silent insecure boot.
- **The AI never breaks a request.** No key ⇒ keyword heuristic; a provider error/timeout (12 s cap) ⇒
  heuristic. The endpoint reports `available:false` so the UI can label it honestly ("Keyword guess").
  Note: the note's text **is sent to Groq** when a key is set — that's the whole feature, but worth knowing.
- **Rate limits need a shared cache in prod.** The `auth` (10/min) and `ai` (20/min) throttles use DRF's
  `ScopedRateThrottle`, which stores counters in Django's cache. No `CACHES` is configured, so it defaults to
  per-process `LocMemCache` — fine for dev/single-process, but across N gunicorn workers the effective limit is
  N× and counters reset on restart. A real deploy should set a shared `CACHES` backend (Redis/Memcached).
- **The notes list is paginated (page size 100) with no "load more" UI.** Fine for the challenge; the count
  badge and grid both reflect the first page consistently. A real product would add cursor pagination.
- **`category` is nullable ("Uncategorized").** The serializer/UI must handle `null`; the "All Categories"
  count is derived from the full list (not the sum of per-category counts) so uncategorized notes are counted.
- **The human is the sole author.** The AI assistant never runs `git commit/push/merge` and no AI-attribution
  trailers appear in history — enforced by a PreToolUse hook and the `commit-msg` git hook. Contributors: see
  [`docs/developer-guide.md`](docs/developer-guide.md).

## 🤖 How AI was used to build this

The challenge encourages AI use — here's the honest account:

- **Claude Code (Opus)** drove the implementation end-to-end.
- **Figma MCP** extracted the exact design tokens and component specs from the design file.
- **Video analysis** — I extracted frames from the walkthrough video to map every screen and
  interaction before writing a line of code.
- **Parallel sub-agents** built the front end and the tooling/docs against a shared, hand-written
  API contract while the backend was built and tested by hand.
- **Groq (Llama 3.1 / 3.3)** powers the in-app AI assist at runtime.
- The repo also carries a small slice of my team's Claude Code operating conventions
  (`.claude/` commands, skills, hooks; `docs/` ADRs and developer guide).

Every commit is human-authored — no AI attribution in the history (a deliberate house policy).

## 📁 Structure

```
notes-turbo/
├─ backend/     Django + DRF API (accounts, notes, AI seam, tests)
├─ frontend/    Next.js App Router UI (auth, notes grid, editor, autosave)
├─ docs/        architecture, developer guide, design tokens, ADRs, tech-stack log
├─ .claude/     CLAUDE.md context + commands / skills / hooks
├─ .github/     CI workflow + PR template
└─ docker-compose.yml
```
