---
name: security-patterns
description: "Use when implementing authentication, authorization, or any security-sensitive code. Triggers: 'auth', 'JWT', 'cookie', 'password', 'permission', 'ownership', 'CSRF', 'CORS', 'token'."
---

# Security Implementation Patterns

## JWT in httpOnly Cookies (SimpleJWT)

- Access token ~15 min, refresh token ~7 days. Both delivered as **httpOnly + Secure + SameSite=Lax** cookies —
  never `localStorage` (XSS can't read httpOnly cookies).
- **Refresh rotation**: each `/api/auth/refresh` issues a new access (+ refresh) and invalidates the old refresh (blacklist).
- `logout` clears the cookies (and blacklists the refresh). `/api/auth/me` reads the user from the access cookie.

## CSRF (because auth is cookie-based)

- Cookie auth is CSRF-exposed. Mitigate with SameSite=Lax **and** Django CSRF protection on unsafe methods (or a documented
  double-submit token). Set `CSRF_TRUSTED_ORIGINS` / `CORS_ALLOWED_ORIGINS` to the frontend origin only — never `*` in prod.

## Passwords

- Django's hashers (PBKDF2 default; argon2 if available). Never MD5/SHA-1/plain. Enforce `AUTH_PASSWORD_VALIDATORS`.
  Rate-limit login/register to blunt brute force.

## Object Ownership (authorization)

- Authorization here is ownership: `get_queryset()` filters to `request.user`; resolve any client id **inside** that queryset.
- Cross-user access returns **404, not 403**. `user` is `read_only` on serializers and set server-side (no mass assignment).

## Secrets

- Never in code, logs, or errors. Dev: `.env` (gitignored) + `.env.example` (placeholders). The LLM/Groq key is env-only and
  the feature degrades to a heuristic when it is missing.
