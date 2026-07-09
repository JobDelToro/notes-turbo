# ADR-004: AI assist — OpenAI-compatible seam, Groq default, heuristic fallback

**Status**: Accepted
**Date**: 2026-07-07
**Author**: Job
**Deciders**: Job

## Context

The app offers two small AI features: suggest a category for a note (`POST /api/ai/categorize`) and summarize a note
(`POST /api/ai/summarize`). Two constraints shape the design: (1) the app must run and demo **without** any paid API key —
a reviewer cloning the repo shouldn't hit a wall; and (2) the provider should be swappable, not welded in. These are two
naturally different workloads: fast, cheap classification vs. higher-quality generation.

## Decision Drivers

- The app must never hard-depend on an external key to function — graceful degradation is required.
- Avoid vendor lock-in; make the provider a configuration detail.
- Keep cost at zero for the challenge while allowing a real model when a key is present.
- Right-size the model per task (classify vs. summarize).

## Options Considered

### Option A: OpenAI-compatible client, Groq by default, deterministic heuristic fallback

- **Description**: Talk to the LLM through an OpenAI-compatible client configured by env (`LLM_PROVIDER`, `LLM_BASE_URL`,
  `LLM_API_KEY`, `LLM_CLASSIFIER_MODEL`, `LLM_GENERATOR_MODEL`). Default `LLM_BASE_URL` to Groq. When `LLM_API_KEY` is empty
  **or** a call fails, fall back to a keyword heuristic (keyword-match a category; extractive first-sentences summary).
- **Pros**: Runs with zero config (heuristic); a free Groq key upgrades quality without code changes; switching to OpenAI/
  another compatible host is a URL + model swap; per-task model selection; provider outages degrade instead of 500.
- **Cons**: Two code paths (LLM + heuristic) to write and test; heuristic quality is modest (acceptable as a fallback).
- **Effort**: M.

### Option B: Hard dependency on one vendor SDK (e.g. OpenAI only)

- **Description**: Use a single vendor's SDK directly, key required.
- **Pros**: Simplest single path.
- **Cons**: No key ⇒ the feature (and the demo) breaks; lock-in to one vendor; an outage takes the endpoint down. Rejected on
  the "must run without a key" constraint.
- **Effort**: S.

### Option C: Local/self-hosted model

- **Description**: Run a small model locally (e.g. via Ollama).
- **Pros**: No external key, fully offline.
- **Cons**: Heavy setup and resource cost for a 7-day solo build; slower; overkill for two tiny features. Rejected.
- **Effort**: L.

## Decision

**Option A.** The AI assist is an **OpenAI-compatible seam** configured entirely via env and defaulting to **Groq**, with a
deterministic **heuristic fallback** whenever the key is missing or a call fails. `LLM_CLASSIFIER_MODEL`
(`llama-3.1-8b-instant`) handles categorize; `LLM_GENERATOR_MODEL` (`llama-3.3-70b-versatile`) handles summarize. The app is
fully functional with no key, better with one, and not locked to any single vendor. Env contract is in
[../tech-stack-versions.md](../tech-stack-versions.md) §5 and `.env.example`.

## Consequences

### Positive

- Clone-and-run with zero secrets; the reviewer sees working endpoints immediately.
- Provider is a config change (Groq ↔ OpenAI ↔ any compatible host); no SDK lock-in.
- Resilient: a provider error falls back instead of failing the request; models are sized per task (cost/quality).

### Negative

- Two paths to maintain and test (LLM call + heuristic).
- Fallback output is noticeably simpler than a real model's.

### Risks

- **Leaking the key or note content.** Mitigation: key is env-only and never logged; only the intended note text is sent, and
  that behaviour is documented.
- **Provider/schema drift or latency.** Mitigation: wrap the call with a timeout and catch-all that triggers the heuristic;
  the seam isolates any single provider's quirks.

## Follow-up Actions

- [x] Implement the OpenAI-compatible client + the heuristic fallback behind one interface (`notes/services/ai.py`).
- [x] Tests: no key ⇒ heuristic path (no network); key present ⇒ mocked provider call (`test_ai.py`).
- [x] Document the env vars in `.env.example` and the endpoints in `architecture.md`.
