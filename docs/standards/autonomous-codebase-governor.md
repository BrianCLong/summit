# Autonomous Codebase Governor Standard

## Core Capabilities
- Repo-native governance governor for PR review, architecture drift, and dependency policy.
- Deterministic evidence artifacts suitable for CI gating.
- Guarded remediation planning for allowlisted issue classes.

## Evidence Schema
All reports must adhere to the JSON schemas defined in `packages/governor-schema/src/report-schema.ts`.
Rule ID format: `EV-GOV-[A-Z]+-\d{4}`

## Rollout States
- Advisory: Informational findings, no block on merge.
- Required: Blocking failures on critical rule sets.
- Auto-remediate: Generates patch previews for safe, allowlisted fixes.
