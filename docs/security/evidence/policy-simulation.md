# Policy Simulation Evidence

- **Report artifact**: `policy-simulation-report.json` (produced by CLI/CI) includes suite outcomes, deltas, and recommendation rationale.
- **Source fixtures**: `server/src/policy/fixtures/tenant-baseline.json`, `testpacks/analytics/unauthorized-queries.json`, `testpacks/anomalies/metrics-latency.json`.
- **Execution command**: `pnpm security:policy-sim --proposal <proposal.json> --baseline-ref origin/main --output policy-simulation-report.json`.
- **Controls covered**:
  - Cross-tenant isolation must-pass scenarios.
  - PII denial safety nets.
  - Anomaly alert stability to detect unexpected regressions.
- **CI linkage**: `.github/workflows/ci.yml` `policy-simulation` job uploads the report for every relevant PR.

Store generated reports under build artifacts for auditability; no production configuration is mutated during simulation.
