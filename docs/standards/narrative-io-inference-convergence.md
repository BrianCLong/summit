# Standards: Narrative IO Inference & Convergence

## Imports
- Corpus snapshots (Summit’s existing ingestion)
- Optional metadata: timestamps, actor IDs, platform hints

## Exports
- Deterministic JSON evidence pack (`interpretive_defaults.json`, `redundancy_clusters.json`, `convergence.json`)
- Optional graph updates (narrative nodes/edges) via `src/graphrag/*`

## Non-goals
- No censorship / automated takedown logic
- No “truth adjudication”
- No demographic inference; no targeting individuals
