# R1 Rapid Attribution

## Purpose
Identify responsible actor for emergent incident using tri-pane UI and provenance-backed evidence.

## Inputs
- Ingested indicators (domains, IPs, file hashes) from ≥3 connectors.
- Hypothesis ID and justification text.
- Access scope and warrant/authority binding.

## Steps
1. Load incident workspace and run NL→Cypher preview to fetch related entities; validate syntax and scope.
2. Use tri-pane to cross-check graph/map/timeline; activate "Explain this view" for rationale paths.
3. Pin top 3 rationale paths with citations; export provisional report with manifest bundle.
4. Run authority compiler appeal if blocked; document decision in audit notes.

## KPIs
- Time to first rationale path <10 minutes.
- p95 query latency <1.5s during session.
- 100% exported artifacts include manifests and authority decision.

## Failure Modes
- Connector lag: switch to offline kit; flag freshness KPI.
- Policy deny: use appeal flow with justification; retry after approval.
- Model hallucination: cross-validate rationale with ledger evidence.

## XAI Notes
- Capture rationale screenshots and citations for demo; log GraphRAG path scores.
