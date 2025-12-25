# ADR-0001: Establish Data Spine Governance Toolkit

## Status

Accepted

## Context

The platform lacked a unified way to manage JSON/Avro data contracts, enforce residency requirements, and capture lineage across ingestion and egress flows. Manual schema drift, inconsistent PII handling in lower environments, and missing provenance made audit preparation expensive.

## Decision

We introduced the Data Spine toolkit housed in `services/data-spine` with the following pillars:

- **Git-backed schema registry** – Schemas live under `contracts/<name>/<semver>` and are governed by a CLI (`data-spine`) that supports `init`, `validate`, `bump`, and `compat` operations. Semantic versioning is enforced and compatibility checks fail the build on breaking changes.
- **Embedded policy metadata** – Contracts carry `x-data-spine` annotations declaring classification tags, residency boundaries, deterministic reversible transformations, and per-field redaction/tokenization rules.
- **Residency & PII enforcement hooks** – Runtime helpers (`applyPolicies`, `enforceResidency`) guarantee no raw PII lands in lower environments and reject out-of-region writes, while reversible tokenization maintains deterministic pipelines.
- **Lineage sink** – A lightweight event-bus consumer materializes lineage graphs with complete who/what/when/where/why context and tracks drop rate to keep losses under 1%.
- **Residency audits** – `data-spine audit residency` emits machine-readable compliance reports for audit evidence.

## Consequences

- Engineers can self-serve schema updates while CI blocks breaking mutations.
- Compliance and security teams gain traceability over PII handling and residency posture.
- Additional connectors can push lineage events to the sink without bespoke plumbing.
- Future enhancements may integrate with external catalogues, but the CLI abstractions keep migrations deterministic and reversible by design.
