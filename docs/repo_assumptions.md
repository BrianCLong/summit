# Maestro Spec Interview Repo Reality Check

This document records current assumptions and validation checkpoints for integrating
`maestro_spec_interview_v1` as a first-class Summit capability.

## Assumptions

- Prompt registry lives at `prompts/registry.yaml`.
- Prompt assets live in `prompts/`.
- Schema assets live in `schemas/`.
- Deterministic artifact emitters can be hosted in `scripts/`.
- Roadmap execution state is tracked in `docs/roadmap/STATUS.json`.

## Validation Checklist

- [x] Prompt registry path exists and is writable.
- [ ] CI gate names for Maestro spec ingestion are confirmed in pipeline config.
- [ ] Evidence ID schema pattern is confirmed against production evidence policy.
- [ ] Jules task metadata schema alignment is confirmed.
- [ ] Codex module naming convention alignment is confirmed.
- [ ] `report.json` determinism requirements are confirmed.
- [ ] `stamp.json` timestamp/immutability rules are confirmed.

## Must-Not-Touch Guardrails

- Core orchestrator runtime.
- Existing CI enforcement scripts.
- Production agent routing logic.

## Status

Intentionally constrained to repo-shaped scaffolding pending CI gate name and metadata schema
verification in a follow-up hardening change.
