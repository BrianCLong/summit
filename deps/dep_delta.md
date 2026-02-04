# Dependency Delta - DeepSeek OCR2 vLLM Support

## Changes
- No new external python dependencies added in this PR.
- Added internal modules for model preflight and backend selection.
- Added CI policy gates for supply chain security.

## Justification
- `summit/inference/model_preflight.py`: Detects model architecture to prevent vLLM crashes.
- `summit/inference/backend_selector.py`: Implements policy-based backend routing.
- `ci/policy/no_latest_tags.py`: Prevents non-deterministic deployment images.
- `ci/policy/dep_delta_enforce.py`: Enforces this documentation.
