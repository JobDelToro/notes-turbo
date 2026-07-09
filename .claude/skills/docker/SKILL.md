---
name: docker
description: "Use when writing Dockerfiles, docker-compose, or container/local-dev setup. Triggers: 'docker', 'container', 'compose', 'dockerfile', 'image', 'gunicorn', 'healthcheck'."
---

# Docker Standards

## Backend Dockerfile (Django, multi-stage, non-root)

```dockerfile
FROM python:3.13-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

FROM python:3.13-slim AS runner
RUN useradd --create-home --uid 1001 app
WORKDIR /app
COPY --from=builder /install /usr/local
COPY --chown=app:app . .
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request,sys; sys.exit(0) if urllib.request.urlopen('http://localhost:8000/api/schema').status==200 else sys.exit(1)"
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

Serve static with **WhiteNoise** (no separate web server needed for the challenge).

## Frontend Dockerfile (Next.js)

- Multi-stage: `deps` (`npm ci`) → `builder` (`npm run build`, standalone output) → `runner` (copy `.next/standalone`, non-root).
- `EXPOSE 3000`, `HEALTHCHECK` on `/`, run as a non-root user.

## Rules

- Always multi-stage (builder → runner), always non-root, always a `HEALTHCHECK`.
- Pin base images (`python:3.13-slim`, `node:24-alpine`), never `:latest`.
- Layer caching: copy dependency manifests first, install, then copy source.
- `.dockerignore`: `.venv/`, `node_modules/`, `.git`, `.env`, `*.md`, tests. No secrets in layers — inject env at runtime.

## Compose (local parity)

- Services: `backend` (Django/gunicorn), `frontend` (Next.js), optional `db` (`postgres:18-alpine`) for prod parity.
- Env from `.env`; the frontend talks to the backend by service name on the compose network.
