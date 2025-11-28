# Prompt Registry Scaffold

This scaffold tracks the `feat/prompt-registry` branch with the `feature:PROMPT_REGISTRY_ENABLED` label. It provides the structure for a governed prompt registry with deterministic evaluations and strict privacy controls.

## Layout
- `schemas/`: typed prompt, evaluation, and rollout definitions with versioned history.
- `evaluations/`: deterministic harnesses with seeded datasets and snapshot baselines.
- `tests/`: unit, policy/contract, and Playwright smoke suites aligned to the feature branch workflow.
- `docs/`: lifecycle policies, redaction guidance, and preview environment expectations.

## CI & Feature Flags
- `.github/workflows/feature-flag-branches.yml` enforces lint, unit, policy/contract, and Playwright checks with `PROMPT_REGISTRY_ENABLED=true` on the feature branch.
- Preview environments should publish prompt-registry endpoints and redaction posture; `auto-rollback.yml` remains the failure guard.

## Governance
- No shared DBs; registry artifacts are isolated and versioned. Typed boundaries and schema compatibility rules are mandatory.
- Redact PII in prompts/responses and maintain audit trails; document seeds and rerun guidance for deterministic outcomes.
