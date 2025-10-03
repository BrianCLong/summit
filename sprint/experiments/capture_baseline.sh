#!/bin/bash

# Capture real baselines for SLO enforcement
echo "🔍 Capturing real baselines for SLO enforcement..."

# Run the harness to generate metrics
echo "🏃 Running harness to generate baseline metrics..."
make -f sprint/impl/Makefile run || true
python3 sprint/experiments/harness/run.py --config sprint/experiments/configs.yaml || true

# Write the baseline
echo "💾 Writing baseline to sprint/benchmark/baseline.json..."
WRITE_BASELINE=1 python3 sprint/experiments/evaluate.py

# Commit the baseline
echo "➕ Committing baseline..."
git add sprint/benchmark/baseline.json
git commit -m "chore(bench): establish baseline" -m "Capture real baseline metrics from current environment for SLO enforcement."

echo "✅ Baseline captured and committed successfully!"
echo "📌 Next steps:"
echo "   1. Push to main: git push origin main"
echo "   2. Protect main branch to require 'Aurelius Sprint Pack' + 'Enforce SLOs' jobs to pass"
echo "   3. Open PR-6 (comment bot), PR-7 (OTel stubs), and PR-8 (PROFILE stats)"