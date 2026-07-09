# Notes — Frontend

A charming little notes app. Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · TanStack Query v5 · Zod v4.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # points at the Django API (default :8000)
npm run dev                        # http://localhost:3000
```

The frontend talks to the Django/DRF backend in `../backend`. Start that first
(`cd ../backend && .venv/bin/python manage.py runserver`). Auth uses httpOnly
cookies, so every request is sent with `credentials: 'include'` and the browser
never sees the tokens — auth state is derived from `GET /auth/me`.

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Dev server                               |
| `npm run build`     | Production build (typechecks + compiles) |
| `npm start`         | Serve the production build               |
| `npm test`          | Vitest + React Testing Library (jsdom)   |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run lint`      | ESLint                                   |

## Layout

- `app/` — App Router. `(auth)` group = login / signup; `(app)` group = the
  notes workspace. `layout.tsx` wires fonts + the QueryClient provider.
- `components/` — UI. `NotesWorkspace` orchestrates the sidebar, grid and editor.
  Illustrations are on-palette inline SVG placeholders (`components/illustrations`).
- `lib/` — the data layer: `api.ts` (typed fetch + `ApiError`), `endpoints.ts`,
  `queries.ts` (TanStack Query hooks), `schemas.ts` (Zod boundary + forms),
  `categoryColor.ts`, `format.ts`, `useDebouncedCallback.ts`.
- `test/` — Vitest suites.

Design tokens live as CSS variables inside `@theme` in `app/globals.css`
(Tailwind 4, CSS-first). See `CLAUDE.md` for conventions.

## Configuration

| Variable              | Default                     | Purpose                   |
| --------------------- | --------------------------- | ------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Browser-side API base URL |

## Notes / TODO

- Illustrations are placeholders; swap in the real Figma mascot assets
  (search for `// TODO: swap real Figma asset`).
- AI actions ("Suggest category" / "Summarize") degrade gracefully: when the
  backend reports `available: false` (no key / provider error), it still applies
  the heuristic result and the editor shows a subtle "Keyword guess — add a Groq
  key" hint. A request error is caught and surfaces a retry hint — it never throws.
