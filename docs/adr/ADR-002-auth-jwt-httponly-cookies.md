# ADR-002: Auth — SimpleJWT access + refresh in httpOnly cookies

**Status**: Accepted
**Date**: 2026-07-07
**Author**: Job
**Deciders**: Job

## Context

The app needs per-user auth: register, login, logout, "who am I", and a way to keep a session alive without forcing frequent
re-login. The frontend is a separate Next.js origin talking to the Django API. The dominant risk in a notes app is one user
reaching another user's data, so the token must be bound to the user and impossible for page scripts to exfiltrate.

The key question is **where the tokens live in the browser**. `localStorage` is readable by any JavaScript on the page, so an
XSS bug leaks the token wholesale. httpOnly cookies are not readable by JS, shrinking the XSS blast radius — at the cost of
having to handle CSRF, since cookies are sent automatically.

## Decision Drivers

- Minimise token theft via XSS (the highest-impact web risk here).
- Keep the frontend simple — no manual `Authorization` header plumbing or token storage.
- Short-lived access with a safe way to refresh.

## Options Considered

### Option A: JWT access + refresh in httpOnly, Secure, SameSite=Lax cookies (refresh rotation)

- **Description**: SimpleJWT issues a short-lived access token (~15 min) and a longer refresh token (~7 days), both set as
  httpOnly cookies. `/api/auth/refresh` rotates them (new pair, old refresh blacklisted). CSRF is handled via SameSite=Lax +
  Django CSRF on unsafe methods.
- **Pros**: Tokens invisible to page JS (XSS can't read them); the browser attaches them automatically; rotation limits the
  value of a stolen refresh token; logout can blacklist the refresh.
- **Cons**: Must handle CSRF; cross-origin cookies need correct `Secure`/`SameSite`/CORS-credentials configuration.
- **Effort**: M.

### Option B: JWT in `localStorage`, sent via `Authorization: Bearer`

- **Description**: Store tokens in `localStorage`; attach them to each request in a header.
- **Pros**: Dead simple; no CSRF concern (no cookie is auto-sent).
- **Cons**: Any XSS reads the token and impersonates the user — the worst-case outcome for an app whose whole job is keeping
  users' notes private. Rejected on security grounds.
- **Effort**: S.

### Option C: Django server-side sessions (session cookie)

- **Description**: Classic Django session auth with a session cookie.
- **Pros**: Batteries-included, httpOnly by default, well-trodden.
- **Cons**: Session state on the server; a SPA on a different origin still needs CSRF + CORS handling; less aligned with a
  token-based API and with issuing/rotating credentials for the documented `/api/auth/refresh` contract.
- **Effort**: M.

## Decision

**Option A.** SimpleJWT access + refresh tokens in **httpOnly + Secure + SameSite=Lax** cookies, with **refresh rotation**
(the presented refresh is blacklisted and a fresh one issued on every `/api/auth/refresh`, and on logout). The primary CSRF
defense is **`SameSite=Lax`** — which stops the auth cookie from riding along on cross-site state-changing requests — backed by
`CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` pinned to the frontend origin (never `*`). Note: because auth is JWT-cookie-based
(not Django sessions), DRF/Django's CSRF **token** check does not fire, so SameSite is doing the CSRF work here — acceptable
while frontend and API are same-site. The XSS-resistance of httpOnly cookies outweighs the trade-off for an app centred on data
privacy.

## Consequences

### Positive

- Access/refresh tokens cannot be read by page JavaScript — the XSS token-theft path is closed.
- The frontend sends no tokens by hand (`fetch(..., { credentials: "include" })`); less client code to get wrong.
- Short access lifetime + rotation caps the damage of any single leaked token.

### Negative

- CSRF must be handled deliberately (SameSite=Lax + Django CSRF), and cross-origin cookie settings must be correct in dev and prod.
- Slightly more moving parts than a bearer-token-in-header scheme.

### Risks

- **Misconfigured cookies in production** (missing `Secure`, wrong `SameSite`, `DEBUG=True`). Mitigation: `JWT_COOKIE_SECURE`
  env flag (True in prod), documented CORS/CSRF origins, and `DEBUG=False` in the prod config.
- **CSRF if forced cross-domain.** `SameSite=Lax` is the CSRF defense; a genuinely cross-domain deploy needs `SameSite=None`
  (+ `Secure`), which removes that protection — so it must be paired with a double-submit CSRF token before shipping that topology.

## Follow-up Actions

- [x] Implement the cookie-setting login/register/refresh/logout views and the refresh-blacklist on logout.
- [x] Add tests: login sets httpOnly cookies; refresh rotates and invalidates the old token; logout clears + blacklists.
- [x] Verify `Secure`/`SameSite`/CORS-credentials against the real frontend origin before the demo.
- [x] **Client silent refresh** (`frontend/lib/api.ts`): a 401 triggers a single-flight `POST /auth/refresh` + one replay of
      the original request, so a valid session survives access-token expiry. Single-flight is required because refresh rotation
      blacklists the old token — parallel refreshes would invalidate each other. Auth endpoints are excluded to avoid loops.
      A genuine 401 (refresh fails) → login; a non-401 (network/500) is treated as transient, not a logout.
