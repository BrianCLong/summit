# ADR-043: Customer-Facing Release Evidence Pack

**Status:** Proposed  
**Date:** 2026-02-24  
**Author:** Codex  
**Deciders:** Product Ops, Security Engineering, Platform Engineering

## Context

Enterprise customers require verifiable release trust artifacts at time of adoption and during audits. Existing evidence assets are distributed across internal release documents and pipeline artifacts. Sprint 12 requires trust output to become a customer-visible product capability.

## Decision

Establish a signed Release Evidence Pack as a first-class release artifact and expose it from Admin UI via "Download Evidence Pack".

The pack must include:

- SBOM summary and artifact references.
- Signature verification result for release images/artifacts.
- CVE summary against policy budget (including waiver status if applicable).
- Data residency assertion.
- PII classification summary.
- Audit event snapshot.

Delivery contract:

- Output formats: machine-readable JSON and human-readable PDF.
- Packaging path: `/releases/v12/` for Sprint 12 sample and structure baseline.
- Pack is signed and timestamped at release cut.
- Verification instructions included for customer validation workflows.

## MAESTRO Layers

- Data: residency and PII attestations.
- Agents: product ops and security evidence ownership handoff.
- Tools: signature verification and evidence packaging scripts.
- Observability: release-time trust metrics and export success tracking.
- Security: signed pack and cryptographic verification chain.

## Threats Considered

- Customer cannot verify authenticity of published release evidence.
- Evidence tampering between generation and download.
- Inconsistent compliance claims across teams and services.
- Missing data-classification metadata undermining contractual trust claims.

## Mitigations

- Cosign-signed evidence pack with verification result included.
- Immutable pack manifest with hash ledger references.
- Single schema-driven pack generator for deterministic output.
- Policy-gated inclusion checks for residency and PII sections.

## Consequences

- Positive:
  - Trust becomes a customer-visible feature and procurement accelerant.
  - Internal evidence collection aligns to a single output contract.
  - Reduces audit friction by shipping pre-validated bundle content.

- Negative:
  - Additional cross-team coordination required between security, product ops, and frontend.
  - PDF rendering and localization can add maintenance overhead.

- Risks:
  - If evidence source systems drift, pack generation may fail at release cut.
  - Overly broad pack content can expose internal-only operational details.

## Alternatives Considered

- Option A: Keep evidence internal-only and provide ad hoc exports on request.
  - Rejected: high latency and inconsistent customer trust experience.

- Option B: Provide only human-readable PDF.
  - Rejected: blocks automation and machine validation by enterprise customers.

- Option C: Provide unsigned evidence content.
  - Rejected: fails cryptographic trust objective.
