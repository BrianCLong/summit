# PR Stack Plan: GA Stabilization

**Status**: Active
**Last Updated**: 2025-10-27
**Authority**: [AGENTS.md](../AGENTS.md) (Jules - Release Captain)

This document is the **single source of truth** for the GA stabilization merge order. All PRs listed here must adhere to the defined ownership boundaries and rebase policy.

## 1. Current PR Inventory

| PR # | Description | Owner | Status | Files Changed (Scope) | Overlap Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#15373** | Security Hotfix | Security | **Critical** | `server/src/security/`, `server/src/auth/` | High (Base) |
| **#15380** | Bundle Updates | Claude | Pending | `.github/workflows/`, `package.json` | High (Supply Chain) |
| **#15381** | Storage/DR Validation | Jules | Pending | `server/src/dr/`, `test/verification/ops.node.test.ts` | Medium |
| **#15382** | Observability | Jules | Pending | `server/src/observability/`, `server/otel.ts` | Medium |
| **#15383** | Issue Sweeper | Jules | Pending | `tools/`, `scripts/` | Low |
| **#15365** | Coverage/Fuzz Gates | Codex | Pending | `.github/workflows/coverage.yml`, `test/fuzz/` | Medium (CI) |
| **#15370** | Turborepo Segmentation | Codex | Pending | `turbo.json`, `package.json`, `apps/*/` | High (Build) |

> **Note**: PRs are tracked virtually. Branches should be named `ga/pr-<number>`.

## 2. Ownership Boundaries

To prevent merge conflicts, the following directories are strictly assigned:

| Lane | Owner | Exclusive Paths (Do Not Touch) |
| :--- | :--- | :--- |
| **Supply Chain** | **Claude** | `.github/workflows/release*`, `.github/workflows/supply-chain*`, `slsa/`, `provenance/` |
| **Quality Gates** | **Codex** | `.github/workflows/coverage*`, `.github/workflows/test*`, `test/fuzz/` |
| **Ops/Release** | **Jules** | `docs/PR_STACK_PLAN.md`, `test/verification/ops*`, `server/src/observability/`, `server/src/dr/` |
| **Shared** | *All* | `docs/` (append-only preferred), `server/src/` (feature logic) |

### Violation Policy
- PRs touching another lane's exclusive paths will be **closed** or **reverted**.
- Coordination must happen in `docs/PR_STACK_PLAN.md` before crossing boundaries.

## 3. Merge Order & Rebase Policy

**Strict Sequential Merge Order**:

1.  **Security Hotfixes** (#15373)
    *   *Checkpoint*: All downstream PRs must rebase.
2.  **Supply Chain / GA Workflows** (Claude)
    *   *Required Checks*: `make ga`, `ga-check`
    *   *Checkpoint*: All downstream PRs must rebase.
3.  **Quality Gates** (#15365 - Codex)
    *   *Required Checks*: `make smoke`
    *   *Checkpoint*: All downstream PRs must rebase.
4.  **Observability Validation** (#15382 - Jules)
    *   *Required Checks*: `make smoke`
5.  **Storage/DR Validation** (#15381 - Jules)
    *   *Required Checks*: `test:verification:ops`
6.  **Automation / Sweepers** (#15383)
    *   *Safe to merge anytime after Step 3.*

### Rules
*   **No merges with RED checks.**
*   **PR Description Requirement**: Must state "Based on PR #<prev>" or "Based on main (post-#<prev>)".

## 4. Verification

Run the validator to ensure this plan is structurally sound:

```bash
npx tsx scripts/verification/verify_pr_stack_plan.ts
```
