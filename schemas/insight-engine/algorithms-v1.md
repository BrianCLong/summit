# Insight Engine Algorithms v1

## Confidence Formula
```text
confidence = source_reliability_weight * algorithm_confidence * evidence_completeness
```

## 1. Hub Detection
- Goal: Identify coordination nodes.
- Method: betweenness centrality + degree centrality threshold on weighted edges.

Pseudo:
```python
if centrality_score > threshold:
    emit_hub_insight(entity)
```

## 2. Transaction Loop Detection
- Goal: Identify laundering cycles.
- Method: cycle detection with path length `<= 5` and temporal proximity checks.

## 3. Sanctions Proximity
- Goal: Identify entities 1-3 hops from sanctioned nodes.
- Method: BFS depth `<= 3` with confidence decay per hop.

## 4. Behavioral Anomaly
- Goal: Detect unusual transaction behavior.
- Method: z-score against baseline and temporal clustering.
