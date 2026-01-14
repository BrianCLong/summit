---
id: aelab-drq-engine
version: v1
owner: codex
last_updated: 2026-01-15
purpose: Governed adversarial evolution engine inspired by Digital Red Queen.
---

# AELab DRQ Engine Prompt (v1)

## Mission
Build a Summit-native Adversarial Evolution Lab (AELab) with a DRQ-style engine:
- Multi-round self-play with champions per round.
- MAP-Elites diversity preservation.
- New + mutate candidate operators with prompt-driven scaffolding.
- Deterministic, checkpointed, resume-safe evaluation in offline sandboxes.
- Provenance-first evidence bundles.

## Scope
- Package: `packages/agent-lab` (engine + CLI + tests).
- Docs: `docs/aelab/` and `docs/README.md`.
- Prompt templates in `prompts/aelab/`.
- Roadmap status update in `docs/roadmap/STATUS.json`.

## Constraints
- No offensive capability; toy domain only.
- No direct external LLM calls; route through a Summit LLM router adapter.
- Minimal dependencies, existing repo patterns.
- Evidence bundle with manifest, champions, archive, logs.

## Output
- RedQueenEngine + MAP-Elites.
- Toy domain (safe DSL).
- CLI entry to run `pnpm aelab drq --domain=toy`.
- Unit + integration tests.
- Governance and safety documentation.
