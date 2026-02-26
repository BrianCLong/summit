# UnityShield Subsumption Claims

## 1. Ingestion Latency & Throughput
- **Requirement**: Ingest 14TB/hour with <40ms latency (FR1.3).
- **Claim**: Summit's `intelgraph-kafka-consumer` and optimized ingestion layer can handle tiered scaling to match this throughput when deployed on multi-region GovCloud.
- **Verification**: Load test evidence in `tests/load/k6/unityshield_ingestion.js`.

## 2. Advanced Analytics (NLP & Anomaly Detection)
- **Requirement**: Support NLP and anomaly detection (FR2.2).
- **Claim**: Summit `src/graphrag` and `src/agents` (sensing agents) provide native NLP enrichment and Neo4j-based anomaly detection.
- **Verification**: Unit tests in `src/agents/__tests__/anomaly_detector.test.ts`.

## 3. High Availability
- **Requirement**: 99.999% availability (FR3.4).
- **Claim**: Summit's multi-region deployment blueprints (AWS GovCloud) and health-check driven failovers support high-availability targets.
- **Verification**: Chaos engineering results in `artifacts/chaos/unityshield_failover.json`.

## 4. Access Control (RBAC + MFA)
- **Requirement**: RBAC with MFA (FR5.1).
- **Claim**: Summit `src/auth` unified auth middleware implements OPA-governed RBAC; MFA is handled via OIDC integration (Okta).
- **Verification**: OPA policy audit in `policy/opa/authz_test.rego`.
