# Federated Campaign Radar Implementation Prompt

You are implementing the Federated Campaign Radar (FCR) capability across server services,
policies, schemas, documentation, and operational artifacts. All work must comply with
Summit governance, policy-as-code requirements, and evidence logging.

## Objectives

- Implement schema definitions and validators for FCR signal ingestion and clustering.
- Add core services for privacy budgets, credential-aware scoring, clustering, early-warning,
  and response pack generation.
- Provide an API router for ingest, cluster, and alert retrieval.
- Add policy-as-code artifacts for sharing constraints, privacy budgets, and alert thresholds.
- Update FCR documentation with architecture, API, operations, and runbooks.
- Update roadmap status to reflect delivery readiness.
- Produce agent task spec and execution artifact.

## Constraints

- No raw tenant content leaves the tenant boundary.
- Differential privacy budgets are enforced and auditable.
- C2PA assertions and signer reputation inform confidence propagation.
- All compliance-related logic must be represented as policy-as-code.
- Avoid try/catch blocks around imports.

## Declared Scope

Paths:

- docs/federated-campaign-radar\*.md
- docs/runbooks/federated-campaign-radar\*.md
- docs/roadmap/STATUS.json
- schemas/fcr/\*\*
- server/src/services/fcr/\*\*
- server/src/routes/federated-campaign-radar.ts
- server/src/app.ts
- server/policies/fcr\*.rego
- server/src/provenance/fcr-\*.ts
- fixtures/fcr-sample.json
- openapi/spec.yaml
- agents/examples/\*\*
- artifacts/agent-runs/\*\*
- prompts/federated-campaign-radar-implementation.md
- prompts/registry.yaml

Domains:

- federation
- privacy
- governance
- provenance
- observability
- api

## Allowed Operations

- create
- edit
