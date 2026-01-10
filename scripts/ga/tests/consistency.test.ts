import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';

// Simple test harness
const TESTS = [
  {
    name: 'ga:status (plan)',
    cmd: 'npx tsx scripts/ga/status.ts --mode=plan --json',
    check: (output: string, json: any) => {
        // Since ga:status prints JSON *inside* the log stream when using our logger,
        // and we are capturing stdout, we need to extract the JSON block.
        // However, for this test harness, we can't easily parse mixed output.
        // Instead, we check the generated artifact file.

        // Find the artifact path in the output
        const match = output.match(/Status report saved to: (.*\.json)/);
        assert(match, 'Status report artifact not generated');
        const reportPath = match[1];
        assert(fs.existsSync(reportPath), 'Report file does not exist');
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

        assert(report.drift, 'Missing drift status');
        assert(report.evidence, 'Missing evidence status');
        assert(report.mergeTrain, 'Missing mergeTrain status');
    }
  },
  {
    name: 'pr:triage (plan)',
    cmd: 'npx tsx scripts/triage/pr-triage.ts --mode=plan --json',
    setup: () => {
        fs.writeFileSync('prs.json', JSON.stringify([{ number: 1, title: 'Test PR', author: { login: 'test' }, labels: [], checks: [], updatedAt: new Date().toISOString() }]));
    },
    cleanup: () => {
        if (fs.existsSync('prs.json')) fs.unlinkSync('prs.json');
    }
  },
  {
    name: 'evidence:generate (plan)',
    cmd: 'npx tsx scripts/compliance/generate_evidence.ts --mode=plan --json',
    check: (output: string) => {
        assert(output.includes('Evidence Generation'), 'Missing header');
        assert(output.includes('Mode: plan'), 'Missing mode');
    }
  }
];

async function runTests() {
  console.log('Running Consistency Tests...');
  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
      console.log(`[TEST] ${test.name}`);
      try {
          if (test.setup) test.setup();

          const output = execSync(test.cmd, { encoding: 'utf-8', stdio: 'pipe' });

          if (test.check) {
              test.check(output, {});
          }

          console.log(`  PASS`);
          passed++;
      } catch (e: any) {
          console.log(`  FAIL: ${e.message}`);
          console.log(e.stdout?.toString());
          console.log(e.stderr?.toString());
          failed++;
      } finally {
          if (test.cleanup) test.cleanup();
      }
  }

  console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
