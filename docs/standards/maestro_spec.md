# Maestro Spec Interview Standard

## Purpose

`maestro_spec_interview_v1` standardizes requirements extraction into deterministic,
machine-validated artifacts aligned with Summit governance expectations.

## Input/Output Interop

| System | Import | Export |
| --- | --- | --- |
| Maestro | Sectioned interview payload | `spec_bundle.json` |
| Jules | `spec_bundle.json` | `jules_tasks` execution seeds |
| Codex | `spec_bundle.json` | `codex_tasks` implementation seeds |
| Observer | `report.json` | Validation metrics and gate posture |

## Artifact Contract

All runs emit:

- `spec_bundle.json`
- `report.json`
- `metrics.json`
- `stamp.json`

Each artifact is deterministic for identical inputs and mode.

## Non-Goals

- Autonomous code generation.
- Regulatory certification automation.
- Vendor-specific orchestration lock-in.
