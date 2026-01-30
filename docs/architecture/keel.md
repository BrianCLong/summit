# Keel (arXiv:2601.19895) — Summit integration notes

## Overview

Keel is a Post-LN Transformer modification that replaces the ResNet-style residual pathway with a
scaled shortcut. The clean-room form used in Summit matches the public equation:

```
x_{l+1} = LN_out(alpha * x_l + F(LN_in(x_l))).
```

## Configuration

`KeelConfig` is deny-by-default and must be explicitly enabled. Supported alpha modes:

- `L`: `alpha = num_layers`
- `sqrtL`: `alpha = sqrt(num_layers)`
- `const`: `alpha = const_alpha`

## Safety controls

- Default off: `enabled = false`
- Validation requires `alpha_mode` and `num_layers`
- Rollback: disable `KeelConfig.enabled`

## Evidence

Evidence IDs reserved for this integration:

- `EVD-260119895-keel-ARCH-001` (block conformance)
- `EVD-260119895-keel-STAB-002` (stability gates)
- `EVD-260119895-keel-DSCL-003` (depth scaling sweep)
- `EVD-260119895-keel-BENCH-004` (benchmark aggregation)
