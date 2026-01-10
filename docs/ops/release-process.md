# Release Process (Deprecated)

> **Last Updated**: 2026-01-02
> **Status**: Superseded by `docs/ops/RELEASING.md` (canonical). This file exists only to
> redirect readers to the active release doctrine and to prevent outdated guidance from being
> followed.

## Canonical release guidance

Follow the single source of truth in `docs/ops/RELEASING.md`. It defines:

- Prerequisites and credentials for release operators.
- Locked-step SemVer policy (`package.json` + `CHANGELOG.md`).
- Release workflows (`release-train.yml`, `release-integrity.yml`, `release-ga.yml`).
- Tagging, changelog, evidence, and rollback steps.

## Legacy references

Prior release mechanics that referenced semantic-release or other automated tagging are no longer
active. Use Git history to review legacy behavior if required, but do not treat prior workflows as
current policy.
