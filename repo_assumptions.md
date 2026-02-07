# Repo Assumptions - self-evolving-agents

This document tracks verified vs assumed repository structures and invariants for the `self-evolving-agents` feature implementation.

## ✅ Verified Paths & Components

- `summit/`: Primary Python package for core logic.
- `summit_harness/`: Modular agent harness and subagent runtime.
- `docs/standards/`: Standards documentation.
- `docs/security/data-handling/`: Data handling and privacy documentation.
- `docs/ops/runbooks/`: Operational runbooks.
- `tests/`: Unified test suite directory.
- `tools/evidence_validate.py`: Evidence integrity and determinism verifier.
- `summit/flags.py`: Feature flag management.

## ⚠️ Assumptions

- `summit/self_evolve/` is the preferred namespace for this feature (requested by user).
- `summit_harness` is the runtime used for agent execution that we will wrap or enhance.
- Evidence artifacts should follow the `index.json` + `report.json` + `metrics.json` + `stamp.json` pattern.
- Python 3.12+ environment is available for execution.

## 🚫 Must-Not-Touch List

- Lockfiles: `pnpm-lock.yaml`, `package-lock.json`, `Cargo.lock`, `requirements.txt` (unless specifically required for dependencies).
- Core Governance: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`.
- Identity/Security: `.security/`, `keys/`, `secrets/`.
- CI/CD Pipelines: `.github/workflows/` (except when adding the scheduled drift job).
