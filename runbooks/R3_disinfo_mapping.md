# R3 Disinformation Mapping

## Purpose
Map coordinated disinformation networks and trace content propagation with provenance and explainability.

## Inputs
- Social posts, URLs, and media hashes from connectors (social API, web crawler, media hash DB).
- Hypothesis: campaign narrative or actor.
- Policy context: jurisdiction and license boundaries.

## Steps
1. Ingest posts and media; verify manifests include source and transform chain; quarantine low-trust feeds.
2. Run NL→Cypher to generate graph of accounts, channels, and narratives; review preview before execution.
3. Use tri-pane to visualize spread over timeline; enable "Explain this view" to see narrative linkage rationale.
4. Export selective disclosure bundle for partners with manifest and licensing decisions; attach ledger reference.

## KPIs
- Narrative clustering precision ≥0.9 on demo set.
- Graph query p95 <1.5s; overlay render <500ms.
- 100% exports provide manifest and license rationale.

## Failure Modes
- Prompt-injection attempts: use hardened copilot mode; verify audit.
- Policy deny due to jurisdiction: request scoped waiver via appeal workflow.
- Missing provenance: block export and regenerate transforms.

## XAI Notes
- Record rationale paths and citation counts; ensure explanations are human-readable and include path scores.
