# Post-Deploy Validation Report — IntelGraph GA

Release: v1.0.0  
Environment: prod|stage  
Date/Time (UTC): ____  
Author: ____  

## 1) Summary
- Outcome: success|partial|rollback
- Canary ramp: 1% → 5% → 25% → 50% → 100%
- Notable events: ____

## 2) SLO & Error Budget
- Read p95 (ms): ____  Target: ≤ 350  Evidence: dashboards/slo/api.json
- Write p95 (ms): ____ Target: ≤ 700  Evidence: dashboards/slo/api.json
- Availability (%): ____ Target: ≥ 99.9  Evidence: dashboards/slo/api.json
- Burn alerts: none|warn|crit  Evidence: alertmanager logs

## 3) Security & Policy
- WebAuthn success ≥ 99.5% in ≤2 tries: yes|no  Evidence: dashboards/auth/webauthn.json
- Policy reasoner default‑deny enforced: yes|no  Evidence: evidence/opa/decision-logs/
- Policy simulation diffs: none|link  Evidence: conftest output

## 4) Provenance & Supply Chain
- SLSA verify-bundle: pass|fail  Evidence: evidence/provenance/verify-bundle.log
- SBOM scan (High/Critical): 0|n  Evidence: evidence/sbom/scan-report.sarif

## 5) Data & ER
- ER lag (p95): ____ s (Target: <60s)  Evidence: dashboards/slo/ingest.json
- DLQ rate: ____ % (Target: <0.1%)  Evidence: evidence/dr/failover-report.md

## 6) Cache & PQ
- PQ cache hit-rate: ____ % (Target: ≥85%) Evidence: dashboards/cache.json
- Response cache hit-rate: ____ % (Target: ≥80%) Evidence: dashboards/cache.json

## 7) Neo4j
- 1‑hop p95: ____ ms (Target: ≤300ms) Evidence: artifacts/neo4j/1hop-profiles/
- 2–3 hop p95: ____ ms (Target: ≤1200ms) Evidence: artifacts/neo4j/3hop-profiles/

## 8) Cost Guardrails
- Spend rate vs forecast: ____ x (Target ≤ 1.3x) Evidence: dashboards/cost/burn-forecast.json
- Sampling floor: not sustained >15m | sustained [range] Evidence: metrics

## 9) Incidents & Actions
- Incidents: none|SEV‑3|SEV‑2|SEV‑1 (links)
- Follow‑ups: owner → action → ETA

## 10) Decision & Next Steps
- Go to next ramp? yes|no (why)
- Rollback? no|partial (scope)
- Notes: ____
