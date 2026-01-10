# Control Evidence Compiler

## Purpose

Compiles telemetry into control-evidence bundles mapped to NIST SP 800-171 controls for assessment and SPRS readiness.

## Inputs

- Telemetry events (auth logs, policy decisions, export receipts)
- Control mapping matrix (`compliance/nist_800_171/control_matrix.csv`)
- Assessment window metadata

## Outputs

- Control-evidence bundle with sufficiency status
- SSP reference pointers
- POA&M delta for missing evidence
- Replay token binding to control bundle

## Policy Gate

- Evidence sufficiency enforced by `intelgraph.policy.contracting`.
- Export denied if control IDs are missing or insufficient.
