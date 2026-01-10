import fs from 'fs';
import path from 'path';

// Usage: node mark_flakes.mjs <jest-json-output>
const reportPath = process.argv[2];

if (!reportPath || !fs.existsSync(reportPath)) {
  console.error('Usage: node mark_flakes.mjs <jest-json-output>');
  process.exit(1);
}

const content = fs.readFileSync(reportPath, 'utf8');
let input;
try {
  input = JSON.parse(content);
} catch (e) {
  console.error('Failed to parse JSON input:', e.message);
  process.exit(1);
}

// In standard Jest JSON output, 'testResults' contains per-file results.
// We want to identify test files that had at least one failure.
const suspectFiles = input.testResults
  .filter(tr => tr.status === 'failed' || tr.numFailingTests > 0)
  .map(tr => tr.name);

// Deduplicate if necessary (though map return should be unique per file in Jest output)
const uniqueSuspects = [...new Set(suspectFiles)];

// Use ci_artifacts to avoid colliding with committed artifacts/
const artifactsDir = 'ci_artifacts';
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(artifactsDir, 'suspect-tests.json'),
  JSON.stringify(uniqueSuspects, null, 2)
);

console.log(`Marked ${uniqueSuspects.length} suspect test files.`);
