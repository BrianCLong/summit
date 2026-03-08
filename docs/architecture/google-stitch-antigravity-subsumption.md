# Governed Design Artifact Ingestion Pipeline

## Source and Intent

This document operationalizes the external pattern "Great-looking UIs with Google Stitch and Google Antigravity" into Summit as a governed, deterministic, and policy-enforced subsystem.

- Source type: technical blog post (Google Cloud Community / Medium)
- Summit positioning: governance-hardened design-to-code ingestion, not full design platform parity
- Scope: documentation-only architecture blueprint for phased implementation

## Ground Truth Claims

- Stitch can transform natural-language prompts into multi-screen UI designs.
- Stitch supports annotation/editing and exports HTML/CSS artifacts.
- Antigravity acts as an agentic implementation surface.
- Stitch can be integrated through MCP configuration.
- API key configuration is required.
- Agentic workflow is plan-first before implementation.
- Generated HTML/CSS can be imported into a workspace.
- Redesign flow may alter frontend stack composition.

## Summit Subsumption Outcome

Summit adopts these capabilities as a **Governed Design Artifact Ingestion Pipeline**:

1. Design MCP adapter for generation and retrieval.
2. Deterministic artifact import with schema validation.
3. Plan-first implementation agent with human gating.
4. Feature-flagged generated workspace isolation.
5. CI guardrails for determinism, evidence IDs, and write constraints.

## Repository Assumptions and Verification Gate

Assumed paths (must be validated before implementation PR1):

- `src/agents/`
- `src/connectors/`
- `src/graphrag/`
- `.github/workflows/`
- `.github/scripts/`
- `docs/architecture/`
- `docs/security/`

Preflight validation checklist:

- Confirm `pnpm` workspace layout.
- Confirm test harness (`vitest`/`jest`) per package.
- Confirm CI check names and required status contexts.
- Confirm evidence ID schema used by existing governance artifacts.

## Minimal Winning Slice (MWS)

Summit can integrate a Design MCP server that generates UI artifacts and deterministically imports them into a feature-flagged frontend workspace with CI validation.

### MWS Acceptance Criteria

1. Prompt returns multi-screen layout JSON through Design MCP.
2. Artifacts persist to `artifacts/ui-design/<design-id>/`.
3. HTML/CSS import passes schema and safety validation.
4. `report.json`, `metrics.json`, and `stamp.json` are deterministic.
5. CI blocks merge when outputs are non-deterministic, evidence IDs are missing, or writes violate allowlists.

Feature flag default: `design_mcp_enabled=false`.

## Proposed Module Additions

```text
src/
  agents/design/
    design-mcp-adapter.ts
    artifact-importer.ts
    implementation-planner.ts
  frontend/
    adapters/
    generated/
```

### Deterministic Artifact Contract

```text
artifacts/ui-design/<design-id>/
  design.json
  screens.json
  html/
  css/
  report.json
  metrics.json
  stamp.json
```

Determinism rules:

- `stamp.json` excludes wall-clock timestamps.
- Evidence ID format: `SUMMIT-DESIGN-<YYYYMM>-<HASH>`.
- Hash source must be normalized canonical payload only.

## Planned PR Stack

1. **feat(design): add Design MCP adapter**
   - API-key-gated adapter and unit tests.
   - Feature flag wiring.
2. **feat(design): artifact importer + schema validation**
   - Deny-by-default write paths.
   - Deterministic stamp generation.
3. **feat(design): implementation planner agent**
   - Produces `implementation-plan.md`.
   - Requires explicit human approval token to execute.
4. **feat(frontend): generated UI workspace**
   - Isolated generated frontend path.
   - Optional stack migration evaluator (no global rewrite).
5. **ci(design): add design guardrail workflow**
   - Determinism/evidence/path/dependency checks.
6. **docs(design): architecture + threat model**
   - Hardening and runbook completion.

## MAESTRO Alignment

- **MAESTRO Layers**: Agents, Tools, Data, Infra, Observability, Security.
- **Threats Considered**:
  - Prompt injection through design prompts
  - Malicious HTML/CSS payload import
  - Tool abuse/path traversal during artifact writes
  - Secret leakage via logs/errors
  - Non-deterministic artifact stamping
- **Mitigations**:
  - Prompt handling constraints and sanitization boundaries
  - HTML/CSS sanitization and schema-based validation
  - Path allowlist + deny-by-default filesystem policy
  - Secret redaction + no raw key logging
  - Canonical serialization + reproducible hash stamping

## Threat-Informed Guardrails

| Threat                   | Mitigation                    | CI Gate                     | Test Fixture       |
| ------------------------ | ----------------------------- | --------------------------- | ------------------ |
| Malicious HTML injection | Sanitization + script removal | `ci-design-artifact-verify` | script-tag fixture |
| API key leakage          | Redaction/no secret logging   | secret scan gate            | redaction test     |
| Path traversal           | Allowlisted writes only       | path validator              | traversal fixture  |
| Non-determinism          | Canonical hash stamp          | determinism gate            | dual-run diff      |

## Performance and Cost Budgets

- Design generation latency: `<5s`
- Artifact import latency: `<2s`
- Incremental memory overhead: `<200MB`
- CI guardrail runtime: `<3 minutes`

Proposed profiling harness: `scripts/profiling/design-profile.ts` producing `metrics.json`.

## Data Handling Constraints

Classification: Internal development artifact.

Never log:

- API keys
- Raw design prompts
- Unsanitized generated HTML

Retention:

- Artifacts are merged only via approved PR pathways.

## Operational Readiness

Runbook target: `docs/ops/runbooks/design-mcp.md` with:

- API key rotation procedure
- Artifact corruption recovery steps
- CI remediation playbook
- Rollback via feature flag

Service objective:

- 99% CI artifact validation success rate.

## Scope Guardrails

- No GraphRAG pipeline changes.
- No global frontend rewrite.
- Generated code isolation required.
- Feature flag remains OFF by default.
- Maximum six implementation PRs.

## Decision

Summit will implement this as a governance-first ingestion pipeline with deterministic evidence outputs and enforceable CI policy gates.
