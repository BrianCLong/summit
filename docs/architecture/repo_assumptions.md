# Repository Assumptions for OES/EOT Implementation

This document tracks structural assumptions made during the implementation of the Orbital Espionage Shield (OES) & Ephemeral Orbit Twin (EOT) module.

## Directory Structure
- `src/` contains source code (TypeScript/Python).
- `tests/` contains test files matching `src/` structure.
- `docs/` contains documentation.
- `scripts/` contains utility scripts.
- `out/` is used for build outputs or artifacts.

## CI Checks
- `lint`: Code linting.
- `unit`: Unit tests.
- `policy`: Policy enforcement checks.
- `ci:eot-integrity`: Checks integrity of EOT nodes and artifacts.
- `ci:oes-inference`: Validates Inference Surface Model (ISM) gradients.
- `ci:oes-paths`: Validates adversary path generation and mitigation mapping.
- `ci:oes-cross-domain`: Checks cross-domain path synthesis (Space -> Ground -> OT).
- `ci:oes-pattern-shaping`: Validates Pattern Shaping Planner (PSP) outputs.
- `ci:oes-safety-constraints`: Enforces safety constraints on PSP recommendations.
- `ci:tenant-isolation`: Enforces tenant isolation rules.
- `ci:evidence-verify`: Verifies evidence artifacts.
- `ci:dep-delta`: Checks dependency changes.

## Forbidden Actions
- No modification of `auth/` or `tenancy/` core modules without strict review.
- No editing of production connector logic in `src/connectors/` unless explicitly required.
