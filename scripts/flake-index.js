// Parse JUnit to compute flake index (failures that pass on retry)
const fs = require('fs');
const glob = require('glob');
const { XMLParser } = require('fast-xml-parser');
const parser = new XMLParser();
let total = 0,
  flaky = 0;
for (const f of glob.sync('reports/junit/**/*.xml')) {
  const xml = parser.parse(fs.readFileSync(f, 'utf8'));
  const suites = Array.isArray(xml.testsuites?.testsuite)
    ? xml.testsuites.testsuite
    : [xml.testsuites?.testsuite].filter(Boolean);
  for (const s of suites) {
    total += Number(s?.tests || 0);
    flaky += Number(s?.flaky || 0); // if your runner writes <flaky>
  }
}
const idx = total ? flaky / total : 0;
console.log(`flake_index=${idx}`);
if (idx > Number(process.env.FLAKE_BUDGET || 0.02)) process.exit(1);
