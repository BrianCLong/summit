set -euo pipefail

echo "Running CI Gate Shim..."

# 1. Evidence Schema Validation
# (Assuming validate_evidence.py exists or similar, but for now we just check existence)
if [ ! -f evidence/index.json ]; then
  echo "Error: evidence/index.json missing."
  exit 1
fi

# 2. Provenance Lint
echo "Running Provenance Lint..."
python scripts/ci/provenance-lint.py

# 3. Dependency Delta Check
echo "Running Dependency Delta Check..."
bash scripts/ci/deps-delta-check.sh

# 4. Science Eval Fixtures (Positive Test)
if [ -f eval/science/run.py ]; then
    echo "Running Science Eval Positive Fixture..."
    python -m eval.science.run eval/science/fixtures/continuum_small_positive.json
fi

echo "CI gate shim OK"
