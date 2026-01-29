#!/bin/bash
set -e
echo "Running Info-Integrity Evals..."
python3 evals/info_integrity/run_evals.py
echo "Evals Passed."
