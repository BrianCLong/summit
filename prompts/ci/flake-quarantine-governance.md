# Flake Quarantine Governance Prompt

You are implementing a controlled flake quarantine mechanism for Summit CI.

## Objectives

- Create and enforce a flake registry with ownership, tickets, and expiration.
- Validate registry entries and enforce strict expiry windows.
- Disallow soft gates without registry backing.
- Surface quarantine usage in workflow summaries and release SLO reporting.
- Publish an automated flake debt issue with owner reminders.

## Required Scope

- `.github/` workflows, registry, and automation
- `scripts/ci/` validators and reporters
- `schemas/` registry schema
- `docs/release/` documentation updates
- `docs/roadmap/STATUS.json`
- `tests/utils/` for quarantine helpers

## Guardrails

- No blanket continue-on-error for release-critical jobs.
- All exceptions must be time-boxed and explicitly owned.
- Produce machine-readable flake encounter artifacts.
- Keep changes auditable and aligned with governance references.
