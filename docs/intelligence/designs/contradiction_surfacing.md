# Contradiction Surfacing Mechanism Design

## Purpose

To explicitly model and surface conflicting information rather than attempting to resolve it into a single "truth" during ingestion. This preserves uncertainty and allows for competing hypotheses.

## Mechanism

### Storage

- **Contradiction Node:** A distinct node type `Contradiction` in IntelGraph connecting two or more `Claim` or `Evidence` nodes.
- **Properties:**
  - `type`: "factual", "temporal", "attribution"
  - `confidence`: float (strength of contradiction)
  - `status`: "open", "resolved", "dismissed"

### Surfacing

- **UI/API:**
  - When querying a `Subject`, response includes a `contradictions` array.
  - "Warning Banners" on profiles with high unresolved contradiction counts.
- **Graph Traversal:**
  - Pathfinding algorithms must penalize paths through Contradiction nodes unless explicitly exploring conflict.

## Inputs

- Pairs of `Claim` or `Evidence` entities.
- Logic/Rules engine (e.g., "Person cannot be in two places at once").

## Outputs

- `Contradiction` entities.
- "Confidence Collapse" metrics for downstream assessments.

## Failure Cases

- **False Conflict:** Context nuances (sarcasm, metaphor) interpreted as factual contradiction.
- **Resolution Lag:** Human resolution of a contradiction is not propagated to dependent automated assessments.
