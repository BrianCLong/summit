# Drift Checks

Explains how EBLE detects label distribution drift across assessment cycles.

## Signals

- Frequency shifts per label class or source feed.
- Confidence interval widening or narrowing across cycles.
- Temporal drift aligned to assessment windows.

## Actions

- Emit drift alarms when thresholds exceeded; alarms recorded in transparency log.
- Generate counterfactual label bundles excluding drift-driving feeds and compute scoring deltas.
- Provide evaluator-readable drift report summarizing distribution changes.
