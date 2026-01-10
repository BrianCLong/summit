# Narrative Lineage Graph

## Node Model

- **ContentNode**
  - `content_id`: canonical identifier
  - `source`: platform/source name
  - `timestamp`: ingestion time
  - `fingerprint`: text/media/URL signatures

## Edge Model

- **LineageEdge**
  - `from_content_id`
  - `to_content_id`
  - `relation`: quoted | remixed | linked
  - `confidence`: 0.0-1.0
  - `evidence`: fingerprint match + temporal ordering

## Construction Rules

- Prefer normalized resource identifiers when available.
- Use LSH for near-duplicate text matching.
- Enforce temporal ordering constraints to avoid backward lineage.

## Lineage Path Extraction

- Depth-limited BFS/DFS for path exploration.
- Enforce maximum expansion count and runtime budget.
- Return top-k paths by relevance to target topic.
