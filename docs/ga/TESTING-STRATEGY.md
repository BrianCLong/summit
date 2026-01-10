# GA Testing and Verification Strategy

This document defines the tiered verification model used during the MVP-4 → GA hardening window. The goal is to keep verification deterministic even while parts of the global toolchain (Jest/ts-jest, pnpm resolution) remain fragile.

## Tier Model

- **Tier A — Canonical CI Tests (`@ga-critical`)**
  - Lives alongside existing Jest suites.
  - Tests are tagged with `@ga-critical` in the test name or description so reviewers can spot them instantly.
  - Must respect existing CI wiring (no config changes). Only add when the current Jest lane is stable for that surface.

- **Tier B — Node-Native Verification**
  - Uses `node --test` or `tsx` with zero runtime side-effects.
  - Files live under `testing/ga-verification/` and are suffixed `.ga.test.mjs` (or `.ga.test.ts` when tsx is used).
  - Purpose is to unblock validation when Jest is unstable; these are verification harnesses, not long-term unit tests.

- **Tier C — Policy & Schema Validation**
  - JSON/Zod/Schema validations that require no test runner.
  - Artifacts live under `docs/ga/` (policy declarations) and `scripts/ga/` (validators).
  - Executed via `node scripts/ga/verify-ga-surface.mjs` or equivalent Make targets.

## Directory & Naming Conventions

- **Tier A**: Keep within existing test roots (e.g., `__tests__/`, `tests/`). Prefix GA cases with `@ga-critical` in the title. Avoid adding new Jest configs.
- **Tier B**: Place files in `testing/ga-verification/` and use the suffix `.ga.test.mjs`. Keep tests deterministic and read-only.
- **Tier C**: Store schemas/controls in `docs/ga/*.json` and validators in `scripts/ga/*.mjs`. Validators must fail loudly on missing coverage.

## Execution Commands

- **Full GA sweep:** `make ga-verify`
- **Node-only verification:** `node --test testing/ga-verification/*.ga.test.mjs`
- **Schema-only validation:** `node scripts/ga/verify-ga-surface.mjs`
- **If the global Makefile parsing is blocked in your environment:** fall back to the direct `node` commands above; the GA scripts are self-contained and do not rely on the wider toolchain.

## Review Expectations

1. Every GA-critical change must have at least one Tier A, B, or C artifact.
2. New code **may not** silently claim Legacy Mode; if Jest is unavailable, add Tier B or Tier C verification instead.
3. Tests must be self-describing: include the feature name and tier in titles and file names.
