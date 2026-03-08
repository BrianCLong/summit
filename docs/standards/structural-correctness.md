# Structural Correctness Framework

The Structural Correctness Framework provides deterministic validation for model outputs where structure must be preserved.

## Supported validators

- JSON contract validation (parseability, required keys, top-level type)
- SQL structural validation (parseability, multi-statement guard, dangerous statement guard)
- Markdown table integrity (header separator and column consistency)
- LaTeX safe-mode validation (blocked primitives, length cap, brace balance)

## Artifacts

- `artifacts/structcorr/report.json`
- `artifacts/structcorr/metrics.json`
- `artifacts/structcorr/stamp.json`

Artifacts are deterministic and do not include wall-clock timestamps.

## Feature flag

Set `SUMMIT_STRUCTCORR=1` to enable framework execution. Default is `0` (off).
