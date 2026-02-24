# IntelGraph GA-Readiness Gap Matrix

This document outlines the current state of the IntelGraph ecosystem against the "General Availability" (GA) criteria, based on a code audit performed on 2026-02-24.

## 1. Secrets & Security Hygiene

| Requirement | Status | Findings |
| :--- | :--- | :--- |
| **Secrets Committed** | ✅ **Resolved** | `.env` files are correctly ignored in `.gitignore`. |
| **Dev Passwords** | ⚠️ **Gap** | `docker-compose.dev.yaml` contains hardcoded default passwords (e.g., `ELASTICSEARCH_PASSWORD:-devpassword`). |
| **Lockfile Consistency** | ✅ **Resolved** | `pnpm-lock.yaml` is enforced. `package-lock.json` and `yarn.lock` are absent/ignored. |

## 2. Ledger Durability & Provenance

| Requirement | Status | Findings |
| :--- | :--- | :--- |
| **In-Memory Ledger** | ✅ **Resolved** | Ledger is persistent (Postgres/TimescaleDB), not in-memory. |
| **Implementation Consistency** | ❌ **Critical Gap** | Two competing implementations exist: <br> 1. `server/src/provenance/ledger.ts` (Postgres V2, used by `IntelGraphService`) <br> 2. `server/src/services/provenance-ledger.ts` (TimescaleDB, "GA-Core"). <br> This represents significant architectural drift. |
| **Type Safety** | ❌ **Critical Gap** | Both ledger files use `@ts-nocheck`, disabling TypeScript validation. |

## 3. Schema & Capabilities

| Requirement | Status | Findings |
| :--- | :--- | :--- |
| **Time-Awareness** | ❌ **Gap** | The canonical schema (`server/src/graph/schema.ts`) lacks `validFrom` / `validTo` properties on `BaseNode`, contradicting the "Time-Aware" architectural goal. Only `createdAt`/`updatedAt` exist. |
| **Evidence-First** | ✅ **Ready** | Schema explicitly supports `Claim`, `Evidence`, and `Decision` entities. |
| **Vector Search** | ⚠️ **Gap** | `findSimilarNodes` in `IntelGraphService.ts` is a basic property match, lacking vector embedding support. |

## 4. Code Quality & Testing

| Requirement | Status | Findings |
| :--- | :--- | :--- |
| **Type Safety** | ❌ **Critical Gap** | Core service `IntelGraphService.ts` uses `@ts-nocheck`. |
| **Test Reliability** | ❌ **Gap** | Tests (`IntelGraphService.test.ts`) fail to run due to configuration errors (`ts-jest` preset missing). |
| **Code Completeness** | ⚠️ **Gap** | `IntelGraphService.ts` contains `// FIX: pass props properly` comments, indicating unfinished refactoring. |

## Recommendations

1.  **Unify Ledger:** Deprecate one of the ledger implementations (likely consolidate on the TimescaleDB "GA-Core" version if it's the target) and remove the other.
2.  **Enforce Types:** Remove `@ts-nocheck` from core services and fix resulting type errors.
3.  **Schema Update:** Add `validFrom` and `validTo` to `BaseNode` in `server/src/graph/schema.ts`.
4.  **Secure Defaults:** Remove hardcoded passwords from `docker-compose.dev.yaml` and use strict env var requirements.
5.  **Fix Tests:** Correct `jest.config.js` to support the ESM preset for `ts-jest`.
