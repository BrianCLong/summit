import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Helper to get week number (ISO)
function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return [d.getUTCFullYear(), weekNo];
}

const buildWeeklyReport = () => {
  try {
    const policyPath = 'ci/governance-okrs.yml';
    const policy = yaml.load(fs.readFileSync(policyPath, 'utf8')) as any;
    const quarterId = policy.quarter_id;
    const okrStatusPath = `dist/okrs/${quarterId}/okr-status.json`;

    if (!fs.existsSync(okrStatusPath)) {
      throw new Error(`OKR Status file not found: ${okrStatusPath}`);
    }

    const currentStatus = JSON.parse(fs.readFileSync(okrStatusPath, 'utf8'));

    // Determine Weekly Period
    const now = new Date();
    const [year, week] = getWeekNumber(now);
    const periodId = `${year}-W${week}`;

    const weeklyDir = `dist/okrs/${quarterId}/weekly/${periodId}`;
    fs.mkdirSync(weeklyDir, { recursive: true });

    const trendPath = `dist/okrs/${quarterId}/trend.json`;
    let trendData: any[] = [];
    if (fs.existsSync(trendPath)) {
        trendData = JSON.parse(fs.readFileSync(trendPath, 'utf8'));
    }

    const report: any = {
        period_id: periodId,
        generated_at: new Date().toISOString(),
        status_summary: currentStatus.overall_status,
        metrics: currentStatus.results,
        deltas: {} as Record<string, any>
    };

    // Calculate deltas
    const lastEntry = trendData.length > 0 ? trendData[trendData.length - 1] : null;
    if (lastEntry) {
        currentStatus.results.forEach((r: any) => {
            const prev = lastEntry.metrics.find((p: any) => p.metric_id === r.metric_id);
            if (prev) {
                report.deltas[r.metric_id] = {
                    prev_value: prev.current_value,
                    change: (typeof r.current_value === 'number' && typeof prev.current_value === 'number') ? r.current_value - prev.current_value : 'N/A',
                    status_change: prev.status !== r.status ? `${prev.status} -> ${r.status}` : 'SAME'
                };
            }
        });
    }

    // Update Trend
    trendData.push({
        period_id: periodId,
        timestamp: report.generated_at,
        overall_status: report.status_summary,
        metrics: report.metrics
    });

    // Write Artifacts
    fs.writeFileSync(path.join(weeklyDir, 'weekly-report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(trendPath, JSON.stringify(trendData, null, 2)); // Update main trend file

    // MD Report
    let md = `# Weekly Governance OKR Report (${periodId})\n\n`;
    md += `**Quarter:** ${quarterId}\n`;
    md += `**Status:** ${report.status_summary}\n\n`;

    md += `## Changes this Week\n`;
    if (Object.keys(report.deltas).length > 0) {
        md += `| Metric | Previous | Current | Delta | Status Change |\n`;
        md += `|---|---|---|---|---|\n`;
        for (const [mid, delta] of Object.entries(report.deltas) as any) {
             const d = delta as any;
             md += `| ${mid} | ${d.prev_value} | ${report.metrics.find((m:any) => m.metric_id === mid).current_value} | ${d.change} | ${d.status_change} |\n`;
        }
    } else {
        md += `_No previous data for comparison._\n`;
    }

    md += `\n## Full Status\n`;
    md += `| Metric | Target | Current | Status | Owner |\n`;
    md += `|---|---|---|---|---|\n`;
    report.metrics.forEach((r: any) => {
        const icon = r.status === 'ON_TRACK' ? '🟢' : (r.status === 'OFF_TRACK' ? '🔴' : '🟡');
        md += `| ${r.metric_id} | ${r.direction} ${r.target} | ${r.current_value} | ${icon} ${r.status} | ${r.owner} |\n`;
    });

    fs.writeFileSync(path.join(weeklyDir, 'weekly-report.md'), md);
    console.log(`Weekly report generated in ${weeklyDir}`);

  } catch (e) {
    console.error('Weekly report failed:', e);
    process.exit(1);
  }
};

buildWeeklyReport();
