# CompanyOS 30-Day Pod Ticket Set

The following tickets are ready to paste into Jira/Linear. Each ticket follows the standard format: **Title**, **Type**, **Estimate (S/M/L)**, **Description**, **Dependencies**, **Acceptance Criteria**.

### Reference stack assumptions
- Source control: GitHub
- CI/CD: GitHub Actions
- Language baseline: TypeScript/Node.js for services and tooling
- Deployment: Kubernetes with Helm charts (canary capable)
- Security/Policy: OPA for authorization, Sigstore/Cosign for signing

### Copy/paste ticket template (YAML)
Use this if your tracker supports YAML intake; replace the `TODO` values with the details from each ticket below.

```yaml
title: TODO
type: TODO  # Story | Task | Spike
estimate: TODO  # S | M | L
description: |
  TODO
dependencies:
  - TODO
acceptance_criteria:
  - TODO
```

## 1) Golden Path Platform

### GP-1 — Define Standard Service Repo Layout
- **Type:** Story
- **Estimate:** M
- **Description:** Document and propose a standard folder and config layout for a new CompanyOS service (API-focused for v1). Include conventions for config, tests, infra, and docs.
- **Dependencies:** None
- **Acceptance Criteria:**
  - Markdown doc in `platform/standards` describing repo layout.
  - Reviewed and approved by at least 2 senior engineers.
  - Example skeleton tree included (code or pseudo).

### GP-2 — ADR: “Standard Service Template & CI Baseline v1”
- **Type:** Task
- **Estimate:** S
- **Description:** Create an ADR summarizing chosen repo layout, language/tooling assumptions, and CI baseline stages.
- **Dependencies:** GP-1
- **Acceptance Criteria:**
  - ADR merged in `docs/adr/ADR-xxx-service-template-v1.md`.
  - Includes tradeoffs and rejected options.
  - Linked from the platform README.

### GP-3 — Implement Reference Service Template (API)
- **Type:** Story
- **Estimate:** L
- **Description:** Create a new repo or directory with a minimal API service implementing the golden layout and wiring in CI hooks (even if stubs).
- **Dependencies:** GP-1, GP-2
- **Acceptance Criteria:**
  - `main` branch compiles and passes tests.
  - CI runs on pull request and on `main`.
  - Basic health-check endpoint available.

### GP-4 — CI Template with SBOM & Provenance
- **Type:** Story
- **Estimate:** M
- **Description:** Implement a reusable CI template (e.g., GitHub Actions workflow / GitLab template) including: build, tests, lint, SAST, secret scan, SBOM generation, and artifact publishing with build metadata.
- **Dependencies:** GP-3
- **Acceptance Criteria:**
  - Template reusable by other services via a single include.
  - SBOM artifact produced on every `main` build.
  - Build metadata (commit SHA, timestamp) attached to artifacts.

### GP-5 — Scaffold Command (`companyos scaffold service`)
- **Type:** Story
- **Estimate:** M
- **Description:** Implement a CLI or template command that generates a new service repo from the golden path (or prints instructions if not fully automated).
- **Dependencies:** GP-3, GP-4
- **Acceptance Criteria:**
  - Running the scaffold command creates a ready-to-build service skeleton.
  - Newly generated repo has working CI on first push.
  - Documented usage in platform README.

## 2) Identity & Policy

### IDP-1 — ADR: “CompanyOS Identity Model v1”
- **Type:** Task
- **Estimate:** M
- **Description:** Define identity types (user, service, tenant, env) and core attributes (role, groups, tenant_id, data_access_level). Capture assumptions and constraints.
- **Dependencies:** None
- **Acceptance Criteria:**
  - ADR merged with ERD or diagram.
  - At least one example JSON representation per identity type.
  - Reviewed by Security + Platform leads.

### IDP-2 — Define AuthZ Input & Decision Schema
- **Type:** Story
- **Estimate:** S
- **Description:** Define JSON schema for requests to the authorization engine (OPA) and responses (allow/deny, reason, obligation).
- **Dependencies:** IDP-1
- **Acceptance Criteria:**
  - JSON schema files in repo.
  - 3–5 example request/response pairs.
  - Schema referenced in OPA policy repo.

### IDP-3 — OPA Policy for “Read Customer Record”
- **Type:** Story
- **Estimate:** M
- **Description:** Implement an OPA policy that decides whether a given identity can read a specific customer record based on role, tenant, and attributes.
- **Dependencies:** IDP-2
- **Acceptance Criteria:**
  - Rego policy file committed.
  - Policy unit tests with passing cases (allow/deny).
  - Policy documented with examples.

### IDP-4 — Integrate OPA Check in Reference Service
- **Type:** Story
- **Estimate:** M
- **Description:** Wire the reference API service from Golden Path to call OPA for read operations on customer records. Deny-by-default.
- **Dependencies:** GP-3, IDP-3
- **Acceptance Criteria:**
  - Service fails requests when OPA denies or is unreachable (explicit error).
  - Structured decision logs emitted (who, resource, decision, reason).
  - Local dev environment can run with a local OPA instance.

### IDP-5 — Step-Up Auth Policy Spec
- **Type:** Task
- **Estimate:** S
- **Description:** Define which actions require step-up authentication and capture the rules in a policy document (even if implementation is stubbed).
- **Dependencies:** IDP-1
- **Acceptance Criteria:**
  - List of sensitive actions mapped to step-up requirements.
  - Policy doc linked to Identity ADR.
  - Agreement from Security on initial scope.

## 3) Observability

### OBS-1 — ADR: “Observability Baseline v1”
- **Type:** Task
- **Estimate:** M
- **Description:** Define required metrics, log fields, and tracing conventions for all services.
- **Dependencies:** None
- **Acceptance Criteria:**
  - ADR includes metric names, labels, and log schema.
  - Tracing conventions (span naming, required tags) documented.
  - Signed off by Reliability & Platform leads.

### OBS-2 — Implement Observability Middleware for Reference Service
- **Type:** Story
- **Estimate:** M
- **Description:** Add metrics, structured logging, and tracing middleware to the reference API service.
- **Dependencies:** OBS-1, GP-3
- **Acceptance Criteria:**
  - Service emits standard metrics and logs locally.
  - Traces visible in tracing backend (even if dev instance).
  - Docs updated: how to enable in another service.

### OBS-3 — Create Golden Grafana Dashboard Template
- **Type:** Story
- **Estimate:** M
- **Description:** Build a dashboard template that shows latency, error rate, traffic, and saturation for any service following the baseline.
- **Dependencies:** OBS-2
- **Acceptance Criteria:**
  - One dashboard template that can be cloned for any service.
  - Reference service wired to it and showing live data.
  - Snapshot or screenshot stored in docs.

### OBS-4 — Define SLO & Error Budget for Reference Service
- **Type:** Story
- **Estimate:** S
- **Description:** Define SLOs (e.g., p95 latency, availability) and compute error budgets for the reference service.
- **Dependencies:** OBS-3
- **Acceptance Criteria:**
  - SLO definition doc (targets, measurement windows).
  - Queries/recording rules created.
  - SLO panel added to the dashboard.

## 4) Data Spine

### DATA-1 — ADR: “Canonical Entity Schemas v1”
- **Type:** Task
- **Estimate:** M
- **Description:** Define canonical schemas for `Org`, `User`, and `Event`, with field types and IDs.
- **Dependencies:** None
- **Acceptance Criteria:**
  - ADR with schemas and rationale.
  - PII classification for each field.
  - Alignment with Identity model attributes.

### DATA-2 — Schema Repository Setup
- **Type:** Story
- **Estimate:** M
- **Description:** Create a dedicated location (repo or directory) for schemas (JSON Schema/Avro/Protobuf) with tooling for validation.
- **Dependencies:** DATA-1
- **Acceptance Criteria:**
  - Schemas stored under version control.
  - CI validating schema syntax on PR.
  - README describing how to use schemes.

### DATA-3 — Schema Versioning & Evolution Policy
- **Type:** Task
- **Estimate:** S
- **Description:** Document rules for schema evolution (backward/forward compatibility, deprecation process).
- **Dependencies:** DATA-2
- **Acceptance Criteria:**
  - Policy doc in schema repo.
  - Examples of breaking vs non-breaking changes.
  - Linked from ADR and referenced in contribution guidelines.

### DATA-4 — Lineage & Provenance Model v1
- **Type:** Story
- **Estimate:** M
- **Description:** Define minimal model for tracking data lineage and provenance for Events as they flow into Summit/IntelGraph.
- **Dependencies:** DATA-1
- **Acceptance Criteria:**
  - Model documented (fields like `source`, `transform`, `timestamp`, `actor`).
  - Example event with lineage metadata.
  - Summit/IntelGraph team reviews and accepts.

### DATA-5 — Residency & Retention Rules for User Data
- **Type:** Story
- **Estimate:** M
- **Description:** Define rules for data residency and retention for User entity; describe enforcement approach.
- **Dependencies:** DATA-1
- **Acceptance Criteria:**
  - Document mapping user data fields to residency regions and TTL behavior.
  - Example of delete/TTL flow.
  - Risk/Compliance signs off.

## 5) Reliability & Release

### REL-1 — ADR: “Standard Release Strategy v1”
- **Type:** Task
- **Estimate:** M
- **Description:** Document canary/rolling release strategy for K8s/Helm-based services, including when to use which.
- **Dependencies:** None
- **Acceptance Criteria:**
  - ADR with diagrams of rollout patterns.
  - Sensible defaults agreed with SRE/Platform.
  - Links to Helm/infra repos.

### REL-2 — Define Release Gates & Canary Thresholds
- **Type:** Story
- **Estimate:** M
- **Description:** Specify metrics and thresholds needed to progress/rollback a canary (error rate, latency, etc.).
- **Dependencies:** REL-1, OBS-1
- **Acceptance Criteria:**
  - Table of metrics and thresholds documented.
  - At least one query or alert configured to evaluate thresholds.
  - Reviewed by Observability lead.

### REL-3 — Implement Helm/Infra Template for Canary
- **Type:** Story
- **Estimate:** L
- **Description:** Add canary support to Helm chart or deployment templates used by the reference service.
- **Dependencies:** REL-2, GP-3
- **Acceptance Criteria:**
  - Reference service can be deployed in canary mode via config.
  - Canary and stable traffic split configurable.
  - Docs show how to enable/disable.

### REL-4 — Rollback Runbook for Reference Service
- **Type:** Task
- **Estimate:** S
- **Description:** Write a runbook that describes step-by-step how to rollback a bad release using the new canary setup.
- **Dependencies:** REL-3
- **Acceptance Criteria:**
  - Runbook stored under `runbooks/reliability`.
  - Includes “if X then Y” decision table.
  - Tested in one tabletop or dry run.

## 6) Developer Ergonomics

### DEVX-1 — ADR: “Local Dev Environment v1”
- **Type:** Task
- **Estimate:** S
- **Description:** Document goals and decisions for standard local dev environment (Docker Compose dev stack, auth approach, etc.).
- **Dependencies:** None
- **Acceptance Criteria:**
  - ADR merged with constraints & assumptions.
  - Lists services & infra components included in local stack.
  - Alignment with Golden Path service.

### DEVX-2 — Docker Compose Stack for Reference Service
- **Type:** Story
- **Estimate:** M
- **Description:** Create a Docker Compose (or equivalent) configuration that brings up the reference service and dependencies for local dev.
- **Dependencies:** DEVX-1, GP-3
- **Acceptance Criteria:**
  - `docker compose up` starts service + DB + any deps.
  - App reachable on local port with health endpoint working.
  - Docs include environment variables and basic troubleshooting.

### DEVX-3 — Seed Data & Fixtures
- **Type:** Story
- **Estimate:** S
- **Description:** Implement seed data scripts/fixtures to allow meaningful local testing without manual DB setup.
- **Dependencies:** DEVX-2, DATA-1
- **Acceptance Criteria:**
  - Single command seeds DB with test data.
  - Reference service UI/API behaves realistically using seeded data.
  - Seed script idempotent.

### DEVX-4 — Standard Test Commands & Pre-Commit Hooks
- **Type:** Story
- **Estimate:** M
- **Description:** Define and implement standard commands (`make test-unit`, `make test-integration`, etc.) plus pre-commit hooks for linting/tests where appropriate.
- **Dependencies:** GP-3
- **Acceptance Criteria:**
  - Makefile or scripts with documented usage.
  - Pre-commit hooks optionally enabled but documented.
  - At least unit tests executed locally via single command.

### DEVX-5 — New Engineer Quickstart Guide
- **Type:** Task
- **Estimate:** S
- **Description:** Write a step-by-step guide: clone repo → start dev stack → run tests in ≤15 minutes.
- **Dependencies:** DEVX-2, DEVX-4
- **Acceptance Criteria:**
  - Markdown doc in repo, linked from README.
  - At least one new engineer runs it and records time (< 15 minutes) or logs issues.
  - Feedback incorporated into final version.

## 7) Product Verticals (Compliance Ops Example)

### PROD-1 — ADR: “Compliance Ops Vertical Definition v1”
- **Type:** Task
- **Estimate:** M
- **Description:** Define the Compliance Ops vertical: personas, JTBD, constraints, and high-level boundaries.
- **Dependencies:** None
- **Acceptance Criteria:**
  - Persona description (e.g., Compliance Lead) documented.
  - 3–5 core JTBD listed with pain points.
  - Aligned with leadership/PM expectations.

### PROD-2 — Identify & Rank 3–5 Candidate Capabilities
- **Type:** Story
- **Estimate:** S
- **Description:** Brainstorm and prioritize candidate capabilities (e.g., automated disclosure packs, evidence repository).
- **Dependencies:** PROD-1
- **Acceptance Criteria:**
  - List of capabilities with rough impact vs. effort scoring.
  - One top candidate selected and justified.

### PROD-3 — Detailed Spec: “Automated Disclosure Pack v1” (example)
- **Type:** Story
- **Estimate:** L
- **Description:** Produce a full feature spec for the top capability: problem, ROI, data touchpoints, policy implications, dependencies, user flow.
- **Dependencies:** PROD-2, RISK-1, DATA-1, IDP-1
- **Acceptance Criteria:**
  - Spec includes DoR and DoD.
  - Data classification and compliance constraints called out.
  - User journey and 2–3 main flows sketched.

### PROD-4 — Telemetry & Success Metrics Definition
- **Type:** Story
- **Estimate:** S
- **Description:** Define the analytics events and product metrics for the first capability (engagement, time-to-value, completion rate, etc.).
- **Dependencies:** PROD-3, OBS-1
- **Acceptance Criteria:**
  - Event schema documented (names, properties).
  - At least 3 product success metrics defined.
  - Telemetry requirements added to feature’s DoD.

## 8) Risk & Compliance Automation

### RISK-1 — ADR: “SBOM & Signing Strategy v1”
- **Type:** Task
- **Estimate:** M
- **Description:** Decide on tools and process for generating SBOMs and signing artifacts for CompanyOS services.
- **Dependencies:** None
- **Acceptance Criteria:**
  - ADR documenting tool choice and rationale.
  - Description of where SBOMs and signatures will be stored.
  - Alignment with Security & Platform.

### RISK-2 — Add SBOM Generation to Reference Service CI
- **Type:** Story
- **Estimate:** M
- **Description:** Implement SBOM generation step for reference service’s CI pipeline and publish artifact to artifact store.
- **Dependencies:** RISK-1, GP-4
- **Acceptance Criteria:**
  - Successful CI builds include SBOM artifact.
  - SBOM is downloadable from CI logs/artifacts.
  - Failure modes documented if SBOM generation fails.

### RISK-3 — Implement Artifact Signing in CI
- **Type:** Story
- **Estimate:** M
- **Description:** Add signing step to the CI of reference service (e.g., sign container image) and verify signature in deploy pipeline.
- **Dependencies:** RISK-1, RISK-2
- **Acceptance Criteria:**
  - Build artifacts are signed.
  - Deployment pipeline verifies signature before rollout.
  - Build fails if signing or verification fails.

### RISK-4 — Vulnerability Scan & Gating Policy
- **Type:** Story
- **Estimate:** M
- **Description:** Integrate vulnerability scanning in CI and define gating rules for critical/high CVEs.
- **Dependencies:** RISK-2
- **Acceptance Criteria:**
  - Vulnerability scan runs on CI for reference service.
  - Builds with critical/high CVEs above threshold fail.
  - Policy documented and linked in ADR.

### RISK-5 — Disclosure Pack v0 Template
- **Type:** Task
- **Estimate:** S
- **Description:** Create a structured template for disclosure packs including SBOM link, signing status, test results, and vuln scan summary.
- **Dependencies:** RISK-2, RISK-3, RISK-4
- **Acceptance Criteria:**
  - Template document created (JSON/Markdown).
  - Populated example for reference build.
  - Used in at least one mock “customer request” scenario.
