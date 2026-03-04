const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'eslint-report.json');

if (!fs.existsSync(reportPath)) {
  console.log('No eslint-report.json found, skipping fix.');
  process.exit(0);
}

try {
  const data = fs.readFileSync(reportPath, 'utf8');
  let results = JSON.parse(data);

  results = results.filter(file => file.errorCount > 0 || file.warningCount > 0);

  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`Filtered lint report saved to ${reportPath}`);
} catch (e) {
  console.error('Error processing eslint-report.json:', e);
}
