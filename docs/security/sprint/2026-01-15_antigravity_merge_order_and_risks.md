# Security Sprint Merge Order & Risk Analysis (2026-01-15)

## Executive Summary

We have audited the two P0 security PRs.

- **PR #16287 (Python RCE Patch-set)**: **MERGE FIRST**. Secure, touches isolated `api/` components, critical fix for CVE-2025-4517.
- **PR #16318 (Security Hardening)**: **MERGE SECOND**. Requires remediation of `new Function` usage in `server/src/migrations/migrationFramework.ts` before merge.

## Detailed Analysis

### PR #16287: Python RCE Patch-set

- **Branch**: `security/batch-1b-python-rce` -> `pr-16287`
- **Scope**: `api/security/tar_extraction.py`, `api/tests/`
- **Audit Findings**:
  - [x] **Correctness**: Implements strictly validated tar extraction (no absolute paths, no traversal, no symlinks/devices).
  - [x] **Tests**: Comprehensive `pytest` coverage for traversal and malicious payloads.
  - [x] **Dependencies**: Minimal/Correct.
  - [x] **Secrets**: None found.
- **Risks**: Low. Isolated to Python service API.
- **Recommendation**: **Merge Immediately**.

### PR #16318: Security Scanning & Hardening (Eval Fix)

- **Branch**: `security/batch-1a-npm-supply-chain` (or equivalent hardening base) -> `pr-16318`
- **Scope**: `server/src/migrations/migrationFramework.ts`
- **Audit Findings**:
  - [!] **Eval Usage**: `new Function` found in `migrationFramework.ts`. **MUST FIX**.
  - [ ] **Tests**: Needs isolation tests for the Sandbox fix.
- **Risks**: Medium. Changing migration execution engine requires regression testing of existing migrations.
- **Micro-Plan**:
  1. Replace `new Function` with `node:vm`.
  2. Add `server/tests/security/isolation.test.ts` to verify sandbox escape prevention.

## Conflict Analysis

- **Direct Conflicts**: None. (API vs Server).
- **Indirect Conflicts**: None anticipated.

## Merge Strategy

1. **Merge #16287** to `main` now.
2. **Apply Fix** to #16318 (switch to `vm`).
3. **Verify** #16318.
4. **Merge #16318**.
