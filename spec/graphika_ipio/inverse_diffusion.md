# Inverse Diffusion Workflow

## Steps

1. **Graph assembly**: Build temporal propagation graph from interaction events.
2. **Model selection**: Choose diffusion family based on narrative dynamics.
3. **Parameter fitting**: Estimate model parameters from activation times.
4. **Inverse inference**: Solve for minimal origin set under cardinality budget.
5. **Uncertainty analysis**: Sample or approximate posterior over origin nodes.
6. **Certificate emission**: Produce origin certificate and commitments.

## Optimization Objective

Minimize activation-time loss with regularization for origin set size:

```
min_{S} L(activation_times, S) + λ * |S|
```

## Determinism

All stochastic steps (sampling, initialization) must bind to the replay token
seed and model version.
