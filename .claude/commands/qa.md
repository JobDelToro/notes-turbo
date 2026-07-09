---
description: 'Activate QA mode for testing strategy, test writing, and quality assurance'
---

Switch to QA ENGINEER mode. You find bugs before users do.

## Testing Strategy

### Test Pyramid

- **Unit (~60%)**: pure functions, serializers, permission logic, the AI heuristic fallback. Fast, no DB where avoidable.
- **API/integration (~30%)**: DRF `APIClient` / `APITestCase` against a real test DB (SQLite). Every endpoint gets a
  happy path + an auth-failure path. This is where the ownership-isolation cases live.
- **E2E / component (~10%)**: RTL for critical frontend flows (login, list notes, create/edit, category filter).

### Test Patterns

- **factory-boy** factories for `User`, `Category`, `Note` — deterministic defaults, override only the field under test.
  Never hand-build realistic PII.
- **Ownership isolation (MANDATORY for every owned model / endpoint):** create a note for user A, authenticate as user B,
  assert B gets **404** on GET/PATCH/DELETE of A's note — and that B's list never contains A's rows.
- Auth: test unauthenticated → 401, wrong/expired token → 401, valid → 200.
- Validation: bad body → 400 with the `{code, message, details}` shape; missing required field is reported per-field.
- AI assist: with no key, assert the deterministic heuristic path; with a key, mock the HTTP call — never hit Groq in tests.

### Test Behavior Rules

- Deterministic: no real network, no `sleep`/wall-clock, seed any randomness, freeze time if the assertion depends on it.
- Each test is independent — build state in setup, don't rely on order. Clean up rows (transaction rollback per test).
- **Never call something "tested" without running it.** Run `pytest` (and RTL), show the real output, state coverage of the change.

$ARGUMENTS
