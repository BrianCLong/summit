# GraphRAG Guide

Summit GraphRAG uses intent-compiled retrieval and bounded traversal.

## Multi-hop Baseline

- Hop budget: 3
- Node budget: 120
- Deterministic ordering: required
- Confidence threshold: 0.70+

## Demo Query Shape

The wow demo emits a `runAgentSwarm` mutation file in `artifacts/wow-demo/graphql-run-agent-swarm.graphql`.

The expected sequence is:

1. Semantic chunking creates evidence windows.
2. GraphRAG executes bounded multi-hop retrieval.
3. Maestro coordinates Jules, Codex, and Observer for synthesis.
4. Report includes confidence and provenance links.

## Demo Data

- `datasets/wow/mit-sloan-startups-2026.jsonl`
- `datasets/wow/intsum-2026-threat-horizon.jsonl`
