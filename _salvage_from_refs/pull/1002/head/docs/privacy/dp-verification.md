# Differential Privacy Verification

## Static Checks
- `dp` flag must be true in manifest.
- `kMin` ≥ 25 enforced.
- Only DP-safe functions allowed; raw aggregates rejected.

## Dynamic Checks
- Create neighbouring datasets by mutating one record.
- Run template against both datasets.
- Reject if result difference exceeds `expectedDpNoiseBound(ε)`.

## Epsilon Tiers
- `epsilonTiers` array declares allowed spend levels; each execution burns from a tier.
