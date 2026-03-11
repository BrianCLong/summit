# Countermeasure Orchestrator (CMO-V1)

## Purpose

CMO-V1 is a defensive, deterministic orchestration engine that converts validated warning
indicators into a phased response playbook with explicit budget constraints.

## Summit Readiness Assertion

This feature enforces governed defensive actions, evidence-linked rationale, and deterministic
selection to shorten response loops without bypassing policy controls.

## Capability

- Input: warning indicator set (`severity`, `confidence`, optional `tags`).
- Output: `cogwar.countermeasure_playbook.v1` object with:
  - risk index
  - strategy focus tags
  - selected actions
  - phase timeline
  - safeguards
- Gating: disabled by default unless `COGWAR_INNOVATION=true`.

## MAESTRO Alignment

- MAESTRO Layers: Data, Agents, Tools, Observability, Security.
- Threats Considered: prompt injection in indicators, manipulation through noisy signals, unsafe
  automation drift.
- Mitigations:
  - feature flag default OFF
  - bounded `max_budget` and `max_actions`
  - deterministic ordering and selection logic
  - defensive-only action catalog with HITL caveats

## Integration

- Warning integration: `cogwar/iw/warning.py`
- Innovation module: `cogwar/innovation/countermeasure_orchestrator.py`
- Schemas:
  - `cogwar/schemas/countermeasure_playbook.schema.json`
  - `cogwar/schemas/warning.schema.json` (`countermeasure_playbook` reference)
