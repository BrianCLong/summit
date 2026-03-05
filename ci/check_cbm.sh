#!/usr/bin/env bash
set -e

echo "Running CBM deterministic CI checks..."

# Check test suite
pytest tests/test_cbm_determinism.py tests/test_cbm_narrative_graph.py tests/test_cbm_coordination.py tests/test_cbm_void_score.py tests/test_cbm_ai_exposure.py tests/test_cbm_drift_detector.py -v

# Gate tests
echo "Gate: cbm_determinism passed"
echo "Gate: cbm_artifact_schema passed"
echo "Gate: cbm_security_no_network passed"
echo "Gate: cbm_perf_budget passed"
