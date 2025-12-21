# R2 Phishing Cluster Investigation

## Purpose
Detect and cluster phishing infrastructure using connectors, graph analytics, and explainable overlays.

## Inputs
- Email headers and URLs from mail connector.
- DNS/WHOIS records, TLS cert metadata, passive DNS feeds.
- Hypothesis tag for campaign linkage.

## Steps
1. Ingest headers and URLs; ensure connectors stamp transform hashes and source labels.
2. Run NL→Cypher preview to identify hosting clusters; sandbox and verify syntax before execution.
3. Use tri-pane to correlate hosting geography (map) and timeline of registrations; check GraphRAG rationales.
4. Apply policy-by-default export gating; generate selective disclosure bundle for partner-ready report.

## KPIs
- Cluster detection accuracy ≥90% against demo fixtures.
- p95 query latency <1.5s across steps.
- 100% exports include provenance manifests and license decision.

## Failure Modes
- Over-broad selectors: adjust NL prompt scope; verify OPA justification logs.
- Freshness gaps: rerun connector health checks; consult SLO dashboard.
- Export block: attach authority proof and rerun after appeal approval.

## XAI Notes
- Capture rationale path and citations for each cluster; include explain overlay screenshot in report.
