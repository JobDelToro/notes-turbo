# Tech Stack Versions

> Canonical version log for notes-turbo.
> Owner: Job · Created 2026-07-07.
>
> **Purpose:** one source of truth for what is actually installed. When a version differs from the plan, record the
> installed version, the spec, and why. `Spec` is the target/minimum; `Installed` is what is pinned in the repo.

---

## How to use this doc

- **Adding a dependency** → if it matches the spec, no entry needed; if it differs (or wasn't specified), add a row.
- **Upgrading** → bump the `Installed` column and add a dated Changelog entry with the reason.
- **Downgrading** → record it; never downgrade silently.
- If you install a version, this file must reflect it.

---

## 1. Backend — runtime & framework

| Tool                          | Spec    | Installed | Notes                                                           |
| ----------------------------- | ------- | --------- | --------------------------------------------------------------- |
| Python                        | 3.13.x  | 3.13.x    | `backend/.venv`; CI uses `actions/setup-python@v5` with `3.13`. |
| Django                        | 5.2 LTS | 5.2.x     | LTS — supported into 2028; the "moderno-estable" baseline.      |
| Django REST Framework         | 3.17.1  | 3.17.1    | API layer (serializers, viewsets, routers).                     |
| djangorestframework-simplejwt | 5.5     | 5.5.x     | JWT access + refresh in httpOnly cookies, refresh rotation.     |
| psycopg                       | 3.3     | 3.3.x     | Postgres driver (psycopg 3, not psycopg2). SQLite in dev/CI.    |
| django-cors-headers           | 4.9     | 4.9.x     | CORS restricted to the frontend origin.                         |
| drf-spectacular               | 0.30    | 0.30.x    | OpenAPI schema `/api/schema` + Swagger UI `/api/docs`.          |
| gunicorn                      | latest  | —         | WSGI server for container/prod.                                 |
| whitenoise                    | latest  | —         | Static file serving in the container (no separate web server).  |

## 2. Backend — quality & tooling

| Tool          | Spec | Installed | Notes                                                                   |
| ------------- | ---- | --------- | ----------------------------------------------------------------------- |
| ruff          | 0.9+ | 0.9+      | Formatter + linter (line length 100). Source of truth for Python style. |
| pytest        | 8.3+ | 8.3+      | Test runner.                                                            |
| pytest-django | 4.9+ | 4.9+      | Django integration for pytest.                                          |
| pytest-cov    | 6.0+ | 6.0+      | Coverage (`--cov` in CI).                                               |
| factory-boy   | 3.3+ | 3.3+      | Deterministic test factories (User/Category/Note).                      |

## 3. Frontend — runtime & framework

| Tool           | Spec | Installed | Notes                                                         |
| -------------- | ---- | --------- | ------------------------------------------------------------- |
| Node.js        | 24   | 24.x      | Pinned via `.nvmrc`; CI reads `node-version-file`.            |
| Next.js        | 16.2 | 16.2.x    | App Router.                                                   |
| React          | 19.2 | 19.2.x    | Pairs with Next 16.                                           |
| TypeScript     | 5.x  | 5.x       | Strict mode, no `any`.                                        |
| Tailwind CSS   | 4    | 4.x       | CSS-first `@theme` tokens (no `tailwind.config.js` required). |
| TanStack Query | 5    | 5.x       | Server-state cache + mutations.                               |
| Zod            | 4    | 4.x       | Validation at every boundary (API, forms, env).               |

## 4. Root tooling (commit / format gates)

| Tool                            | Spec | Installed | Notes                                             |
| ------------------------------- | ---- | --------- | ------------------------------------------------- |
| husky                           | 9.x  | ^9.1.7    | Git hooks (`pre-commit`, `commit-msg`).           |
| lint-staged                     | 15.x | ^15.2.11  | ruff on `*.py`; prettier on staged files.         |
| @commitlint/cli                 | 19.x | ^19.6.0   | Conventional Commits enforcement.                 |
| @commitlint/config-conventional | 19.x | ^19.6.0   | Base ruleset extended in `commitlint.config.mjs`. |
| prettier                        | 3.x  | ^3.4.2    | Formats TS/JS/JSON/MD/YAML at the root.           |

## 5. AI assist (optional)

OpenAI-compatible seam — **Groq** by default. Degrades to a keyword heuristic when `LLM_API_KEY` is empty, so the app runs
fine without it. Configured entirely via env (see `.env.example`).

| Env var                | Default                          | Notes                                                |
| ---------------------- | -------------------------------- | ---------------------------------------------------- |
| `LLM_PROVIDER`         | `openai-compatible`              | The seam; any OpenAI-compatible endpoint works.      |
| `LLM_BASE_URL`         | `https://api.groq.com/openai/v1` | Groq's OpenAI-compatible base URL.                   |
| `LLM_API_KEY`          | _(empty)_                        | Free Groq key (`gsk_…`). Empty ⇒ heuristic fallback. |
| `LLM_CLASSIFIER_MODEL` | `llama-3.1-8b-instant`           | Fast model for `/api/ai/categorize`.                 |
| `LLM_GENERATOR_MODEL`  | `llama-3.3-70b-versatile`        | Larger model for `/api/ai/summarize`.                |

## 6. Containers

| Image    | Spec | Installed (compose tag) | Notes                              |
| -------- | ---- | ----------------------- | ---------------------------------- |
| python   | 3.13 | `python:3.13-slim`      | Backend base image.                |
| node     | 24   | `node:24-alpine`        | Frontend base image.               |
| postgres | 18   | `postgres:18-alpine`    | Prod-parity DB (optional locally). |

---

## Changelog

- **2026-07-07** — Initial bootstrap. Locked the versions in §1–6. Baseline chosen as "moderno-estable": Django 5.2 LTS +
  Next 16 (see [adr/ADR-001-tech-stack.md](./adr/ADR-001-tech-stack.md)). AI assist wired as an OpenAI-compatible seam
  defaulting to Groq with a heuristic fallback ([adr/ADR-004-ai-assist-groq.md](./adr/ADR-004-ai-assist-groq.md)).
