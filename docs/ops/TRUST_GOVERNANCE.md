# Trust Governance & Verification Strategy

> **Status**: ACTIVE
> **Owner**: Jules (Q1 Automation Lead)
> **Integrates**: `docs/ga/GA_DEFINITION.md`

## Overview

Trust is not a sentiment; it is a measurable artifact of the system's state. This document defines how we verify trust mechanically, removing human bias from the loop.

## 1. Automated Trust Signals

We rely on **Repo-Local Signals** that are deterministic and verifiable in CI.

| Signal | Source | Automation | Frequency |
|:---|:---|:---|:---|
| **Repo Hygiene** | `git status`, lockfiles | `scripts/ops/check_repo_hygiene.ts` | **Pre-commit / CI** |
| **Security Score** | `SECURITY_SCORECARD.json` | `scripts/ops/update_trust_scorecard.ts` | Daily (Cron) |
| **GA Integrity** | `GA_DEFINITION.md` | `scripts/ga/verify_ga_integrity.ts` | CI (Merge Gate) |
| **Evidence Bundle** | `evidence/` | `scripts/generate-evidence-bundle.sh` | Release Tag |

## 2. Enforcement Gates

### 2.1 Pre-Commit / Local
Developers must run `pnpm verify` before pushing. This now includes:
*   **Hygiene Check**: Ensures no untracked files or lockfile drift.
*   **Lint/Typecheck**: Standard code quality.

### 2.2 CI Gate (Blocking)
The `verify` job in CI enforces:
1.  **Strict Hygiene**: Fails if the checkout is dirty after `pnpm install`.
2.  **Security Baseline**: Fails if `SECURITY_SCORECARD.json` metrics regress below thresholds (future state).
3.  **GA Definition**: Fails if locked files are modified without `governance` label.

### 2.3 Release Gate
Cannot cut a release if:
*   Trust Score < Threshold.
*   Evidence Bundle generation fails.
*   Repo is dirty.

## 3. Automation Implementation Status

| Automation | Script | Status | CI Wired? |
|:---|:---|:---|:---|
| **Trust Scorecard** | `scripts/ops/update_trust_scorecard.ts` | ✅ Implemented | Manual/Cron |
| **Repo Hygiene** | `scripts/ops/check_repo_hygiene.ts` | ✅ Implemented | ✅ Wired (`pnpm verify`) |

## 4. Bypassing Controls

**Emergency Bypass**:
If a gate must be bypassed (e.g., P0 hotfix blocked by hygiene check false positive):
1.  Run with `SKIP_HYGIENE=true pnpm verify` (if supported).
2.  Or use `git commit --no-verify` (local).
3.  **MUST** document the bypass in `docs/governance/EXCEPTION_REGISTER.md`.

## 5. Q1 Objectives

*   Reach 100% automation of the "Trust Snapshot".
*   Eliminate manual "Pre-Release Checklist" steps in favor of CI checks.
