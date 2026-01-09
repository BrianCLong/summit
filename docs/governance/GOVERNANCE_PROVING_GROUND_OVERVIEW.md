# Governance Proving Ground Overview

The **Summit Governance Proving Ground** is a regression testing suite for governance policies. Just as we test code to ensure it behaves correctly, we test our governance pipelines (GA gates, Risk assessment, Incident readiness) to ensure they enforce the intended policies as the repository evolves.

## Concept

Instead of relying on real Pull Requests to test governance logic, we define **Synthetic Scenarios**. Each scenario represents a hypothetical change (e.g., "High Risk Core Graph Change") and defines the expected outcomes from our governance systems.

## Scenarios

Scenarios are defined in `configs/governance/SCENARIOS.yaml`.
Each scenario has:
- **ID**: Unique identifier.
- **Tenant Profile**: The tenant context for the change.
- **Deployment Profile**: The target environment.
- **Expected Outcomes**:
  - `risk_level`: Expected risk score/level.
  - `ga_gate`: Expected GA gate decision.
  - `incident_readiness`: Whether an incident drill is triggered.

## Synthetic Diffs

For each scenario, we provide metadata that simulates a git diff. This allows the risk scorer to evaluate the change without needing an actual git history or file changes. These are stored in `configs/governance/scenarios/*.json`.

## The Runner

The proving ground runner (`scripts/governance/run_proving_ground.mjs`) executes these scenarios against the actual policy logic (via adapters) and generates a report.

## Usage

Run the proving ground locally:
```bash
node scripts/governance/run_proving_ground.mjs
```

This will output a report to `artifacts/governance/proving_ground/`.

## CI Integration

The `governance-proving-ground` workflow runs this suite periodically to detect policy drift.
