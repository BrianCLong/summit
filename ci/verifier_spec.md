# CI Verifier Specification

This file maps logical Summit gates to their execution commands and expected Evidence IDs.

| Gate Name | Command | Output Evidence ID |
|-----------|---------|--------------------|
| `split_brain_eval` | `python tools/ci/run_split_brain_eval.py` | `EVD-LLMTRAININGCHANGE-EVAL-001` |
| `policy_enablement_gate` | `python tools/ci/run_policy_gates.py` | `EVD-LLMTRAININGCHANGE-POLICY-001` |
| `objective_conflict_gate` | `pytest tests/test_objective_conflicts.py` | N/A (Unit Test) |

## Configuration

- **Fail-fast**: Yes
- **Timeout**: 10m
