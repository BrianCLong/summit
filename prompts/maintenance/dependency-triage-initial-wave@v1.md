# Dependency Triage Initial Wave (v1)

## Goal

Perform an initial dependency audit and apply low-risk remediations.

## Scope

- Run targeted dependency audits (npm/pnpm, Rust, Go, Python).
- Apply safe, low-risk updates that directly remediate identified vulnerabilities.
- Update triage documentation and roadmap status.

## Constraints

- No policy changes.
- No production infra changes.
- Evidence-first: capture audit outputs and document decisions.

## Required Outputs

- Updated dependency triage notes in `docs/DEPENDENCY_TRIAGE.md`.
- Roadmap status update in `docs/roadmap/STATUS.json`.
- Remediation changes limited to direct dependency/security fixes.

## Allowed Operations

- Create or edit documentation.
- Update lockfiles or module metadata for security fixes.
