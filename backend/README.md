# Notes API — NestJS

A NestJS + TypeORM rewrite of the Notes backend. It speaks the exact same HTTP
contract as the original Django/DRF service, so the Next.js frontend runs against
it unchanged: same routes under `/api`, the same httpOnly-cookie JWT auth, the same
`{ error: { code, message } }` envelope, the same owner-scoped 404 rule, and the
same AI endpoints.

## Stack

- **NestJS 11** (Express) · **TypeScript** (strict)
- **TypeORM** — SQLite via `sql.js` (zero-config, no native build) for local/test,
  **Postgres** via `DATABASE_URL` for prod parity
- **@nestjs/jwt** + httpOnly cookies · **bcryptjs** · **@nestjs/throttler** rate limiting
- **class-validator** DTOs · **openai** SDK for the AI seam (Groq by default)
- **Jest + Supertest** e2e tests

## Quick start

```bash
cp ../.env.example ../.env      # optional; safe defaults otherwise
npm install
npm run start:dev              # http://localhost:8000/api
```

With no `DATABASE_URL` it uses a local SQLite file (`data/dev.sqlite`). With no
`LLM_API_KEY` the AI endpoints still work via a keyword heuristic.

## API

| Method | Path                     | Notes                                   |
| ------ | ------------------------ | --------------------------------------- |
| POST   | `/api/auth/register`     | Creates a user, seeds 4 categories      |
| POST   | `/api/auth/login`        | Sets httpOnly access + refresh cookies  |
| POST   | `/api/auth/logout`       | Clears cookies, blacklists the refresh  |
| POST   | `/api/auth/refresh`      | Rotates the refresh token               |
| GET    | `/api/auth/me`           | Current user (auth source of truth)     |
| GET    | `/api/categories/`       | Owner's categories + note counts        |
| GET    | `/api/notes/`            | Paginated; `?category=<id>` filter      |
| POST   | `/api/notes/`            | Create                                  |
| PATCH  | `/api/notes/:id/`        | Autosave                                |
| DELETE | `/api/notes/:id/`        | Delete                                  |
| POST   | `/api/ai/categorize`     | Suggest a category                      |
| POST   | `/api/ai/summarize`      | Summarize a note                        |

## Tests

```bash
npm test        # 31 e2e specs: auth, categories, notes, ownership 404, AI, rate limits
```

Each test runs against a fresh in-memory database; the AI provider is mocked, so
the suite is deterministic and needs no network or API key.
