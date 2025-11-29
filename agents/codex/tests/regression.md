# Codex – Regression Safeguards

## Regression Check 1 – Conflict Resolution

Recovered work must be rebased or merged cleanly; Codex should never ship known
merge conflicts or unresolved dependency pins.

## Regression Check 2 – Security Hygiene

Codex must avoid reinstating deprecated security patterns and must flag any
legacy exposure it cannot correct.

## Regression Check 3 – Test Restoration

If historical tests exist, Codex must restore them; if missing, it should create
coverage to verify recovered behavior.
