# TTT-Discover Standard (Summit)

## Purpose

Define the Summit-standard discovery runner for test-time training on continuous-reward problems,
including deterministic evidence artifacts, safety gating, and cost controls.

## Summit Readiness Assertion

All discovery runs must align with the Summit Readiness Assertion before promotion.
See `docs/SUMMIT_READINESS_ASSERTION.md`.

## Import/Export Matrix

**Import**
- `problem.yaml` (problem specification)
- Evaluator contract (continuous reward, scalar output)
- Model backend configuration (optional)

**Export**
- Deterministic `report.json`
- Deterministic `metrics.json`
- Deterministic `stamp.json`
- `artifact/` bundle containing outputs only

**Non-Goals**
- Training frontier models
- Optimizing GPU kernels directly
- Replacing external RL libraries

## Evidence Contract

Evidence artifacts must be written to `runs/<run_id>/` and use deterministic serialization
(no timestamps). The `stamp.json` must record `git_sha` and `config_hash` only.

## Determinism & Budgets

- Seeded RNG (or deterministic schedule) required.
- Stable ordering for candidate selection.
- Enforced caps for `max_steps`, `max_cost_units`, and `max_train_updates`.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security
- **Threats Considered**: prompt injection, tool abuse, non-determinism, data leakage
- **Mitigations**: deny-by-default IO, allowlist paths, deterministic serialization, budget aborts
