#!/bin/bash
set -e

# Ensure we are in the root
cd "$(dirname "$0")/.."

# Check for venv
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Install requirements if needed (minimal check)
if ! python3 -c "import yaml" &> /dev/null; then
    echo "Installing PyYAML..."
    pip install pyyaml
fi

# Run training
echo "Running Frontier Training (1.3B)..."
python3 experiments/train.py --config experiments/configs/model_1.3b_frontier.yaml
