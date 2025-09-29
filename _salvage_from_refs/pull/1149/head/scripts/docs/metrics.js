const fs = require('fs');
const metrics = {
  timestamp: new Date().toISOString(),
  brokenLinks: Number(process.env.LINK_FAILS || 0),
  a11y: Number(process.env.A11Y_FAILS || 0),
  staleCount: JSON.parse(fs.readFileSync('docs-stale-report.json','utf8')).length,
};
fs.writeFileSync('docs-metrics.json', JSON.stringify(metrics, null, 2));
