import { rankOutcomes } from "./ranking.js";
import { ReplayReport } from "./types.js";

export function renderDashboard(report: ReplayReport): string {
  const ranked = rankOutcomes(report);
  const rows = ranked
    .map((outcome) => renderRow(outcome))
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Prompt Diff Impact Lab</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; background: #fafafa; }
      h1 { margin-bottom: 0.5rem; }
      table { border-collapse: collapse; width: 100%; margin-top: 1.5rem; }
      th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
      th { background: #f1f1f1; }
      tr:nth-child(even) { background: #fff; }
      .regression { color: #b30000; font-weight: 600; }
      .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; margin-left: 0.5rem; }
      .badge.regression { background: #ffe1e1; color: #b30000; }
      .badge.passed { background: #e8f5e9; color: #1b5e20; }
    </style>
  </head>
  <body>
    <h1>Prompt Diff Impact Lab</h1>
    <p><strong>Seed:</strong> ${report.seed}</p>
    <p>
      <strong>Total Risk:</strong> ${report.assessment.total_risk.toFixed(4)}<br />
      <strong>Coverage Delta:</strong> ${report.assessment.coverage_delta.toFixed(4)}
    </p>
    <table>
      <thead>
        <tr>
          <th>Case</th>
          <th>Taxonomy</th>
          <th>Business Impact</th>
          <th>Risk Contribution</th>
          <th>Baseline</th>
          <th>Candidate</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`;
}

function renderRow(outcome: ReturnType<typeof rankOutcomes>[number]): string {
  const regression = outcome.baseline.passed && !outcome.candidate.passed;
  const statusBadge = regression
    ? '<span class="badge regression">Regression</span>'
    : '<span class="badge passed">Pass</span>';
  return `<tr>
    <td>${outcome.case_id} ${statusBadge}</td>
    <td>${outcome.taxonomy}</td>
    <td>${outcome.business_impact.toFixed(2)}</td>
    <td>${outcome.risk_contribution.toFixed(4)}</td>
    <td>${renderRun(outcome.baseline)}</td>
    <td>${renderRun(outcome.candidate)}</td>
  </tr>`;
}

function renderRun(run: { passed: boolean; taxonomy: string | null; severity: number }): string {
  const badge = run.passed ? "✅" : "⚠️";
  const taxonomy = run.taxonomy ?? "passed";
  return `${badge} ${taxonomy} (sev ${run.severity.toFixed(2)})`;
}
