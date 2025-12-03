import { kubeBenchmarkValidator } from '../src/security/KubeBenchmarkValidator.js';
import logger from '../src/utils/logger.js';

// Setup basic console logger for script if main logger isn't configured for CLI
if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = 'info';
}

async function runBenchmarks() {
  console.log('Running Kubernetes Security Benchmarks...');

  // CIS Benchmark
  console.log('\n--- CIS Benchmark ---');
  try {
    const cisResult = await kubeBenchmarkValidator.runCisBenchmark();
    console.log(`Status: ${cisResult.status.toUpperCase()}`);
    console.log(`Score: ${cisResult.score.toFixed(2)}%`);
    console.log(`Passed: ${cisResult.passedChecks}/${cisResult.totalChecks}`);
    if (cisResult.items.filter(i => i.status === 'fail').length > 0) {
      console.log('Failed Checks:');
      cisResult.items.filter(i => i.status === 'fail').forEach(item => {
        console.log(`  [${item.severity?.toUpperCase()}] ${item.id}: ${item.description}`);
        if (item.remediation) console.log(`    Remediation: ${item.remediation}`);
      });
    }
  } catch (error) {
    console.error('Failed to run CIS Benchmark:', error);
  }

  // NSA Benchmark
  console.log('\n--- NSA/CISA Benchmark ---');
  try {
    const nsaResult = await kubeBenchmarkValidator.runNsaBenchmark();
    console.log(`Status: ${nsaResult.status.toUpperCase()}`);
    console.log(`Score: ${nsaResult.score.toFixed(2)}%`);
    console.log(`Passed: ${nsaResult.passedChecks}/${nsaResult.totalChecks}`);
    if (nsaResult.items.filter(i => i.status === 'fail').length > 0) {
      console.log('Failed Checks:');
      nsaResult.items.filter(i => i.status === 'fail').forEach(item => {
        console.log(`  [${item.severity?.toUpperCase()}] ${item.id}: ${item.description}`);
        if (item.remediation) console.log(`    Remediation: ${item.remediation}`);
      });
    }
  } catch (error) {
    console.error('Failed to run NSA Benchmark:', error);
  }
}

runBenchmarks().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
