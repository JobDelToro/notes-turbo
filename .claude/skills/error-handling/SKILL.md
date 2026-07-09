---
name: error-handling
description: "Use when implementing error handling, exceptions, or failure recovery. Triggers: 'error', 'exception', 'raise', 'try', 'failure', 'retry', 'fallback', 'status code'."
---

# Error Handling Standards (DRF)

## Custom Exception Handler

Wire a DRF `EXCEPTION_HANDLER` that renders every error as one shape:

```json
{
  "code": "validation_error",
  "message": "Human-readable summary",
  "details": { "title": ["This field is required."] }
}
```

- `code`: stable machine string (`validation_error`, `not_found`, `not_authenticated`, `permission_denied`, `conflict`).
- `message`: safe for the user — never a stack trace or SQL.
- `details`: field-level errors (from serializer `.errors`) or extra context; omit when empty.

## Status Mapping

- 400 invalid input (serializer validation) · 401 missing/invalid auth · 403 authenticated but not allowed ·
  404 missing **or cross-user** resource (don't leak existence) · 409 conflict/duplicate · 429 rate limited ·
  500 unexpected (log the full traceback server-side, return a generic message).

## Rules

1. Never swallow errors silently (`except Exception: pass` is forbidden). Log with context, then handle or re-raise.
2. Never expose tracebacks, SQL, secrets, or PII (note content, emails, tokens) in responses or logs.
3. Raise DRF `APIException` subclasses (or `serializers.ValidationError`) so the handler produces the standard shape.
4. External calls (the LLM/Groq provider): timeout, catch failures, and **degrade to the heuristic fallback** — a provider
   outage must never 500 the request. Optionally retry idempotent calls with a short exponential backoff, then fall back.

## Frontend

- Parse API responses with Zod; on the error shape, surface `message` and map `details` to inline field errors.
