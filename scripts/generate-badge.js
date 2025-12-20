const fs = require('fs');
const path = require('path');

const resultsPath = path.join(process.cwd(), 'slo-results.json');
const outputPath = path.join(process.cwd(), 'slo-badge.json');

try {
  if (!fs.existsSync(resultsPath)) {
    console.error('slo-results.json not found. Run k6 test first.');
    // Create a dummy failing badge if missing
    fs.writeFileSync(outputPath, JSON.stringify({
        schemaVersion: 1,
        label: "Summit SLO",
        message: "Missing Data",
        color: "inactive"
    }));
    process.exit(0);
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const p95 = results.p95_latency.toFixed(0);
  const status = results.status;

  const badge = {
    schemaVersion: 1,
    label: "Summit SLO (p95)",
    message: `${p95}ms`,
    color: status === 'passing' ? "success" : "critical"
  };

  fs.writeFileSync(outputPath, JSON.stringify(badge, null, 2));
  console.log('Badge generated at', outputPath);

} catch (error) {
  console.error('Error generating badge:', error);
  process.exit(1);
}
