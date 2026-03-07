# Parallel Delivery Prompts: Platform Reliability and Governance

This document captures eight independent delivery prompts prepared for parallel execution by specialized CompanyOS development squads. Each entry includes a concise problem statement, scope, interfaces, deliverables, and acceptance tests suitable for immediate ticketing.

## 1) Golden Path Repo Scaffold + Service Template (Platform Enablement)

**Problem:** Teams need a fast, opinionated starting point that yields a production-ready microservice in under ten minutes.
**Scope:** Repository scaffold, service template, local dev bootstrap, CI baseline, observability defaults, release hygiene.
**Interfaces:** `make dev`, Docker Compose services, CI workflows, `/healthz`, `/readyz`, metrics endpoint, changelog/versioning hooks.
**Deliverables:**

- Standard repo layout (`/cmd`, `/internal`, `/api`, `/configs`, `/deploy`, `/docs`, `/test`).
- Docker Compose + one-command bootstrap (`make dev`).
- CI covering unit/integration/lint/format/secret scan.
- Observability baseline: structured logs, trace IDs, health/ready endpoints, metrics.
- Release automation: versioning, changelog, tagged releases.
- SLO spec stub + runbook stub.
- Evidence: template repo, generated service example, README walkthrough, ADR, local dev + CI screenshots.
  **Acceptance Tests:**
- New service generated from template runs locally and passes CI without manual edits.
- Default SLO stub and runbook included.

## 2) Supply Chain: SBOM + Provenance + Cosign Gate in CI/CD

**Problem:** Enforce deterministic, auditable software supply chain.
**Scope:** Build-time SBOM and provenance, signing, and deployment gating.
**Interfaces:** CI pipeline artifacts, container registry signatures, policy gate on deploy.
**Deliverables:**

- SBOM generated on every build and stored as artifact.
- Provenance attestation for build outputs.
- Container images signed; deploy pipeline verifies signatures.
- Policy gate blocking deploy when SBOM/provenance/signature missing.
- Break-glass documented process.
- Evidence: CI logs, signed image + verification proof, ADR (tools + threat model).
  **Acceptance Tests:**
- Unsigned build is blocked from deployment.
- Release artifacts expose SBOM + provenance.

## 3) Policy Fabric v1: OPA/ABAC Bundle + Decision Logging

**Problem:** Provide centralized, updatable authorization policy enforcement with auditability.
**Scope:** ABAC model, OPA bundle distribution, decision logging, SDK.
**Interfaces:** Policy bundle repo, SDK/library for services, decision log schema.
**Deliverables:**

- ABAC policies (role/resource/action/environment) with deny-by-default.
- Bundle distribution strategy (versioned, cached, fallback).
- Decision logs emitting structured events with trace IDs.
- Unit tests for policies.
- Reference SDK and sample service integration.
- ADR (policy model + rollout strategy) and sample audit logs.
  **Acceptance Tests:**
- Sample service enforces policies via SDK.
- Policy updates roll out via bundle refresh without service redeploy.

## 4) Data Governance: Classification Tags + Retention/Residency Enforcer

**Problem:** Enforce data classification, retention, and residency at runtime.
**Scope:** Data annotations, enforcement points, retention sweeper.
**Interfaces:** API/storage write paths, sweeper job, audit logs.
**Deliverables:**

- Tag schema: `classification`, `residency_region`, `retention_days`, `pii_fields` with examples.
- Enforcement middleware for API/storage write paths with tests.
- Residency guard blocking region violations.
- Retention sweeper (idempotent) with dry-run and audit trail.
- ADR describing enforcement placement.
  **Acceptance Tests:**
- Wrong-region write blocked and logged.
- Expired records deleted/archived with auditable evidence.

## 5) Observability Kit: Golden Dashboards + SLOs + Alert Pack

**Problem:** Provide a drop-in observability kit usable within an hour.
**Scope:** Metrics conventions, dashboards, SLO templates, alerting, trace/log correlation.
**Interfaces:** Metrics labels (service, tenant, route, status), dashboards, alert rules, synthetic probes.
**Deliverables:**

- Standard metrics naming/labels; instrumentation reference PR.
- Golden dashboards (latency, traffic, errors, saturation) and JSON exports.
- SLO templates (availability, latency) with error-budget burn alerts.
- Trace ID propagation ensuring logs/traces correlation.
- Runbook template with pager sections; synthetic probe for `/healthz` and key endpoint.
  **Acceptance Tests:**
- One service live with dashboards/SLOs; alerts test-fired successfully.
- Trace IDs appear end-to-end in logs/traces.

## 6) Release Reliability: Canary + Automated Rollback Controller

**Problem:** Safely roll out releases with automated rollback on SLO regressions.
**Scope:** Canary controller, health signals, auditability, manual override.
**Interfaces:** Rollout config, metrics hooks, audit logs.
**Deliverables:**

- Canary steps: 1% → 10% → 50% → 100% (configurable).
- Health signals: error rate, latency, saturation, custom hooks.
- Auto rollback with recorded reasons; manual override with audit event.
- Simulation test triggering rollback.
- ADR (rollout algorithm + safety boundaries) and debug runbook.
  **Acceptance Tests:**
- Forced regression in test env triggers automatic rollback.
- Rollback leaves audit trail and links to metrics snapshots.

## 7) IntelGraph Primitive: Provenance-First Ingest + Timeline View API

**Problem:** Provide ingestion pipeline with provenance and timeline querying.
**Scope:** Data model, ingest API with dedupe, timeline API with filters, auditing.
**Interfaces:** OpenAPI spec, migrations/schema versioning, provenance linkage.
**Deliverables:**

- Data model: entity, relationship, event, source, provenance record.
- Idempotent ingest API with dedupe strategy and schema versioning.
- Timeline API with filters (time range, entity ID, source, confidence).
- Auditability linking ingest operations to provenance.
- Migration scripts + schema version plan; load test + performance notes; ADR (model + indexing).
  **Acceptance Tests:**
- Double ingest does not duplicate facts (deterministic dedupe).
- Timeline query returns stable ordering with provenance per item.

## 8) “Evidence or It Didn’t Happen”: ADR + Release Notes + Compliance Pack Automation

**Problem:** Automate audit-ready evidence for every change and release.
**Scope:** ADR workflow enforcement, release notes automation, compliance pack generation, evidence archive.
**Interfaces:** CI checks, conventional commits, evidence storage, disclosure workflows.
**Deliverables:**

- ADR template + CI enforcement for targeted paths.
- Release notes automation from conventional commits with artifact list.
- Compliance pack generator (SBOM, licenses, policy bundle version, deploy attestations) stored immutably.
- Evidence archive with indexed metadata; documented disclosure process.
- ADR covering inclusions/exclusions.
  **Acceptance Tests:**
- Release tag produces complete disclosure pack automatically.
- CI fails with actionable messages when required evidence is missing.
