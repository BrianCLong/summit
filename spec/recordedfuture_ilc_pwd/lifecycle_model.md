# Lifecycle Model

## States

- **NEW**: initial evidence observed but low confidence.
- **ACTIVE**: confirmed and recent evidence.
- **RETIRING**: confidence decaying; contradictions increasing.
- **RETIRED**: insufficient confidence or explicit remediation.

## Transition Rules (conceptual)

- NEW → ACTIVE: confidence ≥ threshold and contradiction score low.
- ACTIVE → RETIRING: confidence below decay threshold for window.
- RETIRING → RETIRED: confidence below minimum or remediation confirmed.
- Any → ACTIVE: new high-trust evidence overrides decay.

## Evidence Weights

- Telemetry sightings: high trust, short half-life.
- OSINT: medium trust, longer half-life.
- Remediation confirmations: high trust, high impact.

## Determinism

Transitions are deterministic given the evidence set, decay parameters,
policy version, and determinism token.
