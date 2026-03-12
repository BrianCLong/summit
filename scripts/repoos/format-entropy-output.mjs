#!/usr/bin/env node

/**
 * Reads raw entropy JSON from standard input and outputs an operator-readable format.
 *
 * Required output fields:
 * - entropy_score: number
 * - threshold: number
 * - verdict: string (PASS/WARN/FAIL)
 * - top_signals: array of strings
 * - recommended_action: string
 *
 * Plus a human-readable summary line suitable for CI log output.
 */

async function main() {
  const stdin = process.stdin;
  let rawData = '';

  for await (const chunk of stdin) {
    rawData += chunk;
  }

  if (!rawData.trim()) {
    console.error('Error: No input provided.');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(rawData);
  } catch (error) {
    console.error('Error parsing JSON input:', error.message);
    process.exit(1);
  }

  const result = formatOutput(data);

  // Print human-readable summary line to stderr (so it doesn't pollute JSON stdout if redirected)
  console.error(result.summaryLine);

  // Print operator-readable JSON output to stdout
  console.log(JSON.stringify(result.jsonOutput, null, 2));
}

function formatOutput(data) {
  // Extract values from raw data or provide defaults
  // Expected structure matches what frontier-entropy-monitor.mjs produces in its report
  const currentEntropy = typeof data.current_entropy === 'number' ? data.current_entropy : 0;

  const driftAnalysis = data.drift_analysis || {};
  const drift = typeof driftAnalysis.drift === 'number' ? driftAnalysis.drift : 0;
  const signal = driftAnalysis.signal || 'UNKNOWN';

  const interventions = data.interventions || [];

  let verdict = 'PASS';
  let threshold = 0.05; // WATCH threshold (default if not found)

  if (signal === 'DANGER') {
    verdict = 'FAIL';
    threshold = 0.15;
  } else if (signal === 'WARNING') {
    verdict = 'WARN';
    threshold = 0.10;
  } else if (signal === 'WATCH') {
    verdict = 'PASS'; // WATCH doesn't fail, just a heads up
    threshold = 0.05;
  }

  let topSignals = [];
  let recommendedAction = 'None';

  if (signal === 'INSUFFICIENT_DATA' || signal === 'INSUFFICIENT_RECENT_DATA') {
    topSignals.push('Insufficient data for drift analysis.');
    verdict = 'PASS';
  } else {
    topSignals.push(`Entropy drift: ${drift >= 0 ? '+' : ''}${drift.toFixed(3)}`);
  }

  if (interventions.length > 0) {
    for (const action of interventions) {
      topSignals.push(`[${action.priority.toUpperCase()}] ${action.action}: ${action.description}`);
    }
    recommendedAction = interventions[0].action.toUpperCase(); // Pick the top priority action
  } else if (signal === 'STABLE') {
    recommendedAction = 'Continue normal operations.';
  }

  const jsonOutput = {
    entropy_score: currentEntropy,
    threshold: threshold,
    verdict: verdict,
    top_signals: topSignals,
    recommended_action: recommendedAction
  };

  const summaryLine = `[ENTROPY] ${verdict} - Score: ${currentEntropy.toFixed(3)} | Drift: ${drift >= 0 ? '+' : ''}${drift.toFixed(3)} | Trend: ${signal}`;

  return { jsonOutput, summaryLine };
}

// Export for testing
export { formatOutput };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
