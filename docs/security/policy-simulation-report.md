# Policy Simulation Report Schema

The policy simulation report captures deterministic, evidence-backed comparisons between baseline and proposed policy bundles.

## PolicySimulationReport

- **proposalId**: Proposal identifier (proposal file name or working tree marker).
- **policyTargets**: Explicit file/keys affected by the proposal or working tree.
- **simulationRuns**: Array of per-suite results for `security_evals`, `anomaly_fixtures`, and `api_integration`.
  - **suite**: Suite name.
  - **mode**: `baseline` or `proposed`.
  - **passed**: Boolean verdict for the run.
  - **summary**:
    - `scenarioPassRate` (0-1)
    - `denyDeltaByCategory` (map keyed by category/tool)
    - `falsePositiveIndicators` (IDs that flipped from allow→deny)
    - `securityPositiveIndicators` (IDs that flipped toward safer outcomes)
  - **deltas**:
    - `scenarios`: Outcome flips with previous/current outcome and category
    - `anomalies`: Score/alert deltas (reserved for detectors)
- **recommendation**: `approve | needs_review | reject` plus rationale and threshold snapshot.
- **evidenceRefs**: Scenario/alert/trace identifiers used in the comparison.
- **metadata**: `generatedAt`, `seed`, versions (`runner`, `policyBundleDigest`, `baselineRef`).

## Determinism and reproducibility

- Fixed fixtures (`server/src/policy/fixtures/tenant-baseline.json`, `testpacks/analytics/unauthorized-queries.json`, `testpacks/anomalies/metrics-latency.json`).
- No external calls; anomaly scoring runs purely with `@intelgraph/anomaly-detection` in-memory baselines.
- Stable ordering and seed defaults (42) enforced by the runner.
