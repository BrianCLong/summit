#!/bin/bash
set -e

# Define paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
CORPUS="${SCRIPT_DIR}/../fixtures/entity-extraction/corpus.json"
EXTRACTED="${SCRIPT_DIR}/../fixtures/entity-extraction/extracted.json"
REPORT="${SCRIPT_DIR}/report.json"

echo "Running Entity Extraction Evaluation..."
python3 "${SCRIPT_DIR}/evaluator.py" \
    --corpus "${CORPUS}" \
    --extracted "${EXTRACTED}" \
    --output "${REPORT}"

echo "Evaluation complete. Report generated at ${REPORT}"
