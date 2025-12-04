# Summit Reference App Blueprints

This document defines the flagship blueprint templates shipped with the Summit Developer SDK v0.1. Each blueprint is graph-native, policy-aware, and telemetry-first.

## 1. Enterprise Doc & Graph Copilot
- **Purpose**: Answer questions over internal documents and knowledge graphs with provenance.
- **Key Components**:
  - RAG pipeline with hybrid search and graph neighborhood expansion.
  - Policy guardrails for tenant/jurisdiction and sensitivity tiers.
  - Provenance reporter that surfaces passages, graph edges, and policy decisions.
  - Optional alignment reviewer node for high-risk responses.
- **Flow Shape**:
  1. Ingest query → detect tenant/region.
  2. Retrieve documents (text + graph edges) → build `RAGContext`.
  3. Run model with tools (provenance inspector, citation formatter).
  4. Apply policy checks (PII, jurisdiction, safety) → block/allow.
  5. Emit answer + evidence bundle + trace ID.
- **Telemetry**: Trace spans for retrieval, policy decisions, and tool calls; provenance embedded in response payload.

## 2. Tool-Native Operations Agent
- **Purpose**: Execute operational runbooks with pre-flight safety checks.
- **Key Components**:
  - Tool registry with typed schemas and allowlist/denylist per policy.
  - Safety checker node gating write operations.
  - Runtime DAG executor with rollback hooks.
  - Post-run observability sink for SRE.
- **Flow Shape**:
  1. User request parsed → select runbook graph.
  2. Retrieve latest state (metrics/logs) via tools.
  3. Propose plan → run safety policy (change window, blast radius).
  4. Execute tools with idempotency and retries.
  5. Summarize, record trace, and emit audit log.
- **Telemetry**: Every tool span tagged with runbook ID, tenant, and risk level; safety outcomes logged to governance ledger.

## 3. Developer Console Assistant
- **Purpose**: Answer questions over code, CI/CD logs, configs, and optionally generate patches.
- **Key Components**:
  - Code-aware RAG with repo embeddings + build/log indexes.
  - Tooling for diff/patch generation and PR stubs.
  - Alignment rules to avoid unsafe suggestions (secrets, license issues).
  - Optional human-in-loop confirmation step.
- **Flow Shape**:
  1. Query classification (code vs ops vs policy).
  2. Retrieve code+logs context.
  3. Model generates answer or patch proposal.
  4. Policy/align checks (secret leak, license, regulated content).
  5. Optional PR draft tool call; emit trace and evidence bundle.
- **Telemetry**: Diff proposals include deterministic fingerprints; traces route to DX dashboard.

## Template Deliverables
Each blueprint template includes:
- `README.md`: scenario overview, architecture diagram (ASCII/mermaid), policy model, and setup steps.
- `flow.json` (graph manifest) and `flow.py` stub using `summit_sdk` primitives.
- `config/policy.yaml`: default tenant/jurisdiction settings.
- `config/telemetry.yaml`: trace sampling and sinks.
- `scripts/demo.sh`: minimal scripted demo.

## CLI Hooks
- `summit app init <blueprint>` scaffolds the template into a workspace.
- `summit app run <blueprint>` executes the reference flow locally with mock transports.

## Extensibility
- Blueprints are composable graphs; developers can swap nodes (retrievers, tools, policy evaluators) while keeping contract-stable interfaces.
- Governance adapters allow enterprises to plug custom policy engines without changing flow code.

