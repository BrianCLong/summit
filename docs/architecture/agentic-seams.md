# Agentic Seams (Jules ↔ Gemini CLI ↔ Antigravity ↔ Codex)

**Status:** Post-GA documentation lane (Architecture Lab)
**Scope:** Agent interactions, artifact handoffs, and evidence routing.

## 1) Interaction Map (Artifact Flow)

```mermaid
flowchart TD
  Jules[Jules (Release Captain)] -->|Release gates + architecture decisions| GovDocs[Governance Docs]
  Gemini[Gemini CLI] -->|CI/test workflows + failure routing| CIArtifacts[CI Artifacts]
  Antigravity[Antigravity] -->|Evidence + decision records| Evidence[Evidence Bundles]
  Codex[Codex] -->|Docs + PR explainers + status reporting| OpsDocs[Ops/Architecture Docs]

  GovDocs --> Telemetry[Agent Telemetry Board]
  CIArtifacts --> Telemetry
  Evidence --> Telemetry
  OpsDocs --> Telemetry
```

## 2) Seam Contracts

### A) Jules → Governance & Release Gates

- Contract: publish gate outcomes, ownership, and release decision deltas.
- Output path: governance + readiness artifacts.

### B) Gemini CLI → CI/Test Signal

- Contract: publish failing-check clusters, owners, and rerun guidance.
- Output path: CI artifacts + command center summaries.

### C) Antigravity → Evidence & Decision Layer

- Contract: publish rationale, confidence, rollback triggers, and accountability windows.
- Output path: evidence bundles + decision/ledger artifacts.

### D) Codex → Control Room & Architecture Docs

- Contract: publish evidence-first daily status, telemetry board, and PR explainers.
- Output path: `docs/ops/` and `docs/architecture/`.

## 3) Handoff Rules

1. Publish evidence bundle first.
2. Publish reasoning summary second.
3. Attach owner and due date for each blocker.
4. Escalate release-critical drift immediately.

## 4) Threats & Mitigations

- **Threat:** Prompt injection against reporting channels.
  **Mitigation:** Require source-linked evidence and explicit owner attribution.
- **Threat:** Tool abuse causing silent evidence omission.
  **Mitigation:** Cross-check telemetry board against expected artifact paths.
- **Threat:** Ambiguous ownership causing delayed closure.
  **Mitigation:** Enforce owner + SLA fields in every action list.

## 5) Operating Guardrails

- No policy bypasses in agent workflows.
- Architecture Lab remains docs-only during GA stabilization.
- Default classification is post-GA unless `GA-support` is explicitly declared.
