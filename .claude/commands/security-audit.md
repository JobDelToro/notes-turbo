---
description: 'Execute a comprehensive security audit across the app, its data, and its dependencies'
---

Execute a COMPREHENSIVE SECURITY AUDIT. Check every layer.

## Application Security (OWASP Top 10 / API Top 10)

- [ ] Every endpoint authenticates (except intended-public ones like register/login/schema).
- [ ] Every endpoint authorizes by **object ownership** — queryset filtered to `request.user`.
- [ ] Cross-user access returns **404, not 403** (no existence leak). A test proves it.
- [ ] Client-supplied ids are resolved inside the user-scoped queryset, never trusted directly (no IDOR).
- [ ] All input validated with DRF serializers / Zod. No raw SQL string building.
- [ ] `user` is read-only in serializers and set server-side (no mass assignment).
- [ ] No secrets in code, logs, or error messages. Note contents / emails / tokens are never logged.

## Auth & Session

- [ ] JWT access token short-lived; refresh token rotated on use.
- [ ] Tokens stored in **httpOnly + Secure + SameSite** cookies, not `localStorage`.
- [ ] Passwords hashed by Django (PBKDF2/argon2). Login/register rate-limited.
- [ ] CSRF handled for cookie auth (SameSite=Lax + Django CSRF, or a documented token scheme).

## Transport & Config

- [ ] CORS restricted to the frontend origin — never `*` in production.
- [ ] `DEBUG = False` and `ALLOWED_HOSTS` set in production. Security headers present.

## AI Assist

- [ ] LLM/Groq key read from env only; absent key degrades to the heuristic (no crash, no leak).
- [ ] User note content sent to the provider is intentional and documented; no secrets in the prompt.

## Dependencies & Container

- [ ] No known critical/high vulnerabilities in Python or npm deps.
- [ ] Docker image runs as non-root, pins its base image, and bakes in no secrets.

Output format:
🔴 CRITICAL: [immediate action required]
🟡 WARNING: [should fix soon]
🟢 PASS: [check passed]
📋 RECOMMENDATION: [improvement suggestion]

$ARGUMENTS
