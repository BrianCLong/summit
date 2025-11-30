#!/bin/bash
# Compare two versions of IntelGraph using scenario evaluation

set -e

SCENARIO=${1:-fraud-ring}
BASELINE_VERSION=${2:-baseline}
CANDIDATE_VERSION=${3:-candidate}
SESSIONS=${4:-5}
SEED=${5:-42}

echo "🔄 IntelGraph Version Comparison"
echo "================================="
echo "Scenario: $SCENARIO"
echo "Baseline: $BASELINE_VERSION"
echo "Candidate: $CANDIDATE_VERSION"
echo "Sessions: $SESSIONS"
echo "Seed: $SEED"
echo ""

# Create output directories
mkdir -p ./reports/comparison/$BASELINE_VERSION
mkdir -p ./reports/comparison/$CANDIDATE_VERSION

# Build harness
echo "Building harness..."
pnpm build

# Run baseline
echo ""
echo "📊 Running baseline ($BASELINE_VERSION)..."
pnpm run-scenario run \
  --scenario "$SCENARIO" \
  --seed "$SEED" \
  --sessions "$SESSIONS" \
  --format json \
  --output "./reports/comparison/$BASELINE_VERSION"

BASELINE_REPORT="./reports/comparison/$BASELINE_VERSION/$(ls ./reports/comparison/$BASELINE_VERSION | grep report.json | head -1)"

# Prompt to switch versions
echo ""
echo "⚠️  Please switch to candidate version ($CANDIDATE_VERSION)"
echo "   Then press ENTER to continue..."
read

# Run candidate
echo ""
echo "📊 Running candidate ($CANDIDATE_VERSION)..."
pnpm run-scenario run \
  --scenario "$SCENARIO" \
  --seed "$SEED" \
  --sessions "$SESSIONS" \
  --format json \
  --output "./reports/comparison/$CANDIDATE_VERSION"

CANDIDATE_REPORT="./reports/comparison/$CANDIDATE_VERSION/$(ls ./reports/comparison/$CANDIDATE_VERSION | grep report.json | head -1)"

# Generate comparison
echo ""
echo "📈 Generating comparison report..."
node -e "
const fs = require('fs');

const baseline = JSON.parse(fs.readFileSync('$BASELINE_REPORT', 'utf-8'));
const candidate = JSON.parse(fs.readFileSync('$CANDIDATE_REPORT', 'utf-8'));

console.log('\n## Performance Comparison\n');
console.log('| Metric | Baseline | Candidate | Delta |');
console.log('|--------|----------|-----------|-------|');

const bPerf = baseline.aggregateMetrics.performance;
const cPerf = candidate.aggregateMetrics.performance;

const durationDelta = ((cPerf.avgDuration - bPerf.avgDuration) / bPerf.avgDuration * 100).toFixed(1);
const p50Delta = ((cPerf.avgQueryLatency.p50 - bPerf.avgQueryLatency.p50) / bPerf.avgQueryLatency.p50 * 100).toFixed(1);
const p95Delta = ((cPerf.avgQueryLatency.p95 - bPerf.avgQueryLatency.p95) / bPerf.avgQueryLatency.p95 * 100).toFixed(1);

console.log(\`| Avg Duration | \${(bPerf.avgDuration/1000).toFixed(2)}s | \${(cPerf.avgDuration/1000).toFixed(2)}s | \${durationDelta > 0 ? '+' : ''}\${durationDelta}% |\`);
console.log(\`| Query Latency (p50) | \${bPerf.avgQueryLatency.p50.toFixed(0)}ms | \${cPerf.avgQueryLatency.p50.toFixed(0)}ms | \${p50Delta > 0 ? '+' : ''}\${p50Delta}% |\`);
console.log(\`| Query Latency (p95) | \${bPerf.avgQueryLatency.p95.toFixed(0)}ms | \${cPerf.avgQueryLatency.p95.toFixed(0)}ms | \${p95Delta > 0 ? '+' : ''}\${p95Delta}% |\`);

console.log('\n## Correctness Comparison\n');
console.log('| Metric | Baseline | Candidate | Delta |');
console.log('|--------|----------|-----------|-------|');

const bCorr = baseline.aggregateMetrics.correctness;
const cCorr = candidate.aggregateMetrics.correctness;

const entitiesDelta = ((cCorr.entitiesFoundRate - bCorr.entitiesFoundRate) / bCorr.entitiesFoundRate * 100).toFixed(1);
const relsDelta = ((cCorr.relationshipsFoundRate - bCorr.relationshipsFoundRate) / bCorr.relationshipsFoundRate * 100).toFixed(1);

console.log(\`| Entities Found | \${(bCorr.entitiesFoundRate*100).toFixed(1)}% | \${(cCorr.entitiesFoundRate*100).toFixed(1)}% | \${entitiesDelta > 0 ? '+' : ''}\${entitiesDelta}% |\`);
console.log(\`| Relationships Found | \${(bCorr.relationshipsFoundRate*100).toFixed(1)}% | \${(cCorr.relationshipsFoundRate*100).toFixed(1)}% | \${relsDelta > 0 ? '+' : ''}\${relsDelta}% |\`);

console.log('\n## Reliability Comparison\n');
console.log('| Metric | Baseline | Candidate | Delta |');
console.log('|--------|----------|-----------|-------|');

const bRel = baseline.aggregateMetrics.reliability;
const cRel = candidate.aggregateMetrics.reliability;

const successDelta = ((cRel.successRate - bRel.successRate) / bRel.successRate * 100).toFixed(1);

console.log(\`| Success Rate | \${(bRel.successRate*100).toFixed(1)}% | \${(cRel.successRate*100).toFixed(1)}% | \${successDelta > 0 ? '+' : ''}\${successDelta}% |\`);

// Regression detection
console.log('\n## Regression Detection\n');

const regressions = [];
if (parseFloat(durationDelta) > 10) regressions.push('⚠️  Performance regression: Duration increased by ' + durationDelta + '%');
if (parseFloat(p95Delta) > 15) regressions.push('⚠️  Performance regression: p95 latency increased by ' + p95Delta + '%');
if (parseFloat(entitiesDelta) < -5) regressions.push('⚠️  Correctness regression: Entity discovery decreased by ' + entitiesDelta + '%');
if (parseFloat(successDelta) < -5) regressions.push('⚠️  Reliability regression: Success rate decreased by ' + successDelta + '%');

if (regressions.length > 0) {
  regressions.forEach(r => console.log(r));
  process.exit(1);
} else {
  console.log('✅ No regressions detected');
}
"

echo ""
echo "✅ Comparison complete!"
echo "Reports saved to:"
echo "  - Baseline: ./reports/comparison/$BASELINE_VERSION/"
echo "  - Candidate: ./reports/comparison/$CANDIDATE_VERSION/"
