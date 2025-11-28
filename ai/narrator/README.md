# Fact-Bound Narrator (Prompt #66)

- **Feature flag:** `NARRATOR_ENABLED` (default: false)
- **API:** POST `/narrate` -> `{summary, claims[], citations[]}`; deterministic seeded mode
- **Rules:** refuse claims without citations; redaction-aware snippets; LAC enforcement
- **UI:** scope selector, claim table w/ citation chips, fix-missing-proof flow
- **Tests:** snapshots, missing-citation refusals, p95 ≤1.2s for 50-claim briefs (cached), contradiction hooks
