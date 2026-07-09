# Frontend — Notes app

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · TanStack Query v5 · Zod v4.

## Architecture

- **App Router**, no `src/` dir. Route groups: `(auth)` for login/signup, `(app)` for the notes workspace.
- **Data layer** lives in `lib/`:
  - `api.ts` — typed `fetch` wrapper. Always `credentials: 'include'` (auth is httpOnly cookies). Throws `ApiError` (carries HTTP `status` + backend `{error:{message}}`). Validates every response with Zod.
  - `endpoints.ts` — one thin function per API route (auth/AI have no trailing slash; DRF router routes do: `/notes/`, `/notes/:id/`).
  - `queries.ts` — TanStack Query hooks (`useMe`, `useCategories`, `useNotes`, `useCreateNote`, `useUpdateNote`, `useDeleteNote`, `useLogin/Register/Logout`, `useAiCategorize/Summarize`). Query keys in `queryKeys`.
  - `schemas.ts` — Zod schemas + inferred types; the network boundary. Form validation lives here too.
  - `categoryColor.ts` — category → hex, plus the 50%-alpha card fill rule.
- **Components** in `components/` are colocated, `'use client'` where they use hooks/state. Illustrations are inline SVG placeholders under `components/illustrations/` (marked `// TODO: swap real Figma asset`).

## Conventions

- **Design tokens** are CSS variables inside `@theme` in `app/globals.css` (Tailwind 4 CSS-first). Prefer token utilities (`bg-cream`, `text-gold`, `border-gold`, `font-serif`). Runtime category colors are applied inline via `categoryColor.ts`.
- **Auth state** is derived from `GET /auth/me` (cookies are unreadable by JS). A 401 resolves `useMe` to `null`; the `/notes` route redirects to `/login` on `null`.
- **Autosave**: the editor debounces (~600ms) title/content edits and PATCHes; `useUpdateNote` does the optimistic cache update + rollback. Category changes save immediately.
- **TypeScript strict, no `any`.** Validate untrusted data with Zod rather than casting.
- Fonts via `next/font/google`: Inria Serif (titles) + Inter (UI). Inria Serif is non-variable (weights 400/700 only).

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (also typechecks + lints)
- `npm test` — Vitest + React Testing Library (jsdom)
- `npm run typecheck` — `tsc --noEmit`

Set `NEXT_PUBLIC_API_URL` (see `.env.local.example`); defaults to `http://localhost:8000/api`.
