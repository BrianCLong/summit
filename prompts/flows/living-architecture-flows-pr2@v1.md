# Prompt: Living Architecture Flows PR2 (Generate, Verify, Pack)

Implement the executable Living Architecture Flows capability.

## Objectives
- Add `summit flows generate` command with deterministic flow artifacts.
- Add `summit flows verify` command for OpenAPI/workflow checks.
- Add `summit flows pack` command for compact agent context.
- Add drift detector and optional gated CI workflow.
- Document standard, runbook, and data handling.

## Constraints
- Deterministic artifact outputs.
- Best-effort extraction with explicit unknowns.
- Feature-flagged CI enforcement.
