# syntax=docker/dockerfile:1

# ─── Stage 1: builder ────────────────────────────────────────────────────────
# Resolve and install dependencies into a self-contained virtualenv. Isolating
# this in its own stage keeps pip, its cache, and any future build toolchain
# (compilers, headers) out of the final image — only the finished venv ships.
FROM python:3.13-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# A venv we can lift wholesale into the runtime stage. Both stages share the
# same base image, so the interpreter the venv points at exists there too.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY requirements.txt .
# BuildKit cache mount reuses downloaded wheels across rebuilds without baking
# them into the image. Installs into the venv (not system site-packages).
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# The venv only needs to *run* the app now, not install packages. Drop its copy
# of the installer so the runtime doesn't carry pip/setuptools twice on top of
# the base image's own — left in, the duplicate adds ~17 MB to the final image.
RUN pip uninstall -y pip setuptools wheel

# ─── Stage 2: runtime ────────────────────────────────────────────────────────
# Slim image with no build tooling: the interpreter, the venv, the app, and an
# unprivileged user. psycopg[binary] bundles libpq, so no apt packages are
# needed at run time.
FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Dependencies come only from the built venv — pip never runs in this stage.
COPY --from=builder /opt/venv /opt/venv
COPY . .

# Collect static (WhiteNoise) as root, create an unprivileged user, then drop to
# it. DJANGO_SECRET_KEY is a throwaway build value; collectstatic reads no real
# secret and touches no database.
RUN DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput \
    && adduser --disabled-password --gecos "" appuser \
    && chown -R appuser /app
USER appuser

EXPOSE 8000

# Migrations run from the compose command / orchestrator; the image just serves.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
