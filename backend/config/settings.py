"""Django settings for the Notes app backend.

Configuration is environment-driven via ``django-environ``. Sensible, secure
defaults are provided so the app boots with zero config (SQLite + dev key),
while production values come from the environment. See ``.env.example``.
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    JWT_COOKIE_SECURE=(bool, False),
    JWT_ACCESS_TTL_MIN=(int, 15),
    JWT_REFRESH_TTL_DAYS=(int, 7),
)

# Load a .env from the repo root first, then a backend-local one if present.
environ.Env.read_env(REPO_ROOT / ".env")
environ.Env.read_env(BASE_DIR / ".env")

# --- Core -------------------------------------------------------------------
SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-do-not-use-in-prod")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")

# Fail fast: never run a real deployment on the shipped insecure default key.
if not DEBUG and SECRET_KEY == "dev-insecure-do-not-use-in-prod":
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DEBUG is off.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # local
    "accounts",
    "notes",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database ---------------------------------------------------------------
# SQLite by default (zero-config). Set DATABASE_URL for Postgres / prod parity.
DATABASE_URL = env("DATABASE_URL", default="")
if DATABASE_URL:
    DATABASES = {"default": env.db_url_config(DATABASE_URL)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# --- Auth -------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- i18n / tz --------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static -----------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- DRF --------------------------------------------------------------------
_RENDERERS = ["rest_framework.renderers.JSONRenderer"]
if DEBUG:
    _RENDERERS.append("rest_framework.renderers.BrowsableAPIRenderer")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("accounts.authentication.CookieJWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_RENDERER_CLASSES": tuple(_RENDERERS),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    # Throttling: scoped rates keep brute-force + LLM-cost abuse in check. Only
    # views that set `throttle_scope` are limited (auth + AI); notes CRUD is not.
    # NOTE: counters live in Django's cache. With no CACHES configured this is
    # per-process LocMemCache — fine for dev, but a multi-worker prod deploy needs
    # a shared CACHES backend (Redis/Memcached) or the effective limit is N×.
    "DEFAULT_THROTTLE_CLASSES": ("rest_framework.throttling.ScopedRateThrottle",),
    "DEFAULT_THROTTLE_RATES": {"auth": "10/min", "ai": "20/min"},
}

# --- JWT (simplejwt) --------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("JWT_ACCESS_TTL_MIN")),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("JWT_REFRESH_TTL_DAYS")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# httpOnly cookie transport for the JWTs (see accounts/authentication.py + views).
AUTH_COOKIE = "access_token"
AUTH_REFRESH_COOKIE = "refresh_token"
AUTH_COOKIE_SECURE = env("JWT_COOKIE_SECURE")
AUTH_COOKIE_HTTPONLY = True
# Lax works when the frontend and API share a site (localhost, or subdomains of one
# registrable domain). A genuinely cross-domain deploy needs "None" (which also
# requires JWT_COOKIE_SECURE=True). See ADR-002.
AUTH_COOKIE_SAMESITE = env("JWT_COOKIE_SAMESITE", default="Lax")
AUTH_COOKIE_PATH = "/"

# --- CORS / CSRF ------------------------------------------------------------
FRONTEND_ORIGIN = env("FRONTEND_ORIGIN", default="http://localhost:3000")
CORS_ALLOWED_ORIGINS = [FRONTEND_ORIGIN]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [FRONTEND_ORIGIN]

# --- OpenAPI (drf-spectacular) ----------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "Notes API",
    "DESCRIPTION": "A charming little notes app — Turbo AI challenge.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# --- AI assist (optional) — OpenAI-compatible seam, Groq by default ---------
LLM_PROVIDER = env("LLM_PROVIDER", default="openai-compatible")
LLM_BASE_URL = env("LLM_BASE_URL", default="https://api.groq.com/openai/v1")
LLM_API_KEY = env("LLM_API_KEY", default="")
LLM_CLASSIFIER_MODEL = env("LLM_CLASSIFIER_MODEL", default="llama-3.1-8b-instant")
LLM_GENERATOR_MODEL = env("LLM_GENERATOR_MODEL", default="llama-3.3-70b-versatile")

# --- Production hardening (only when DEBUG is off) --------------------------
if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
