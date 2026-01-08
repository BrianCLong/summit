# Compliance Drift Detection

Drift detection ensures that the code and infrastructure do not deviate from the defined compliance controls over time.

## Drift Categories

1.  **Control Coverage Drift:**
    - _Definition:_ New features or services added without corresponding control mappings.
    - _Detection:_ CI check scanning for new service directories missing in `control-map.yaml`.

2.  **Evidence Availability Drift:**
    - _Definition:_ A control is mapped, but the evidence generation script fails to produce the artifact.
    - _Detection:_ Daily/Weekly scheduled job running `scripts/compliance/generate_evidence.ts` in dry-run mode.

3.  **Policy Drift:**
    - _Definition:_ Critical OPA policies are modified or weakened without compliance review.
    - _Detection:_ CodeOwners enforcement on `policies/` directory.

## Automated Checks

### 1. `check_drift.ts`

This script runs in CI on every PR to `main`.

- Parses `compliance/control-map.yaml`.
- Verifies referenced artifacts exist.
- (Future) Checks coverage of new modules.

### 2. Scheduled Evidence Verification

- **Frequency:** Weekly.
- **Action:** Runs full evidence generation for a random sample of controls.
- **Alerting:** Pings `#compliance-alerts` if generation fails.

## Remediation

- **Drift Detected in PR:** The PR check will fail. The developer must update `compliance/control-map.yaml` or restore the missing artifact.
- **Drift in Production:** An alert is fired. The Compliance Engineer on call investigates.
