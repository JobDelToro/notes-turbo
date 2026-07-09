---
name: testing-patterns
description: "Use when writing tests or designing test strategy. Triggers: 'test', 'pytest', 'factory', 'APITestCase', 'coverage', 'mock', 'assert', 'ownership'."
---

# Testing Patterns (pytest-django + factory-boy + DRF)

## Factories (factory-boy)

```python
class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f"user{n}@example.test")  # deterministic, not real PII

class NoteFactory(DjangoModelFactory):
    class Meta:
        model = Note
    user = factory.SubFactory(UserFactory)
    title = "Untitled"
```

Deterministic defaults; override only the field under test. Never hand-build realistic emails/names.

## Ownership Isolation (MANDATORY for every owned model / endpoint)

User A must never reach user B's data. The cross-user case returns **404, not 403** — do not leak existence.

```python
def test_cannot_access_another_users_note(self):
    note = NoteFactory(user=self.user_a)
    self.client.force_authenticate(self.user_b)          # or send user B's cookie
    assert self.client.get(f"/api/notes/{note.id}/").status_code == 404
    assert self.client.patch(f"/api/notes/{note.id}/", {"title": "x"}).status_code == 404
    assert self.client.delete(f"/api/notes/{note.id}/").status_code == 404
    assert note.id not in [n["id"] for n in self.client.get("/api/notes/").json()["results"]]
```

## API Test Template (per endpoint)

```python
class TestCreateNote(APITestCase):
    def test_creates_for_authenticated_user(self): ...      # 201, note.user == request.user
    def test_rejects_unauthenticated(self): ...              # 401
    def test_validates_body(self): ...                       # 400 with {code, message, details}
    def test_cannot_access_another_users_note(self): ...     # 404 (see above)
```

## AI Assist Tests

- No key set → assert the deterministic **heuristic** path runs (no network).
- Key set → **mock** the provider HTTP call; assert request shape and mapping. Never hit Groq in tests.

## Rules

- Deterministic: no real network, no `sleep`/wall-clock (freeze time if asserted), seed randomness.
- Independent tests; build state in setup; rows cleaned up (transaction rollback per test).
- Assert query counts for list endpoints (`assertNumQueries`) to catch N+1 regressions.
- **Never call something "tested" without running `pytest` and showing the real output.**
