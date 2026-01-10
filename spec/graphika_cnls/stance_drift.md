# Stance Drift Detection

## Stance Representation

- Compute embeddings per content item.
- Derive stance polarity score relative to a target topic or entity.
- Store stance vectors alongside lineage nodes.

## Drift Definition

- **Drift event** occurs when stance polarity changes beyond a threshold along a
  lineage path.
- **Reframing** detected when polarity flips sign or crosses a guard band.

## Outputs

- Drift events with path context and timestamps.
- Reframing summaries included in lineage capsules.

## Quality Controls

- Confidence thresholds for stance classification.
- Explainability: top terms or evidence snippets for stance change.
