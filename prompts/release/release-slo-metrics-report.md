# Release SLO Metrics & Weekly Report Prompt (v1)

## Purpose

Define measurable Release SLOs, extract deterministic metrics from release dashboard artifacts and workflow metadata, and publish a weekly trend report that is safe to share internally.

## Scope

- Docs: Release SLO spec and supporting schema/config.
- Schemas: release SLO config and release metrics data model.
- Scripts: metrics extraction, redaction, report generation, charts.
- Workflows: weekly report artifact generation.
- Governance: update roadmap status and agent task spec.

## Non-Negotiable Requirements

- Deterministic pipeline, traceable to artifact hashes and workflow run IDs.
- Redaction/denylist enforcement that fails closed.
- Output artifacts free of secrets and internal URLs.
- Weekly report in Markdown + JSON with clear regressions.
- Unit tests for schema validation, redaction, and computations.

## Guardrails

- Use conventional commits and adhere to repository governance.
- Use policy-aligned definitions and single sources of truth.
- Align with docs/SUMMIT_READINESS_ASSERTION.md and governance standards.
