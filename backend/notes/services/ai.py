"""AI assist — auto-categorize and summarize notes.

The provider is an OpenAI-compatible endpoint (Groq by default), so it is
swappable via env (``LLM_BASE_URL`` / ``LLM_API_KEY`` / model names). When no
key is configured the feature degrades gracefully:

* ``categorize_note`` falls back to a keyword heuristic.
* ``summarize_note`` falls back to a short extractive summary.

``available`` in the response tells the client whether the real LLM is wired
up, so the UI can label heuristic results honestly.
"""

from __future__ import annotations

import logging
import re

from django.conf import settings

logger = logging.getLogger(__name__)

# Keyword hints for the four default categories (Random Thoughts is the catch-all).
_KEYWORDS: dict[str, list[str]] = {
    "School": [
        "class",
        "exam",
        "homework",
        "study",
        "assignment",
        "lecture",
        "deadline",
        "school",
        "teacher",
        "course",
        "professor",
        "grade",
    ],
    "Personal": [
        "book",
        "read",
        "gym",
        "health",
        "family",
        "friend",
        "travel",
        "hobby",
        "recipe",
        "personal",
        "goal",
        "budget",
        "grocery",
    ],
    "Drama": [
        "drama",
        "fight",
        "gossip",
        "argument",
        "breakup",
        "conflict",
        "angry",
        "annoyed",
        "betrayed",
        "jealous",
    ],
}


def _client():
    """Return an OpenAI-compatible client, or ``None`` when AI is not configured."""
    if not settings.LLM_API_KEY:
        return None
    try:
        from openai import OpenAI

        # Short timeout so a slow/hung provider can't tie up a worker for minutes
        # (the SDK default is 600s). No SDK retry: the keyword heuristic IS the
        # fallback, so a single 12s ceiling beats retrying and doubling the wait.
        return OpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
            timeout=12.0,
            max_retries=0,
        )
    except Exception:  # pragma: no cover - defensive, import/env issues
        logger.exception("Could not initialize the LLM client")
        return None


def _heuristic_category(content: str, categories: list[dict]):
    text = (content or "").lower()
    best_name, best_score = "Random Thoughts", 0
    for name, keywords in _KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_name, best_score = name, score
    match = next((c for c in categories if c["name"] == best_name), None)
    if match is None and categories:
        match = categories[0]
    return match


def categorize_note(content: str, categories: list[dict]) -> dict:
    """Suggest the best-fitting category for a note."""
    has_key = bool(settings.LLM_API_KEY)
    if not content or not content.strip():
        return {"available": has_key, "category_id": None, "category_name": None, "source": None}

    client = _client()
    if client is not None:
        names = [c["name"] for c in categories]
        try:
            prompt = (
                "Classify the note into exactly one of these categories: "
                f"{', '.join(names)}.\nReply with ONLY the category name, nothing else.\n\n"
                f"Note:\n{content[:2000]}"
            )
            completion = client.chat.completions.create(
                model=settings.LLM_CLASSIFIER_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=16,
            )
            answer = (completion.choices[0].message.content or "").strip().lower()
            match = next((c for c in categories if c["name"].lower() == answer), None)
            if match is None:
                match = next((c for c in categories if c["name"].lower() in answer), None)
            if match is not None:
                return {
                    "available": True,
                    "source": "llm",
                    "category_id": match["id"],
                    "category_name": match["name"],
                }
        except Exception:
            logger.exception("LLM categorize failed; using heuristic fallback")

    match = _heuristic_category(content, categories)
    return {
        "available": has_key,
        "source": "heuristic",
        "category_id": match["id"] if match else None,
        "category_name": match["name"] if match else None,
    }


def summarize_note(content: str) -> dict:
    """Summarize a note in one or two sentences."""
    has_key = bool(settings.LLM_API_KEY)
    if not content or not content.strip():
        return {"available": has_key, "summary": "", "source": None}

    client = _client()
    if client is not None:
        try:
            completion = client.chat.completions.create(
                model=settings.LLM_GENERATOR_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You summarize personal notes in one or two concise sentences.",
                    },
                    {"role": "user", "content": content[:4000]},
                ],
                temperature=0.3,
                max_tokens=160,
            )
            summary = (completion.choices[0].message.content or "").strip()
            return {"available": True, "source": "llm", "summary": summary}
        except Exception:
            logger.exception("LLM summarize failed; using heuristic fallback")

    sentences = re.split(r"(?<=[.!?])\s+", content.strip())
    summary = " ".join(sentences[:2])[:280]
    return {"available": has_key, "source": "heuristic", "summary": summary}
