# Summit GA Testing Strategy

## Overview

As we move toward MVP-4 GA Hardening, we face specific environmental constraints (Jest/ts-jest instability, monorepo complexity). To ensure deterministic delivery without blocking on tooling repairs, we are adopting a tiered verification strategy.

## Verification Tiers

### Tier A: Canonical CI Tests (`@ga-critical`)

These are the gold standard tests that must pass in the Continuous Integration (CI) environment. They use the existing Jest infrastructure but are strictly scoped to stable configurations.

*   **Location**: `server/tests/` (Unit/Integration)
*   **Runner**: `npm run test` (Jest)
*   **Tagging**: Use `@ga-critical` in test descriptions or describe blocks.
*   **Constraint**: Must rely only on proven, stable Jest configurations. If a test is flaky due to environment, it is *not* Tier A.

### Tier B: Node-Native Verification

When Jest or the heavy test runner is blocked or unstable locally, we fall back to Node-native verification. This tier is split into two sub-modes to ensure we always have *some* signal.

#### Tier B0: Static Structural Verification (Mandatory)
*   **What**: Checks file existence, exported symbols, and code patterns using static analysis (AST or text parsing).
*   **Dependencies**: Zero. Uses standard Node.js libraries (`fs`, `path`).
*   **Requirement**: Must **always pass** in every environment (Local, CI, Sandbox).
*   **Use Case**: Verifying that API contracts, configuration schemas, and security constants are defined and exported correctly.

#### Tier B1: Runtime Logic Verification (Conditional)
*   **What**: Executes the code to verify logic (e.g., rate limit algorithms, policy evaluation).
*   **Dependencies**: Requires `node_modules` to be installed.
*   **Requirement**: Runs only when dependencies are present. Skips gracefully with a warning if the environment is constrained.
*   **Use Case**: Deep logic verification that doesn't require the full Jest harness.

### Tier C: Policy & Schema Validation

Static verification of configuration, schemas, and policies. This ensures that the "shape" of the system is correct even if runtime behavior isn't fully exercised.

*   **Location**: `policy/`, `schemas/`
*   **Runner**: `npm run verify:policies` or specific make targets.
*   **Tools**: Zod, Ajv, OPA (`check`), JSON Schema validators.
*   **Constraint**: Must be fast and runnable in pre-commit hooks.

## Naming Conventions

*   **Tier A**: `*.test.ts`, `*.spec.ts`
*   **Tier B**: `verify_<feature>.ts` (e.g., `verify_rate_limit.ts`)
*   **Tier C**: `validate_<schema>.ts` or `*.schema.json`

## Workflow

1.  **Prefer Tier A**: Write a standard Jest test if the environment supports it.
2.  **Fallback to Tier B**: Create a `server/tests/verification/verify_<feature>.ts` script.
    *   Implement **B0 checks** first (exports, files).
    *   Implement **B1 checks** wrapped in a dependency probe.
3.  **Enforce Tier C**: Always validate public interfaces (API schemas, config files) with Tier C scripts.
