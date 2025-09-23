# Predictive Threat Intelligence Suite

This module provides three complementary capabilities for forecasting and
analysing threat activity on the IntelGraph platform.

## Components

1. **Predictive Timeline Generator** (`graph-service/timeline_prediction`)
   - FastAPI service that forecasts future graph activity.
   - Demo model returns stub data for the next *N* days.
2. **Causal GNN Explainer** (`ml/causal_explanations`)
   - Wraps a graph neural network explainer to highlight influential nodes and
     edges. The current implementation is a placeholder awaiting a trained
     model.
3. **Counterfactual Simulator** (`cognitive_insights_engine/counterfactual_sim`)
   - Allows "what-if" analysis by removing edges and re-running inference.

## Running tests

```bash
pytest graph-service/timeline_prediction/tests/test_timeline.py
pytest ml/causal_explanations/tests/test_explanations.py
pytest cognitive_insights_engine/counterfactual_sim/tests/test_simulation.py
```

## Helm deployment

A lightweight Helm chart is provided in `helm/predictive-suite` to deploy the
three services. Example usage:

```bash
helm install predictive-suite helm/predictive-suite --namespace intelgraph
```

Provide custom images or configuration via `--set` flags or a values file.
