# Differential Privacy Cookbook

Examples for common aggregates using Laplace mechanism.

## Count
```
result = dpCount(rawCount, { epsilon: 1.0, delta: 1e-6, kMin: 20, mechanism: 'laplace' })
```

## Sum
```
result = dpSum(values, { epsilon: 0.5, delta: 1e-6, kMin: 20, mechanism: 'laplace', clip: 100 })
```

Noise scale is derived from sensitivity divided by epsilon.
