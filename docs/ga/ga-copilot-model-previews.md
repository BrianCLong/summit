# GA Checklist: Copilot Model Previews

This checklist governs Summit adoption of Copilot model previews. The checklist is evidence-first and deny-by-default for unknown multipliers or missing policy prerequisites.

## Acceptance Criteria

- Evidence bundle present for catalog, cost, and gate verification.
  - `EVD-CLAUDEOPUS46FAST-CATALOG-001`
  - `EVD-CLAUDEOPUS46FAST-COST-002`
  - `EVD-CLAUDEOPUS46FAST-GATES-003`
- Catalog entry includes state, tiers, surfaces, policy prerequisites, and promo multiplier window.
- Deny-by-default tests confirm missing multiplier blocks during promo window.
- CI gate verifies evidence bundle integrity and timestamp isolation.
- Operational runbook describes preview risks, policy prerequisites, and fallback plan.

## Evidence IDs

| Evidence ID | Purpose |
| --- | --- |
| EVD-CLAUDEOPUS46FAST-CATALOG-001 | Model catalog correctness and public preview attributes. |
| EVD-CLAUDEOPUS46FAST-COST-002 | Premium multiplier window + deny-by-default enforcement. |
| EVD-CLAUDEOPUS46FAST-GATES-003 | CI verification gate + evidence integrity. |

## Public Sources (Operational Facts Only)

- GitHub changelog: Claude Opus 4.6 fast public preview availability and policy prerequisite for Copilot Enterprise. (https://github.blog/changelog/2026-02-07-claude-opus-4-6-fast-is-now-in-public-preview-for-github-copilot/)
- GitHub Copilot requests documentation: premium request multiplier + promotional window. (https://docs.github.com/en/copilot/about-github-copilot/requests-in-github-copilot)
