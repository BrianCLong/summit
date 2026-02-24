import fs from 'node:fs';
import path from 'node:path';

// Thresholds
const ALLOWED_QUALITY_REGRESSION = 0; // 0% regression allowed

// The gate logic
function validate(diffPath: string) {
  if (!fs.existsSync(diffPath)) {
    console.error('Diff artifact not found at ' + diffPath);
    process.exit(1);
  }

  const diff = JSON.parse(fs.readFileSync(diffPath, 'utf-8'));

  // Check quality regression
  const failedDelta = diff.deltas.tests_failed || 0;
  if (failedDelta > 0) {
    console.error(`❌ Quality Regression: Tests failed increased by ${failedDelta}`);
    process.exit(1);
  }

  const passedDelta = diff.deltas.tests_passed || 0;
  if (passedDelta < 0) {
     console.error(`❌ Quality Regression: Tests passed decreased by ${Math.abs(passedDelta)}`);
     process.exit(1);
  }

  // Check speed
  const durationDelta = diff.deltas.duration_seconds || 0;
  if (durationDelta > 0) {
    console.warn(`⚠️ Warning: Duration increased by ${durationDelta}s`);
  } else {
    console.log(`✅ Speed improved by ${Math.abs(durationDelta)}s`);
  }

  console.log('✅ Productivity Evidence Validated');
}

const args = process.argv.slice(2);
if (args.length >= 1) {
  validate(args[0]);
} else {
  console.error('Usage: tsx validate_productivity_evidence.ts <diff.json>');
  process.exit(1);
}
