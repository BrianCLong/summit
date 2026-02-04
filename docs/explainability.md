# Explainability Contract

## Decision Records

For every prioritization decision made by the pipeline, a `DecisionRecord` MUST be emitted if `FEATURE_EXPLAINABILITY_REQUIRED` is enabled.

### Schema

*   `decision_id`: Deterministic SHA256 hash of context + outcome + factors.
*   `context`: Identifier for the input item/context.
*   `outcome`: The decision result (e.g., "prioritize", "drop", "standard").
*   `top_factors`: List of strings explaining *why* (e.g., "score > 0.9", "vip_user").
*   `policy_checks`: List of policy gates passed (e.g., "privacy_check_passed").
*   `model_version`: "baseline" or GNN model ID.
*   `summary`: Human-readable sentence summarizing the decision.

## Determinism

Decision IDs must be deterministic to allow re-simulation and audit. Do not include timestamps or random salts in the hash input.
