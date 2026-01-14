# Prompt: Reproducible Build Gate (GA)

Implement a reproducible build gate that runs two isolated builds for the same commit, hashes
canonicalized artifacts, detects nondeterminism patterns, and emits audit-ready evidence artifacts.

Constraints:

- Prefer zero new dependencies; reuse repo-standard tooling.
- Deterministic normalization rules must be explicit and documented.
- Gate must work in offline mode when policy requires.
- Provide fast/full modes and workspace allowlists.
- Never use wall-clock time to determine pass/fail.

Deliverables:

- Policy file in docs/ci for modes, globs, and normalizations.
- Dependency-free runner in scripts/ci.
- CI wiring as a required check with fast mode on PRs and full mode on main/nightly.
- Package script to run the gate.
- Runbook documenting behavior and interpretation.
