# Tabular Predictive Layer (Lane 1 Scaffold)

This document establishes the GA-hardening scaffold for a tabular-native predictive layer. It is evidence-first, deny-by-default, and remains feature-flagged OFF by default.

## Readiness Assertion
This work aligns with the Summit Readiness Assertion and is intentionally constrained to evidence scaffolding only.

## Evidence IDs
- `EVD-FUNDAMENTAL-TABULAR-SCHEMA-001`
- `EVD-FUNDAMENTAL-PROVIDER-002`
- `EVD-FUNDAMENTAL-EVAL-003`
- `EVD-FUNDAMENTAL-POLICY-004`
- `EVD-FUNDAMENTAL-GRAPHRAG-BRIDGE-005`

Evidence files are mapped in `evidence/index.json` and stored under `evidence/`.

## Feature Flags (Default OFF)
- `TABULAR_PREDICT_ENABLED=false` (global kill switch)
- `TABULAR_PROVIDER=mock` (default provider binding)
- `TABULAR_REMOTE_EGRESS_ALLOWLIST=` (empty allowlist)
- `TABULAR_GRAPHRAG_BRIDGE=false` (innovation lane)

## Governance Requirements
- Deny-by-default remote inference with explicit allowlist + enable flag.
- No raw tabular values in logs; redaction is mandatory.
- Evidence artifacts must be deterministic; timestamps only belong in `evidence/stamp.json`.

## Verification Hooks
- Evidence scaffolding validated via repository evidence checks.
- Required check names discovered and mapped in `required_checks.todo.md`.

## Rollback Plan
- Revert the evidence scaffold changes and keep feature flags OFF; existing behavior remains unchanged.

## Status
Intentionally constrained to documentation and evidence scaffolding only. Implementation is deferred pending governed exceptions and policy gates.
