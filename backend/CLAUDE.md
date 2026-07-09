# Backend — Notes API (Django + DRF)

Django 5.2 LTS + Django REST Framework. Email-based auth with JWT delivered in
httpOnly cookies. SQLite by default; Postgres via `DATABASE_URL`.

## Structure

- `config/` — settings, root urls, the DRF exception envelope (`{error:{code,message,details}}`).
- `accounts/` — custom email `User`, `CookieJWTAuthentication`, register/login/logout/refresh/me.
- `notes/` — `Category` + `Note` models, owner-scoped viewsets, and the AI seam (`services/ai.py`).
- `tests/` — pytest-django + factory-boy.

## Rules

- **Ownership is everything.** Every queryset filters by `request.user`. A cross-user
  lookup must return 404 (never 403 — don't leak existence). There is a test that proves this.
- JWTs live in httpOnly cookies; `CookieJWTAuthentication` reads them (with an
  `Authorization: Bearer` fallback for the browsable API and tests).
- Validate at the serializer boundary — a note may only reference a category its owner holds.
- AI is optional: `services/ai.py` calls an OpenAI-compatible endpoint (Groq) and falls
  back to a keyword heuristic when `LLM_API_KEY` is unset. AI failures must never break a request.
- Type-hint public functions. Keep `ruff check` and `ruff format` green.

## Commands

- `pytest` — run tests with coverage.
- `ruff check . && ruff format --check .` — lint + format.
- `python manage.py makemigrations --check --dry-run` — the CI migration guard.
- `python manage.py runserver` — dev server on :8000.
