# Runbook: Prompt Repetition

## Feature Flags
- `SUMMIT_ENABLE_REPETITION_REINFORCEMENT`: Set to `true` to enable constraint reinforcement transforms. Default is `false`.

## Rollback
To rollback, disable the feature flag.

## Adjustments
To adjust thresholds for beneficial vs. harmful repetition, modify the scoring logic in `summit/policies/repetition_detector.py`.
