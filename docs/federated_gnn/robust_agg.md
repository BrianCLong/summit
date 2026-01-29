# Robust Aggregation

Robust aggregation mitigates the impact of malicious or noisy updates in Federated Learning.
By using statistical methods like Median or Trimmed Mean instead of simple Mean, we can ignore outliers that might represent backdoor attacks (e.g., updates with high magnitude or specific directional bias).

## Methods

- **Median**: Takes the coordinate-wise median of updates. Robust to up to 50% malicious clients.
- **Trimmed Mean**: Discards the top and bottom `k%` of values before averaging. Good trade-off between robustness and accuracy.

## Implementation

See `federated_gnn/src/agg/robust.py`.
