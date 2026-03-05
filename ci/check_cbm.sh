#!/usr/bin/env bash
set -euo pipefail

echo "Running CBM Unit Tests..."
PYTHONPATH=. pytest tests/test_cbm_determinism.py
PYTHONPATH=. pytest tests/test_cbm_narrative_graph.py
PYTHONPATH=. pytest tests/test_cbm_coordination.py
PYTHONPATH=. pytest tests/test_cbm_void_score.py
PYTHONPATH=. pytest tests/test_cbm_ai_exposure.py
PYTHONPATH=. pytest tests/test_cbm_drift_detector.py

echo "CBM checks passed."
