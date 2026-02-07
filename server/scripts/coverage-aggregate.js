const fs = require('fs');
const path = require('path');

const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
const THRESHOLD = 80;

if (!fs.existsSync(coveragePath)) {
  console.error(`Coverage summary not found at ${coveragePath}`);
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const total = coverage.total;

let failed = false;

['lines', 'statements', 'functions', 'branches'].forEach(key => {
  const pct = total[key].pct;
  if (pct < THRESHOLD) {
    console.error(`Coverage for ${key} (${pct}%) is below threshold (${THRESHOLD}%)`);
    failed = true;
  } else {
    console.log(`Coverage for ${key} (${pct}%) is acceptable`);
  }
});

if (failed) {
  process.exit(1);
}
