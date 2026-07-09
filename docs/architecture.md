# Architecture

> Notes app — Django (`backend/`) + Next.js (`frontend/`). Technical reference: folder layout, data model,
> API contract, request flow, and local dev.
> Owner: Job · Updated 2026-07-08 · See also: [developer-guide.md](./developer-guide.md), [adr/](./adr/).

---

## 1. Folder structure

```
notes-turbo/
├── .claude/                     # Claude Code config
│   ├── CLAUDE.md                # Repo conventions loaded into every session
│   ├── settings.json           # Hooks (guards, formatters, session banner)
│   ├── commands/                # /engineer, /architect, /review, /db-review, /adr, …
│   └── skills/                  # api-design, database, security-patterns, testing-patterns, …
├── .github/
│   ├── pull_request_template.md
│   └── workflows/ci.yml         # backend + frontend + commitlint jobs
├── .husky/                      # pre-commit (lint-staged), commit-msg (commitlint + no-ai-trace)
├── docs/                        # this file, developer guide, tech-stack log, design tokens, ADRs
├── package.json                 # root dev-facade: husky, lint-staged, commitlint, prettier
├── commitlint.config.mjs
│
├── backend/                     # ═══ Django project ═══
│   ├── manage.py
│   ├── requirements.txt / requirements-dev.txt
│   ├── config/                  # project package: settings.py, urls.py, wsgi.py, asgi.py
│   ├── accounts/                # custom User (email login), auth endpoints, JWT-cookie views
│   └── notes/                   # Category + Note models, serializers, viewsets, AI-assist views
│
└── frontend/                    # ═══ Next.js app (App Router) ═══  (owned by a separate workstream)
    ├── package.json
    ├── app/                     # routes: login, notes list, note editor
    ├── components/              # UI (note card, sidebar, category filter, dropdown)
    └── lib/                     # API client, Zod schemas, TanStack Query hooks
```

The two apps are deployed and run independently; they are coupled only by the HTTP API contract in §3.

## 2. Data model (as code)

```python
# accounts/models.py
class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []          # no username field at all
    # is_active, is_staff, date_joined, password (hashed by Django)

# notes/models.py
class Category(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=50)
    color = models.CharField(                        # hex, validated as #RRGGBB
        max_length=7,
        validators=[RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Enter a #RRGGBB hex color.")],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    # 4 seeded per user on signup: Random Thoughts #EF9C66, School #FCDC94,
    #                              Personal #78ABA8, Drama #C8CFA0

    class Meta:
        ordering = ["id"]
        constraints = [                              # a user can't have two categories with one name
            models.UniqueConstraint(fields=["user", "name"], name="uniq_user_category_name"),
        ]

class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="notes",
    )                                                # deleting a category keeps the note, unlinks it
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # surfaced as "Last Edited"

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "-updated_at"]),   # default list query
            models.Index(fields=["user", "category"]),      # category filter
        ]
```

**Ownership invariant (the core rule):** every `Category`/`Note` belongs to exactly one `User`. Every queryset is filtered
to `request.user`; a cross-user access returns **404, not 403**. See [.claude/CLAUDE.md](../.claude/CLAUDE.md) and the
testing-patterns skill.

## 3. API contract

Base path `/api`. Auth is via httpOnly JWT cookies (access + refresh, refresh rotated). All note/category routes require
authentication and are scoped to the current user.

| Method | Path                 | Purpose                                        |  Auth  | Notes                                             |
| ------ | -------------------- | ---------------------------------------------- | :----: | ------------------------------------------------- |
| POST   | `/api/auth/register` | Create account, seed 4 categories, set cookies |   —    | Body: `email`, `password`                         |
| POST   | `/api/auth/login`    | Authenticate, set httpOnly cookies             |   —    | Body: `email`, `password`                         |
| POST   | `/api/auth/logout`   | Clear cookies, blacklist refresh               |   ✓    |                                                   |
| POST   | `/api/auth/refresh`  | Rotate access (+refresh) from refresh cookie   | cookie | New access cookie; old refresh invalidated        |
| GET    | `/api/auth/me`       | Current user                                   |   ✓    | `{ user: { id, email, date_joined } }`            |
| GET    | `/api/categories/`   | List the user's categories                     |   ✓    | Each includes `note_count` (annotated)            |
| GET    | `/api/notes/`        | List the user's notes                          |   ✓    | `?category=<id>` filter; paginated; `-updated_at` |
| POST   | `/api/notes/`        | Create a note                                  |   ✓    | `user` set server-side (read-only in serializer)  |
| GET    | `/api/notes/<id>/`   | Retrieve one note                              |   ✓    | 404 if not owned                                  |
| PATCH  | `/api/notes/<id>/`   | Update a note                                  |   ✓    | 404 if not owned                                  |
| DELETE | `/api/notes/<id>/`   | Delete a note                                  |   ✓    | 404 if not owned                                  |
| POST   | `/api/ai/categorize` | Suggest a category for note text               |   ✓    | Groq classifier; heuristic fallback               |
| POST   | `/api/ai/summarize`  | Summarize note text                            |   ✓    | Groq generator; heuristic fallback                |
| GET    | `/api/schema`        | OpenAPI schema (drf-spectacular)               |   —    |                                                   |
| GET    | `/api/docs`          | Swagger UI                                     |   —    |                                                   |

Errors use one shape from the DRF custom exception handler: `{ "code", "message", "details" }`.

**Rate limits (DRF `ScopedRateThrottle`).** Auth endpoints (`register` / `login` / `refresh`) are throttled to **10/min** and
the AI endpoints (`ai/categorize` / `ai/summarize`) to **20/min** per client; exceeding a limit returns **429**. Rates are set
in `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`.

**Pagination.** `/api/notes/` uses `PageNumberPagination` (`page_size=100`, `page_size` query param, `max_page_size=200`); the
response is the DRF envelope `{ count, next, previous, results }`.

## 4. Request / data flow

```
Browser (Next.js, TanStack Query)
   │  fetch /api/... with credentials: 'include'  (httpOnly cookies ride along)
   ▼
Django + DRF
   ├─ Authentication: read access JWT from the httpOnly cookie → request.user
   ├─ Permission: IsAuthenticated
   ├─ ViewSet.get_queryset(): Model.objects.filter(user=request.user)   ← ownership boundary
   ├─ Serializer: validate input (validate_*/validate); user is read-only, set in perform_create
   ├─ ORM: select_related/prefetch_related, annotate note_count → PostgreSQL / SQLite
   └─ Response: serialized resource, or { code, message, details } on error
```

**Silent refresh (client).** The access cookie is short-lived (~15 min). When any request 401s, the API client
(`frontend/lib/api.ts`) transparently `POST`s `/api/auth/refresh` once and **replays the original request**, so a valid
session survives access-token expiry instead of bouncing to `/login`. It is **single-flight**: concurrent 401s share one
in-flight refresh (rotation blacklists the old token, so parallel refreshes would invalidate each other), and the auth
endpoints themselves are excluded so a bad login / dead refresh token can't loop. A genuine 401 (refresh also fails) resolves
`useMe` to `null` → redirect to login; a _non-401_ failure (500/network) is treated as transient, not a logout.

**"All Categories" total.** The sidebar's total is derived from the full (unfiltered) notes list, **not** the sum of
per-category `note_count`s — so **uncategorised** notes (which belong to no category) are still counted and the badge matches
the grid.

AI assist (`/api/ai/*`): the view calls the LLM through an OpenAI-compatible client (Groq by default). If `LLM_API_KEY`
is empty or the call fails, it degrades to a keyword **heuristic** — the endpoint still returns a useful result. See
[adr/ADR-004-ai-assist-groq.md](./adr/ADR-004-ai-assist-groq.md).

## 5. Local development

```bash
# Backend
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements-dev.txt
cp ../.env.example ../.env          # fill in as needed; SQLite works with DATABASE_URL empty
./.venv/bin/python manage.py migrate
./.venv/bin/python manage.py runserver   # http://localhost:8000  (docs at /api/docs)

# Frontend (separate terminal)
cd frontend
npm ci
npm run dev                          # http://localhost:3000

# Root tooling (once, from the repo root — activates husky)
npm install
```

Config comes from env (`.env`, gitignored; `.env.example` is the template). Dev uses SQLite by default; set `DATABASE_URL`
for PostgreSQL prod parity. Versions: [tech-stack-versions.md](./tech-stack-versions.md).
