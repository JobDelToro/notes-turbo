"""AI assist: heuristic fallback (no key) and the LLM path (mocked)."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.django_db


def test_categorize_falls_back_to_heuristic_without_key(auth_api, settings):
    settings.LLM_API_KEY = ""
    resp = auth_api.post(
        "/api/ai/categorize",
        {"content": "I have an exam and homework due for class tomorrow"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["available"] is False
    assert resp.data["source"] == "heuristic"
    assert resp.data["category_name"] == "School"


def test_summarize_falls_back_to_heuristic_without_key(auth_api, settings):
    settings.LLM_API_KEY = ""
    resp = auth_api.post(
        "/api/ai/summarize",
        {"content": "First sentence here. Second sentence here. Third one."},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["summary"].startswith("First sentence here.")


def test_ai_rejects_non_string_content(auth_api):
    # A non-string content must be a clean 400, not a 500 on .strip().
    resp = auth_api.post("/api/ai/categorize", {"content": ["a", "b"]}, format="json")
    assert resp.status_code == 400


def test_categorize_uses_llm_when_configured(auth_api, settings, monkeypatch):
    settings.LLM_API_KEY = "test-key"

    class _Message:
        content = "Drama"

    class _Choice:
        message = _Message()

    class _Completion:
        choices = [_Choice()]

    class _Completions:
        def create(self, **kwargs):
            return _Completion()

    class _FakeClient:
        chat = type("Chat", (), {"completions": _Completions()})()

    monkeypatch.setattr("notes.services.ai._client", lambda: _FakeClient())

    resp = auth_api.post("/api/ai/categorize", {"content": "we had a huge fight"}, format="json")
    assert resp.status_code == 200
    assert resp.data["source"] == "llm"
    assert resp.data["available"] is True
    assert resp.data["category_name"] == "Drama"


def test_ai_endpoints_require_authentication(api):
    # Policy: every endpoint has an auth-failure path. The AI views (LLM cost)
    # must not be reachable unauthenticated.
    assert api.post("/api/ai/categorize", {"content": "x"}, format="json").status_code == 401
    assert api.post("/api/ai/summarize", {"content": "x"}, format="json").status_code == 401


def test_ai_is_rate_limited(auth_api, settings):
    # The `ai` throttle scope (20/min) guards LLM cost; the 21st call is 429.
    settings.LLM_API_KEY = ""  # heuristic path → deterministic, no network
    for _ in range(20):
        ok = auth_api.post("/api/ai/categorize", {"content": "note"}, format="json")
        assert ok.status_code == 200
    throttled = auth_api.post("/api/ai/categorize", {"content": "note"}, format="json")
    assert throttled.status_code == 429


def test_summarize_uses_llm_when_configured(auth_api, settings, monkeypatch):
    settings.LLM_API_KEY = "test-key"
    captured: dict = {}

    class _Message:
        content = "A concise summary."

    class _Choice:
        message = _Message()

    class _Completion:
        choices = [_Choice()]

    class _Completions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return _Completion()

    class _FakeClient:
        chat = type("Chat", (), {"completions": _Completions()})()

    monkeypatch.setattr("notes.services.ai._client", lambda: _FakeClient())

    resp = auth_api.post(
        "/api/ai/summarize", {"content": "A long note that needs summarizing."}, format="json"
    )
    assert resp.status_code == 200
    assert resp.data["source"] == "llm"
    assert resp.data["available"] is True
    assert resp.data["summary"] == "A concise summary."
    # Request shape: summarize must use the generator model, not the classifier.
    assert captured["model"] == settings.LLM_GENERATOR_MODEL
