# Context Pruning in Summit

This document defines Summit’s semantic highlighting and context pruning subsystem. The objective is to reduce retrieval noise and pack evidence into a budget-aware prompt while preserving provenance and contradictions.

## Summary

- **Model**: default integration uses `zilliz/semantic-highlight-bilingual-v1` (0.6B encoder-only) pinned to revision `6dfd9cbee6d9309201b4ff4b4bdd814e1c064491`.
- **Goal**: reduce token usage (~70–80% target), maintain evidence citations, and improve interpretability.
- **API**: `/highlight` accepts query + context/documents, returns selected sentences/spans, compression rate, and scores.

## Threat Model & Security Controls

- **Pinned revision**: model revisions are pinned by SHA. Updates require explicit review.
- **Allowlist**: only allowlisted model IDs can be loaded.
- **Remote code**: `trust_remote_code=false` by default; enable only inside a sandboxed container.
- **Timeouts & fallback**: client enforces timeouts and falls back to unpruned context when unavailable.
- **PII hygiene**: logs should emit hashes and lengths, never raw text.

## Flow

1. Retrieval (graph + documents + temporal)
2. Optional policy enforcement
3. Semantic highlight/prune (context-pruner service)
4. Budget-aware packer (utility per token)
5. LLM generation

## Evidence & Metrics

The pruning response includes:

- `compression_rate`
- `kept_token_count`
- `total_token_count`
- per-sentence scores and conflict set tags

These metrics are persisted in evidence bundles as part of CI/ops evidence pipelines.

## Local Development

```bash
uvicorn services.context-pruner.src.main:app --reload --port 8090
```

Enable the mock mode with:

```bash
export CONTEXT_PRUNER_MODE=mock
```

## Governance

All changes must comply with:

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/ga/TESTING-STRATEGY.md`
