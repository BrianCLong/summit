# Trust Dashboard Specification

This document defines the signals used to generate the **Trust Dashboard**, a deterministic snapshot of the repository's integrity and readiness state.

## Overview

**Goal:** Provide a single-glance view of GA integrity.
**Frequency:** On-demand (local) and CI (PR/Merge).
**Format:** Markdown table with PASS/WARN/FAIL status.

## Signals

The following 10 signals are evaluated by the generator:

| Signal Name | Source / Command | Pass Criteria | Owner |
| :--- | :--- | :--- | :--- |
| **1. Repo Cleanliness** | `git status --porcelain` | Output must be empty (no uncommitted changes). | Ops |
| **2. Security Ledger** | `docs/security/FINDINGS_REGISTER.md` | No rows with `Status=Open` AND `Severity=Critical/High`. | Security |
| **3. Assurance Contract** | `docs/assurance/ASSURANCE_CONTRACT.md` | File must exist and be non-empty. | Governance |
| **4. Lint Status** | `pnpm lint` | Exit code 0. | DX |
| **5. Typecheck Status** | `pnpm typecheck` | Exit code 0. | DX |
| **6. Server Unit Tests** | `pnpm --filter intelgraph-server test:unit` | Exit code 0. | Backend |
| **7. Dependency Hygiene** | File system check | `package-lock.json` must NOT exist; `pnpm-lock.yaml` MUST exist. | Ops |
| **8. Evidence Index** | `docs/ops/EVIDENCE_INDEX.md` | File must exist. | Compliance |
| **9. Version Parity** | `package.json` vs `server/package.json` | Versions must match. | Release |
| **10. Banned Patterns** | File search | No files matching `.env`, `*.key`, `*.pem` in root (excluding `.env.example`). | Security |

## Output Format

The generator outputs a Markdown report to `stdout` (or `docs/ops/TRUST_DASHBOARD.md` in snapshot mode).

### Example Output

```markdown
# Trust Dashboard
**Generated:** 2025-05-12T10:00:00Z
**Commit:** a1b2c3d

| Signal | Status | Details |
| :--- | :--- | :--- |
| Repo Cleanliness | ✅ PASS | Working tree clean. |
| Security Ledger | ❌ FAIL | 1 Critical Open finding(s). |
| ... | ... | ... |

**Overall Status:** FAIL
```

## Governance

*   **Hard Gates:** Signals 1, 2, 4, 5, 6, 7, 9, 10 must PASS for a release or critical PR.
*   **Soft Gates:** Signals 3, 8 may WARN without blocking (review required).
