# Prompt: Engram Memory Plane (v1)

Implement a deterministic Engram-like memory plane for Summit/Maestro.

## Objectives
- Provide canonicalization, multi-head N-gram hashing, deterministic gating, and a Maestro memory tool wrapper.
- No LLM calls inside memory plane; optional embeddings only at ingestion time.
- Provide unit tests for canonicalization stability, hashing determinism, collision behavior under multi-head hashing, and policy filtering.
- Add telemetry for hit rate, candidate counts, gate distribution, and token savings estimates.

## Scope
- Create `packages/memory-engram` with TypeScript implementation and tests.
- Update `docs/roadmap/STATUS.json` to record the change.
- Add agent task spec under `agents/examples/`.
- Register this prompt in `prompts/registry.yaml` with SHA-256.

## Constraints
- Deterministic, offline execution path for memory retrieval.
- Policy enforcement must be injectable (policy-as-code handled externally).
- No cross-boundary imports; stay within package scope.
