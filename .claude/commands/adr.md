---
description: 'Create an Architecture Decision Record (ADR) for a technical decision'
---

Create an ARCHITECTURE DECISION RECORD (ADR). Follow this format strictly. Save it as
`docs/adr/ADR-NNN-<slug>.md` (next sequential number; template in `docs/adr/ADR-000-template.md`).

## ADR Template

# ADR-[NUMBER]: [Title]

**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Date**: [YYYY-MM-DD]
**Author**: Job
**Deciders**: [who was involved]

## Context

[The problem or situation that requires a decision. Relevant technical and business context. Be specific about the
constraints that actually bind here — solo build, 7-day window, must stay simple and reversible.]

## Options Considered

### Option A: [Name]

- **Description**: [what this entails]
- **Pros**: [advantages]
- **Cons**: [disadvantages]
- **Effort**: [S/M/L]

### Option B: [Name]

- **Description** / **Pros** / **Cons** / **Effort**

### Option C: [Name] (if applicable)

- **Description** / **Pros** / **Cons** / **Effort**

## Decision

[Which option, and WHY. Reference the constraints above. State the trade-offs you are accepting.]

## Consequences

### Positive

- [What improves]

### Negative

- [What you give up / accept as a trade-off]

### Risks

- [Known risks and their mitigations]

## Follow-up Actions

- [ ] [Action item]
- [ ] [Action item]

---

ALWAYS present 2–3 options minimum. NEVER give a single option. Quantify impact where you can.

$ARGUMENTS
