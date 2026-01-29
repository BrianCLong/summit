# Runbook: Agentic Vision Runtime

## Service Overview
The Vision Investigation Runtime provides agentic image analysis capabilities.

## Operational Procedures

### Troubleshooting "Security Violation"
*   **Symptom**: Agent fails with "Security violation: disallowed term".
*   **Cause**: The LLM generated code trying to import restricted modules (os, sys).
*   **Resolution**: Tune the system prompt to explicitly forbid these libraries.

### Troubleshooting "Timeout"
*   **Symptom**: Status is "timeout".
*   **Cause**: The agent exceeded the maximum step count (default 5).
*   **Resolution**: Check if the query is too complex. Increase max steps if necessary.

### Drift Detection
*   Monitor `python/tests/test_vision_investigation.py` in CI.
*   Ensure `metrics` in evidence match expected values for golden samples.
