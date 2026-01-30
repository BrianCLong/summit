# Innovator-VL evaluation scaffolding

This directory provides a Summit-native, deny-by-default scaffold to evaluate
Innovator-VL-style multimodal systems without introducing external dependencies
or data blobs. It follows the Summit Readiness Assertion and preserves evidence
separation for deterministic auditing.

## What is implemented

- Evidence bundle index + JSON schemas for report/metrics/stamp artifacts.
- Minimal harness entrypoint that emits deterministic `report.json` and
  `metrics.json` files (timestamps and git metadata are reserved for
  `stamp.json`).
- Required-check discovery checklist for mapping placeholder CI gate names to
  Summit's actual required checks.

## How to run

```bash
python -m summit_ext.innovator_vl.harness.run_eval
```

## Safety defaults

- External judges are **disabled by default** (implemented in later PRs).
- RL modules are **disabled by default** (implemented in later PRs).

## Integration notes

- Model calls are intentionally stubbed. Replace with Summit's canonical
  multimodal model interface once identified.
- Keep evidence artifacts deterministic. Do not add timestamps to
  `report.json` or `metrics.json`; timestamps belong only in `stamp.json`.

## TODOs (tracked in code)

- Identify Summit's canonical multimodal model interface.
- Map placeholder CI gate names to actual required checks.

## Attribution

This scaffold implements patterns described in the Innovator-VL paper and
public artifacts. No dataset content or model weights are included.
