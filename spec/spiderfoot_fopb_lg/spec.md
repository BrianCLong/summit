# Federated OSINT with Privacy Budgets + Legal/ToS Gates (FOPB-LG)

**Objective:** Safe-by-default OSINT scanning with passive-first posture, active-mode gating, privacy budgets, and auditable scan capsules.

**Core Flow**

1. Receive scan request (targets + purpose).
2. Determine scan mode: passive default; active allowed only with valid authorization token.
3. Select OSINT modules based on legal/ToS/policy constraints and risk scoring.
4. Enforce privacy budgets (lookups, egress bytes, retention) and rate limits per module.
5. Execute modules and collect redacted results.
6. Generate scan ledger with module IDs, commitments to targets, redacted results, compliance rationale.
7. Output scan capsule with ledger, witness chain, determinism token, and optional signature.
