const fs = require('fs');
const summary = JSON.parse(
  fs.readFileSync('coverage/coverage-summary.json', 'utf8'),
);
const floor = Number(process.env.COVERAGE_FLOOR || 0.8);
const pct = summary.total.statements.pct / 100;
console.log(`coverage=${pct}`);
if (pct < floor) {
  console.error(`❌ Coverage ${pct} < ${floor}`);
  process.exit(1);
}
