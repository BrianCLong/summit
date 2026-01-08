import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'artifacts/path-budget');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'report.json');

async function main() {
  const isReleaseIntent = process.argv.includes('--release-intent');

  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`Report not found at ${REPORT_PATH}. Run scan_path_budgets.mjs first.`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const policy = report.policy;

  const rules = isReleaseIntent ? policy.release_intent : policy.normal;
  const intentName = isReleaseIntent ? 'Release Intent' : 'Normal';

  console.log(`Enforcing Path Budgets (${intentName})...`);
  console.log(`Limits: Max Chars=${rules.max_path_chars}, Max Depth=${rules.max_depth}`);

  const maxLen = report.stats.maxPathLength;
  const maxDepth = report.stats.maxPathDepth;

  let failed = false;
  const violations = [];

  if (maxLen > rules.max_path_chars) {
    violations.push(`Max path length ${maxLen} exceeds limit ${rules.max_path_chars} (Offender: ${report.stats.longestFile})`);
    failed = true;
  }

  if (maxDepth > rules.max_depth) {
    violations.push(`Max depth ${maxDepth} exceeds limit ${rules.max_depth} (Offender: ${report.stats.deepestFile})`);
    failed = true;
  }

  if (failed) {
    console.error('\n❌ Path Budget Violations Found:');
    violations.forEach(v => console.error(`  - ${v}`));

    if (rules.fail) {
      console.error('\nPolicy requires failure. Exiting with error.');
      process.exit(1);
    } else {
      console.warn('\nPolicy is warn-only. Continuing.');
    }
  } else {
    console.log('\n✅ No path budget violations.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
