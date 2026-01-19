# Prompt: Influence Pathway & Cascade Mapper (v1)

## Objective
Implement cross-platform narrative cascade mapping and pathway scoring to trace content movement across platforms, audiences, and time.

## Requirements
- Model narrative cascades and hops as first-class graph objects.
- Compute efficiency metrics (reach per hop, time-to-peak).
- Label pathway motifs (botnet amplification, elite–mass relay, fringe→mainstream) using graph heuristics.
- Update `docs/roadmap/STATUS.json` with the revision note for this change.
- Add unit coverage for the cascade mapping logic.

## Constraints
- Follow repository governance and quality mandates.
- Keep logic deterministic given input data.
- Preserve TypeScript conventions and avoid untyped `any` unless justified.
