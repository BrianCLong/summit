# Reviewer & Auditor Guide

## Overview
This document describes the automated guarantees and invariant enforcement mechanisms in the Summit platform.
Any deviation from these guarantees is considered a critical regression.

## 1. System Invariants
Invariants are non-negotiable rules defined in `server/src/invariants/definitions.ts`.
They are enforced by the `InvariantService` (`server/src/invariants/enforcer.ts`).

| Invariant ID | Name | Description | Severity |
|---|---|---|---|
| **INV-001** | Provenance Integrity | All state mutations must be recorded. | Critical |
| **INV-002** | Agent Permissions | Agents must not exceed allowed scopes. | High |
| **INV-003** | Analytics Labeling | Analytics data must have sensitivity labels. | Medium |
| **INV-004** | Autonomy Constraints | High-stakes ops require authorization. | Critical |

### Verification
- **Code Location**: `server/src/invariants/`
- **Tests**: `server/tests/invariants/enforcer.test.ts`
- **How to verify**: Run `npm test server/tests/invariants/enforcer.test.ts`

## 2. Provenance Completeness
Every state-changing API response must include an `X-Provenance-ID` header.
This is enforced by the `provenanceGuardMiddleware`.

### Verification
- **Code Location**: `server/src/middleware/provenanceGuard.ts`
- **Tests**: `server/tests/invariants/provenance_guard.test.ts`
- **Violation Behavior**: Emits a `violation` event to the InvariantService (logs to error stream).

## 3. Agent Drift Defense
Agents are restricted to explicit scopes defined in their context.
The Invariant Service checks `INV-002` before execution.

### Verification
- **Tests**: `server/tests/invariants/agent_drift.test.ts`

## How to Audit
1. **Check the definitions**: Ensure `definitions.ts` reflects the policy.
2. **Run the suite**: `npm test server/tests/invariants/`
3. **Monitor Logs**: Look for `[InvariantService] Violation` in production logs.
