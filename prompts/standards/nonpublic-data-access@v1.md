# Prompt: Non-Public Data Access Standards

## Goal
Produce Summit's non-public data access standard, data handling guidance, and operational runbook
with enforceable policy gating, HITL approvals, secure browsing collection, and evidence artifacts.

## Scope
- `docs/standards/nonpublic-data-access.md`
- `docs/security/data-handling/nonpublic-data-access.md`
- `docs/ops/runbooks/nonpublic-data-access.md`
- `repo_assumptions.md`
- `docs/roadmap/STATUS.json`

## Requirements
- Reference Summit Readiness Assertion and governance authority files.
- Enforce deny-by-default, least-privilege, and provenance requirements.
- Include deterministic artifact requirements and evidence ID pattern.
- Document HITL approval protocol and secure browsing isolation.
- Update roadmap status with initiative note.

## Verification
- Validate links and authority references.
- Ensure deterministic artifact requirements exclude timestamps.
- Ensure scope adherence (docs + roadmap only).

## Constraints
- No refactors; documentation-only updates.
- Feature flags default OFF; non-public tools disabled unless enabled.
