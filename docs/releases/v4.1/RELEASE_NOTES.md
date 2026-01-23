# Summit Platform v4.1 (MVP-4) Release Notes

**Release Date:** January 19, 2026
**Version:** 4.1.4

## Overview

This release focuses on **Production Hardening**. We have transitioned from a split-service architecture to a unified **AWS EKS** cluster, introduced the **Maestro** orchestration engine for robust background processing, and implemented strict **DataEnvelope** governance on all APIs.

## What's New

- **Maestro Orchestration Engine:** A new Python/FastAPI service dedicated to long-running tasks.
  - Exponential backoff (3 attempts) for AI tasks.
  - 60s strict timeouts to prevent zombie processes.
  - Cancellation support for running jobs.
- **Governance DataEnvelope:** All API responses now return a standardized JSON structure containing the payload, metadata, and a computed **GovernanceVerdict**.
- **Summit Doctor CLI:** A new utility (`summit-doctor`) to verify environment health, version compatibility, and configuration validity.

## Mission Assurance (SLA & Performance)

Summit v4.1 is verified against the following mission-critical SLAs:

- **ZTA Verification:** P95 latency < 200ms.
- **Remediation MTTR:** P95 Mean Time To Recovery < 7 minutes.
- **Security Overhead:** Confidential compute overhead < 7%.
- **Quantum Attestation:** P95 verification latency < 5ms.
- **RGE Generation:** Regulator-Grade Export generation < 120s.

## Improvements

- **Observability:** Added correlation ID propagation across Node.js (Graph) and Python (Maestro) services for full-trace debugging.
- **Security:** Implemented `helmet` for HTTP security headers and strictly enforced Content Security Policy (CSP).
- **Build System:** Migrated to ESM modules and Node.js 20 LTS.
- **Type Safety:** Fixed ~25 critical TypeScript errors in the build pipeline; enforced Zod schema validation on startup.

## Bug Fixes

- Fixed race conditions in Neo4j session management.
- Resolved "Split-Brain" deployment issues by unifying Docker builds.
- Fixed `PropertyKey[]` casting issues in the CLI graph client.

## Breaking Changes

- **API Response Format:** Clients consuming raw JSON will need to update to parse the new `DataEnvelope` structure (e.g., `response.data.payload` instead of `response`).
- **Auth Tokens:** New JWT format with enhanced claims; old tokens must be refreshed.

## Known Issues / Limitations

- **Background Jobs:** Currently using in-memory queues (simulated) for the MVP-4 build. Production deployment requires a persistent Redis/BullMQ backend (verified but config required).
- **Documentation:** Developer docs for the new Plugin SDK are currently in Beta.

## Upgrade Steps

1.  **Backup Data:** Snapshot RDS (Aurora) and Neo4j.
2.  **Update Config:** Validate `.env` against the new schema using `summit-doctor`.
3.  **Deploy Helm Chart:** Apply the `v4.1` chart to your EKS cluster.
4.  **Run Migrations:** Execute `npm run db:migrate` for Postgres and the Cypher migration scripts for Neo4j.
