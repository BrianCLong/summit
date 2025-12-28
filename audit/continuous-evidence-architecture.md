# Continuous Evidence Architecture

## Domains

- **Product & Claims**: GA claims, demo/exposure enforcement, experimental isolation, golden-path contracts.
- **Governance & Decisions**: graduation approvals, risk acceptances, narrative approvals, exceptions.
- **Delivery & Change**: PR gating, CI results, release artifacts and hashes.
- **Security & Access**: role/privilege changes, audit logs, incident command activations.
- **Reliability & Operations**: SLOs, error budgets, postmortems, rollback actions.

## Pipelines

- **CI/CD**: `scripts/ops/generate-evidence-catalog.ts` and OPA drift checks run in `ci-hard-gates.yml`.
- **Governance workflows**: evidence sources mapped in `audit/evidence-taxonomy.json`.
- **Operations**: evidence sources include `ops/`, `slo/`, and incident/postmortem artifacts.

## Storage & Versioning

- **Catalog**: `audit/evidence-catalog.json` (versioned, hashed references).
- **Schema**: `schemas/evidence-record.schema.json`, `schemas/evidence-catalog.schema.json`.
- **Evidence artifacts**: `audit/ga-evidence/`, `evidence/`, `evidence-bundles/`.

## Access Boundaries

- **Auditor-safe**: catalog and artifacts marked `access=auditor`.
- **Internal**: sensitive artifacts marked `access=internal`, with explicit redaction rules.

## Retention & Redaction

Retention and redaction policies are encoded per control in `audit/evidence-taxonomy.json` and enforced via policy checks.
