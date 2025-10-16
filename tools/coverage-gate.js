const fs = require('fs');
const path = require('path');
const threshold = parseInt(process.argv[2] || '80', 10);
const file = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
if (!fs.existsSync(file)) {
  console.error('coverage-summary.json not found');
  process.exit(1);
}
const sum = JSON.parse(fs.readFileSync(file, 'utf8'));
const lines = sum.total.lines.pct || 0;
const funcs = sum.total.functions.pct || 0;
if (lines < threshold || funcs < threshold) {
  console.error(
    `Coverage gate failed: lines=${lines}%, functions=${funcs}% (< ${threshold}%)`,
  );
  process.exit(1);
}
console.log(
  `Coverage OK: lines=${lines}%, functions=${funcs}% (>= ${threshold}%)`,
);
