import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: tsx build_sector_outcomes_dashboard.ts <sector> <period>');
    process.exit(1);
  }

  const [sector, period] = args;
  const signalsPath = `dist/pilot-reporting/${sector}/${period}/signals.json`;
  const reportPath = `dist/pilot-reporting/${sector}/${period}/sponsor-report.json`;

  if (!fs.existsSync(signalsPath) || !fs.existsSync(reportPath)) {
    console.error('Missing input files');
    process.exit(1);
  }

  const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const dashboard = {
    title: `Sector Outcomes: ${sector.toUpperCase()}`,
    period,
    kpis: report.kpis,
    readiness_summary: {
      total: signals.total_runs,
      ready: signals.runs.filter((r: any) => r.status === 'READY').length,
      not_ready: signals.runs.filter((r: any) => r.status === 'NOT READY').length,
      top_reasons: {} as Record<string, number>
    }
  };

  signals.runs.forEach((r: any) => {
    if (r.reason_codes) {
      r.reason_codes.forEach((code: string) => {
        dashboard.readiness_summary.top_reasons[code] = (dashboard.readiness_summary.top_reasons[code] || 0) + 1;
      });
    }
  });

  const outDir = path.dirname(signalsPath);
  fs.writeFileSync(path.join(outDir, 'dashboard.json'), JSON.stringify(dashboard, null, 2));

  // HTML Dashboard (Simple)
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${dashboard.title}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .status-PASS { color: green; font-weight: bold; }
    .status-WARN { color: orange; font-weight: bold; }
    .status-FAIL { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${dashboard.title}</h1>
  <p>Period: ${period}</p>

  <h2>KPIs</h2>
  <table>
    <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
    ${dashboard.kpis.map((k: any) => `<tr><td>${k.name}</td><td>${k.value}%</td><td class="status-${k.status}">${k.status}</td></tr>`).join('')}
  </table>

  <h2>Readiness Summary</h2>
  <p>Ready: ${dashboard.readiness_summary.ready} / ${dashboard.readiness_summary.total}</p>

  <h3>Top Blocker Codes</h3>
  <ul>
    ${Object.entries(dashboard.readiness_summary.top_reasons).map(([code, count]) => `<li>${code}: ${count}</li>`).join('')}
  </ul>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'dashboard.html'), html);
  console.log(`Dashboard generated in ${outDir}`);
}

main();
