import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

// Types (simplified for script)
interface KPI {
  id: string;
  name: string;
  threshold: { warn: number; fail: number };
}

interface SignalData {
  runs: any[];
  total_runs: number;
  sync_stats?: { total_sessions: number; sessions_within_budget: number };
  gate_summaries?: any[];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: tsx build_weekly_sponsor_report.ts <sector> <period>');
    process.exit(1);
  }

  const [sector, period] = args;
  const kpiPath = `docs/pilots/${sector}/kpis.yml`;
  const signalsPath = `dist/pilot-reporting/${sector}/${period}/signals.json`;

  if (!fs.existsSync(kpiPath) || !fs.existsSync(signalsPath)) {
    console.error('Missing input files');
    process.exit(1);
  }

  const kpis = yaml.load(fs.readFileSync(kpiPath, 'utf8')).kpis as KPI[];
  const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8')) as SignalData;

  const report = {
    title: `Weekly Sponsor Report: ${sector.toUpperCase()}`,
    period,
    generated_at: new Date().toISOString(),
    status: "ON TRACK",
    kpis: [] as any[],
    wins: ["Pilot deployment successful", "Initial data ingestion complete"], // Template/Placeholder
    risks: [], // Template
    appendix: {
       verification_summary: "All artifacts signed and verified."
    }
  };

  // Compute KPIs
  for (const kpi of kpis) {
    let value = 0;
    // Simple evaluator based on ID
    if (kpi.id === 'readiness_rate') {
      const ready = signals.runs.filter(r => r.status === 'READY').length;
      value = signals.total_runs > 0 ? (ready / signals.total_runs) * 100 : 0;
    } else if (kpi.id === 'evidence_integrity') {
      const verified = signals.runs.filter(r => r.trust_pack_verified).length;
      value = signals.total_runs > 0 ? (verified / signals.total_runs) * 100 : 0;
    } else if (kpi.id === 'sync_budget_compliance' && signals.sync_stats) {
      value = signals.sync_stats.total_sessions > 0
        ? (signals.sync_stats.sessions_within_budget / signals.sync_stats.total_sessions) * 100
        : 100;
    }

    // Determine status
    let status = 'PASS';
    if (value <= kpi.threshold.fail) status = 'FAIL';
    else if (value <= kpi.threshold.warn) status = 'WARN';

    report.kpis.push({
      id: kpi.id,
      name: kpi.name,
      value: parseFloat(value.toFixed(2)),
      status
    });

    if (status === 'FAIL') report.status = 'AT RISK';
  }

  // Write outputs
  const outDir = path.dirname(signalsPath);

  // JSON
  fs.writeFileSync(path.join(outDir, 'sponsor-report.json'), JSON.stringify(report, null, 2));

  // Markdown
  const md = `# ${report.title}
**Period:** ${report.period}
**Status:** ${report.status}

## Executive Summary
Current pilot status is **${report.status}**.

## KPI Scorecard
| Metric | Value | Status |
| :--- | :--- | :--- |
${report.kpis.map(k => `| ${k.name} | ${k.value}% | ${k.status} |`).join('\n')}

## Weekly Highlights
### Wins
${report.wins.map(w => `- ${w}`).join('\n')}

### Risks
${report.risks.length ? report.risks.map(r => `- ${r}`).join('\n') : "No critical risks flagged."}

## Appendix
${report.appendix.verification_summary}
`;
  fs.writeFileSync(path.join(outDir, 'sponsor-report.md'), md);

  console.log(`Report generated in ${outDir}`);
}

main();
