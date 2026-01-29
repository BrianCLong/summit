# Repo Assumptions Ledger (Subsumption Engine v4)

## Verified
- Summit enforces GA-grade governance and deterministic evidence patterns.
- CI scripts exist under scripts/ci/* style paths (pattern-level).

## Assumed (validate)
- Node.js is available in CI runners.
- GitHub Actions is the CI system of record.
- Adding an additive workflow job will not break branch protection.

## Must-not-touch (blast radius)
- No refactors in workspaces/packages/*
- No modifications to existing release automation unless explicitly needed for gating.
- No public API changes.

## Required checks
- Unknown names; discover via GitHub UI/API (see required_checks.todo.md).
