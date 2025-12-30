# Disclosure Engine

## Responsibilities

- Enforce disclosure constraints across analytics outputs, transform results, recon results, and identity exports.
- Apply egress byte budgets, cardinality limits, group size thresholds, and DP noise when required.
- Produce info-loss metrics for PQLA and export decisions.

## Interactions

- Called by PQLA sandbox, SATT executor, QSDR orchestrator, CIRW export layer, and FASC artifact exporter.
- Receives policy decision ID to ensure consistent enforcement.
- Emits disclosure logs to witness ledger with commitment to sanitized outputs.
