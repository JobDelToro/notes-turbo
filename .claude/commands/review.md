---
description: 'Execute a comprehensive code review'
---

Execute a COMPREHENSIVE CODE REVIEW. Check every dimension:

1. **Correctness**: Does the logic do what it claims? Edge cases, null/empty, off-by-one, error paths.
2. **Security**: OWASP Top 10, input validation (DRF serializer / Zod), auth on every endpoint, secret exposure,
   CORS/CSRF for cookie auth, no `dangerouslySetInnerHTML` on unsanitised user content.
3. **Object ownership**: Is every queryset filtered to `request.user`? Is a client-supplied id looked up _inside_ that
   scoped queryset? Does cross-user access return **404 (not 403)**? Is `user` read-only + set server-side? Is there a test?
4. **N+1 / querysets**: Any query inside a loop? Are `select_related` (FK) / `prefetch_related` (reverse/M2M) used where a
   serializer traverses relations? Is `note_count` on categories aggregated, not counted per row? Are list endpoints paginated?
5. **Migrations safety**: Is there a migration for every model change, and does `makemigrations --check` pass? Any destructive
   op (drop/rename column, add NOT NULL to a populated table) — is there an expand/contract plan instead of a blind drop?
6. **DRF serializer validation**: Real `validate_*`/`validate` for business rules, writable-field whitelist, read-only `user`,
   no hand-built response dict where a serializer fits, output serializer distinct from the ORM object.
7. **Error handling**: Every failure path handled, nothing swallowed, user-safe messages, correct status codes, the standard
   `{ code, message, details }` shape via the custom exception handler.
8. **Types**: Python type hints present and honest (no unexplained `# type: ignore`); TS strict, no `any`, no `@ts-ignore`.
9. **Tests**: Sufficient? Happy path + auth-failure + ownership-isolation? Deterministic (no network, no wall-clock)?
10. **Accessibility**: Labels tied to inputs, `aria-label` on icon buttons, keyboard reachable, visible focus, contrast on cream.

Also flag: hardcoded secrets, `print`/`console.log`, dead code, and any AI-attribution trace (the human is the sole author).

Output format:
🔴 CRITICAL: [must fix before merge, blocks the PR]
🟡 IMPORTANT: [should fix, can be a follow-up]
🟢 SUGGESTION: [nice-to-have improvement]
✅ GOOD: [well-written code worth calling out]

$ARGUMENTS
