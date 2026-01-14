# AELab DRQ-Style Adversarial Evolution Engine

This document defines Summit's Adversarial Evolution Lab (AELab) engine inspired by Digital Red Queen (DRQ). The implementation is governed, provenance-first, and explicitly constrained to safe, offline toy domains. Readiness alignment is asserted in [`docs/SUMMIT_READINESS_ASSERTION.md`](../SUMMIT_READINESS_ASSERTION.md).

## What We Borrowed From DRQ (High-Level)

- **Multi-round self-play:** Each round produces a champion candidate evaluated against prior champions and baselines.
- **MAP-Elites diversity:** Per-round search maintains quality-diversity archive to avoid collapse.
- **New + mutate operators:** Candidates are generated via new/mutate operators (LLM-capable but routed through Summit adapters).
- **Parallel evaluation + checkpointing:** Worker pool abstraction and resume-safe checkpoints.

## Summit-Specific Generalization (Moats)

- **Domain-agnostic adapters:** Candidates, evaluation, validation, and behavior descriptors are pluggable.
- **Governance-first:** Offline sandbox defaults, allowlist controls, and safety gates before/after evaluation.
- **Provenance-first:** Candidate lineage, content hashes, and run evidence bundles are mandatory outputs.

## Toy Domain Demo (Safe)

The included toy domain is a **String Transformer Duel**:

- Candidates are small, safe DSL programs (string ops only).
- Matches compare candidate accuracy vs opponents on a fixed corpus.
- Baseline candidates emulate “human strategies” without offensive capability.

Run the demo from repo root:

```bash
pnpm aelab drq --domain=toy --rounds=10 --iters=200 --seed=0 --resume
```

Evidence bundle output:

```
artifacts/agent-lab/aelab/runs/<runId>/
  manifest.json
  champions.jsonl
  archive/round-<n>.json
  logs/events.jsonl
  checkpoint.json
```

## Writing a New Domain Adapter

Implement the `DomainAdapter` contract from `packages/agent-lab/src/aelab/types.ts`:

- **CandidateArtifact:** typed payload + lineage metadata.
- **validate(candidate):** static checks (size, shape, policies).
- **evaluate(candidate, opponents, context):** deterministic scoring + safety flags.
- **describe(candidate, metrics):** behavior descriptor vector for MAP-Elites.
- **context(seed):** deterministic evaluation context.

Register your domain in the CLI entry and supply the desired operators.

## Governance & Safety Model

- **Offline-by-default:** no network calls in evaluation.
- **Allowlist enforcement:** explicit tool allowlists in config and gates.
- **Safety gates:** pre-eval and post-eval gates must pass before archival.
- **Evidence bundles:** manifest + logs + champions + archive are mandatory.

## LLM Operator Scaffolding

Prompt templates live in `prompts/aelab/` and are referenced by ID/version in run manifests. No direct external calls exist in AELab; integrate a Summit LLM router by implementing the `LlmRouter` interface and wiring it into candidate operators.
