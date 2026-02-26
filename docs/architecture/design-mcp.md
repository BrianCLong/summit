# Governed Design Artifact Ingestion Pipeline

## Purpose

Summit treats design-to-code integration as a governed ingestion problem, not an unbounded UI generation feature. The pipeline ingests Design MCP outputs, enforces deterministic artifacts, and gates all writes through policy checks.

## Scope

- In scope:
  - Design MCP adapter integration (`src/agents/design/design-mcp-adapter.ts`)
  - Deterministic artifact importer (`src/agents/design/artifact-importer.ts`)
  - Plan-first implementation gating (`src/agents/design/implementation-planner.ts`)
  - CI enforcement (`scripts/ci/verify_design_artifact.mjs`, `.github/workflows/ci-design.yml`)
- Out of scope:
  - Full frontend stack replacement
  - Visual editing product surface
  - Non-governed direct writes outside artifact root

## Artifact Contract

All generated/imported outputs are constrained to:

- `artifacts/ui-design/<design-id>/design.json`
- `artifacts/ui-design/<design-id>/screens.json`
- `artifacts/ui-design/<design-id>/html/*`
- `artifacts/ui-design/<design-id>/css/*`
- `artifacts/ui-design/<design-id>/report.json`
- `artifacts/ui-design/<design-id>/metrics.json`
- `artifacts/ui-design/<design-id>/stamp.json`

Deterministic artifacts (`report.json`, `metrics.json`, `stamp.json`) must not include timestamp-like keys.

## Evidence Contract

- Evidence ID format: `SUMMIT-DESIGN-<YYYYMM>-<HASH12>`
- `report.json`, `metrics.json`, and `stamp.json` must carry the same `evidence_id`.
- `report.json.written_paths` must remain inside the design artifact root.

## Feature Flag

- Flag: `design-mcp-enabled`
- Default: `false`
- Rollout: additive and opt-in only

## MAESTRO Security Alignment

- MAESTRO Layers: Foundation, Agents, Tools, Observability, Security
- Threats Considered:
  - Prompt-to-HTML script injection
  - Path traversal and unauthorized file writes
  - Evidence tampering via nondeterministic fields
  - Secret leakage in logs/config
- Mitigations:
  - HTML sanitization during import
  - Deny-by-default filename/path validation
  - CI verifier for deterministic artifacts and evidence ID consistency
  - API key retrieval from environment only with no prompt/body logging
