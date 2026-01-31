#!/bin/bash
set -e
echo "Checking Solo OS directory structure..."
python3 solo_os/eval/verifier.py

echo "Running Governance Gate tests..."
python3 -m unittest solo_os/eval/test_gate_fixtures.py

echo "Running Engine tests..."
python3 -m unittest solo_os/eval/test_engines.py

echo "Solo OS CI verification complete."
