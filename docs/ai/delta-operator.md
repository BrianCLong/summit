# Delta Operator for Selective Memory Updates

The Delta Operator is a **rank-1 perturbation of the identity matrix** inspired by Deep Delta Learning. It enables selective forgetting and targeted writing in iterative retrieval or agent-memory updates, reducing "residual accumulation" and context bloat.

## Definition

Given a state vector or matrix \(X\), a normalized direction \(k\), a value vector \(v\), and a gate \(\beta\) (clamped to \([0, 2]\)), the update is:

\[
X_{l+1} = (I - \beta k k^T) X_l + \beta k v^T
\]

Efficiently, this is computed as:

- **Erase** along \(k\): \(X_l - \beta k (k^T X_l)\)
- **Write** new content: \(+ \beta k v^T\)

Special cases (with \(k\) normalized):

- \(\beta \approx 0\): Identity update (no change)
- \(\beta \approx 1\): Projection that removes the component along \(k\)
- \(\beta \approx 2\): Reflection that inverts the component along \(k\)

Reference: [Deep Delta Learning project page](https://github.com/yifanzhang-pro/deep-delta-learning) and accompanying paper.

## Summit integration

- **Feature flag**: `DELTA_OPERATOR_ENABLED` (default: `false`).
- **Location**: `@intelgraph/language-models` semantic search now maintains an internal query state that can be refined per search invocation via the Delta Operator when the flag is enabled.
- **Telemetry**: When enabled, the integration records gate values (`beta`), the projected magnitude `||k^T X||`, and the update norm `||X_next - X||` via the provided telemetry hooks.

## Tuning

- `beta` is derived with a bounded logistic mapping of novelty vs. confidence: `beta = clamp(2 * sigmoid(a*(novelty - confidence) + b))`.
- Defaults favor stability; increase slope `a` or bias `b` to make updates more aggressive.
- `valueDimensions` (default `1`) controls how much of the retrieved context embedding is written.

## Usage

1. Set `DELTA_OPERATOR_ENABLED=true` in the environment (or pass `deltaOperatorEnabled: true` to `SemanticSearch`).
2. Optionally provide a telemetry sink implementing `recordBeta`, `recordProjectionMagnitude`, and `recordDeltaNorm`.
3. Adjust `deltaConfig` (slope, bias, eps) if you want a different gating curve.

With the flag off, behavior is unchanged. With the flag on, iterative queries can selectively forget noisy directions and write new evidence into a compact working state, improving retrieval stability in long-running agent loops.
