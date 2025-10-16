# IntelGraph – Full Platform Evaluation (2025-08-24)

## Executive Summary

- **Overall maturity:** Strong architecture with GraphQL → services → Neo4j core, real-time channels, and OPA-backed ABAC. Tooling and docs are unusually comprehensive for an early platform.
- **Strengths:** Clean multi-stage Dockerfiles, Helm charts, rich CI (≈59 workflows incl. CodeQL/Trivy), OpenTelemetry hooks, GraphRAG resolvers, audit/provenance scaffolding, and good test structure.
- **Key risks:** Secrets hygiene (.env committed), a few code-quality papercuts (import duplication; Python module layout), wide dependency surface, and provenance ledger still in-memory (needs durable signing & export).
- **Go‑to‑prod:** Feels close with the current infra. Address the high/medium findings below, lock secrets, and run the full smoke + e2e suite against a staging cluster.

## Architecture & Components (observed)

- **API:** Node/TS GraphQL (Apollo + graphql-ws) with resolvers for CRUD, GraphRAG, strategic-intel, and multimodal; Redis for queues/caches; Postgres + Neo4j + TimescaleDB; Kafka optional for ingest.
- **Frontend:** React + Vite + Apollo Client + MUI, Cytoscape & Leaflet for graph and map UIs; Socket.IO for realtime analytics/AI channels.
- **Security:** OPA rego with _deny-by-default_ gates; JWT auth; rate limiting & helmet enabled; ABAC guardrails at GraphQL layer.
- **Observability:** prom-client metrics, OpenTelemetry SDK/exporters, pino/winston logs.
- **ML/AI:** GraphRAG route/resolvers; simple GNN link-prediction demo; NLP/NER hooks.
- **Ops:** Docker Compose for local; 13+ Helm charts for services; Terraform for envs; GitHub Actions for CI/CD, security scans, and IaC drift detection.

## Codebase Snapshot

- **Files:** 2,258 total
- **Top languages by lines:** .json 71,948, .js 63,622, .ts 58,193, .py 45,365, .jsx 31,617, .md 19,189
- **GraphQL schema:** present at `docs/API_GRAPHQL_SCHEMA.graphql`
- **OPA policies:** 10 rego files; GraphQL auth policy is deny-by-default.
- **Helm charts:** 13
- **Workflows:** 59 CI/CD/security workflows
- **Tests:** 89 test files; server enforces coverage thresholds.
- **License:** MIT

## Security Posture

- **Positive:** OPA ABAC with deny‑by‑default; server‑side rate limiting and helmet; CodeQL & Trivy workflows; pre‑commit hooks include private key detection; policy tests present.
- **Weak spots:** `.env` committed with dev secrets; docker-compose dev passwords; no Vault/KMS wiring shown in local compose; provenance ledger is ephemeral (in‑memory).

## Test & Quality

- **Server:** Jest config with explicit `coverageThreshold` (85% branches/functions/lines/statements).
- **Client:** Jest/JSDOM set up with junit and coverage exporters (thresholds not enforced).
- **CI:** Central multi-project jest config + per‑project configs; upload of coverage reports; many dedicated workflows (lint, typecheck, e2e, scanners).

## Ops & Deployability

- **Local:** `docker-compose.yml` spins up Postgres, Neo4j, Redis, Kafka, server, client, and ancillary services. Smoke tests exist.
- **Kubernetes:** Multiple Helm charts for core services; Terraform envs for dev/staging/prod incl. EKS GPU module.
- **Gaps to close:** Enforce secret injection via KMS/Secrets Manager; pin container base images; produce a signed SBOM and provenance (SLSA/in‑toto).

## Findings (selected)

- **High – Secrets Hygiene:** .env contains secret-like variables (dev defaults) → _Remove .env from repo history; use environment-specific secret stores (Vault/KMS/SSM). Rotate all demo creds._
- **Medium – Python Module Layout:** api/gnn.py imports gnn*predictor from repo root; not a package → \_Move gnn_predictor.py under api/ (or package), or adjust PYTHONPATH/imports; add unit test to import module.*
- **Low – Code Quality:** Duplicate import statements detected in api/main.py → _Run ruff/black and enable CI lint blocking; clean duplicates._
- **Low – Runtime:** docker-compose uses ts-node for server → _Ensure production uses precompiled JS (Dockerfile already does). Keep ts-node confined to local dev only._

## Priority Recommendations (next 10 days)

1. **P0 – Secrets hygiene:** Delete `.env` from history, rotate all keys, and wire GH OIDC → cloud KMS/Secrets Manager. Block `.env` commits with pre‑commit + CI.
2. **P0 – Golden‑path e2e:** Ensure the Investigation → Entities → Relationships → Copilot → Results flow has Playwright/Cypress e2e that gate merges.
3. **P0 – Policy hardening:** Add explicit multi‑tenant policy tests (tenant mismatch, field‑level redaction). Export a living policy bundle with a versioned changelog.
4. **P1 – Provenance v1:** Replace in‑memory provenance with a durable store, add artifact hashing, and sign with Sigstore (SLSA‑level attestations).
5. **P1 – Import hygiene:** Fix `api/gnn.py` import path; run ruff/eslint as CI blockers; clean duplicated imports.
6. **P1 – SBOM & license scan:** Generate SBOM (CycloneDX) for server/client; add license allowlist check to CI.
7. **P1 – Perf budgets:** Add k6 budgets for 3‑hop path queries (<=1.5s p95) and GraphRAG answers (<=3.0s p95) with nightly runs.
8. **P2 – Data retention:** Enforce retention via a policy table; add tests that red‑mask or purge PII by tag and time window.
9. **P2 – Helm values hardening:** Provide prod values with resource limits, liveness/readiness probes, network policies, and secret references.
10. **P2 – Observability:** Standardize OTel/metrics labels (tenant, investigationId, pathDepth). Add exemplars on hot paths.

## Readiness Scorecard

- Architecture clarity: **A-**
- Security model (OPA/JWT): **B+**
- Secrets management: **C**
- CI/CD depth: **A**
- Test coverage & e2e: **B**
- Observability: **B+**
- Docs/onboarding: **A-**
- Data governance/provenance: **B-**

_This assessment is based on static analysis of the provided repository snapshot (no external network calls)._
