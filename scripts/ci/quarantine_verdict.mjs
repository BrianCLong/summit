import fs from 'fs';
import path from 'path';

// Usage: node quarantine_verdict.mjs [artifacts_root]
const root = process.argv[2] || 'ci_artifacts/quarantine';
let hardFails = 0;
let softFlakes = 0;

if (!fs.existsSync(root)) {
  console.log('No quarantine artifacts found. Assuming no suspect tests run.');
  process.exit(0);
}

// Iterate over each quarantined test run directory
const testDirs = fs.readdirSync(root).filter(f => fs.statSync(path.join(root, f)).isDirectory());

for (const testDir of testDirs) {
  // Check for status.txt or result.json
  const statusPath = path.join(root, testDir, 'status.txt');
  const resultPath = path.join(root, testDir, 'result.json');

  let failed = false;

  if (fs.existsSync(statusPath)) {
    // status.txt existence usually implies a hard crash/failure in the wrapper
    failed = true;
  } else if (fs.existsSync(resultPath)) {
    try {
      const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
      if (!result.success && result.numFailingTests > 0) {
        failed = true;
      }
    } catch (e) {
      console.error(`Failed to parse result for ${testDir}`, e);
      failed = true;
    }
  } else {
    // No result and no status likely means something went wrong with execution
    console.error(`No result found for ${testDir}`);
    failed = true;
  }

  if (failed) {
    hardFails++;
  } else {
    softFlakes++;
  }
}

const summary = { hardFails, softFlakes };
console.log(JSON.stringify(summary, null, 2));

// Generate a Markdown summary for PR comment
const mdSummaryPath = path.join('ci_artifacts', 'quarantine_summary.md');
let mdContent = '### Quarantine Lane Verdict\n\n';
mdContent += `| Metric | Count |\n|---|---|\n`;
mdContent += `| Hard Fails (Verified Real) | ${hardFails} |\n`;
mdContent += `| Soft Flakes (Passed in Isolation) | ${softFlakes} |\n\n`;

if (hardFails > 0) {
  mdContent += `**Result: BLOCKED**. Fix the confirmed failures.\n`;
} else if (softFlakes > 0) {
  mdContent += `**Result: PASSED (with flakes)**. Flaky tests were quarantined and passed on retry.\n`;
} else {
  mdContent += `**Result: PASSED**.\n`;
}

// Write summary if directory exists
if (fs.existsSync('ci_artifacts')) {
    fs.writeFileSync(mdSummaryPath, mdContent);
}

if (hardFails > 0) {
  process.exit(2); // Block GA
}
if (softFlakes > 0) {
  process.exit(0); // Allow GA but implies we caught flakes
}
process.exit(0);
