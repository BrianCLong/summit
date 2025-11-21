import { Report, RuleImpact, Summary } from "./types";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function renderSummary(summary: Summary): string {
  const blockDelta = percentFormatter.format(summary.block_rate_delta);
  const originalBlock = percentFormatter.format(summary.original_block_rate);
  const newBlock = percentFormatter.format(summary.new_block_rate);

  return `
    <section class="summary">
      <div class="card">
        <h3>Total Decisions</h3>
        <p>${summary.total_decisions.toLocaleString("en-US")}</p>
      </div>
      <div class="card">
        <h3>Block Rate</h3>
        <p>${originalBlock} → ${newBlock}</p>
      </div>
      <div class="card">
        <h3>Block Delta</h3>
        <p class="delta">${blockDelta}</p>
      </div>
      <div class="card">
        <h3>Latency Δ</h3>
        <p>${numberFormatter.format(summary.average_latency_delta_ms)} ms</p>
      </div>
      <div class="card">
        <h3>Canary Catches</h3>
        <p>${summary.false_negative_canary_catchers}</p>
      </div>
    </section>
  `;
}

function renderRuleImpacts(impacts: RuleImpact[]): string {
  if (impacts.length === 0) {
    return `<p>No rule impacts recorded.</p>`;
  }
  const rows = impacts
    .map((impact) => {
      return `
        <tr>
          <td><code>${impact.rule_id}</code></td>
          <td>${impact.matches}</td>
          <td>${impact.block_escalations}</td>
          <td>${impact.relaxations}</td>
          <td>${impact.resulting_action}</td>
          <td>${numberFormatter.format(impact.average_latency_ms)}</td>
        </tr>
      `;
    })
    .join("\n");

  return `
    <table class="impacts">
      <thead>
        <tr>
          <th>Rule</th>
          <th>Matches</th>
          <th>Escalations</th>
          <th>Relaxations</th>
          <th>Result Action</th>
          <th>Avg Latency (ms)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderSignatures(report: Report): string {
  if (!report.signatures || report.signatures.length === 0) {
    return "";
  }
  const rows = report.signatures
    .map(
      (signature) => `
        <tr>
          <td>${signature.key_id}</td>
          <td>${signature.algorithm}</td>
          <td><code>${signature.digest}</code></td>
          <td><code>${signature.signature}</code></td>
        </tr>
      `,
    )
    .join("\n");
  return `
    <section>
      <h2>Signatures</h2>
      <table class="signatures">
        <thead>
          <tr>
            <th>Key</th>
            <th>Algorithm</th>
            <th>Digest</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </section>
  `;
}

function escapeHTML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderDashboard(report: Report, recommendation?: string): string {
  const summary = renderSummary(report.summary);
  const impacts = renderRuleImpacts(report.rule_impacts);
  const signatures = renderSignatures(report);
  const recommendationBlock = recommendation
    ? `<section class="recommendation"><h2>Rollout Recommendation</h2><pre>${escapeHTML(
        recommendation,
      )}</pre></section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>PBS Report: ${report.policy.name} (${report.policy.version})</title>
    <style>
      body { font-family: "Inter", system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #f8fafc; }
      h1, h2, h3 { color: #38bdf8; }
      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
      .card { background: rgba(15, 23, 42, 0.8); padding: 1rem 1.25rem; border-radius: 0.75rem; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.45); }
      .card h3 { margin-top: 0; font-size: 0.95rem; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.75; }
      .card p { margin: 0.25rem 0 0; font-size: 1.4rem; font-weight: 600; }
      .card .delta { color: #fbbf24; }
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
      th { text-align: left; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.75; }
      td, th { padding: 0.75rem 0.5rem; border-bottom: 1px solid rgba(148, 163, 184, 0.2); }
      code { font-family: "Source Code Pro", monospace; }
      pre { background: rgba(15, 23, 42, 0.9); padding: 1rem; border-radius: 0.75rem; overflow-x: auto; }
      .recommendation { margin-top: 2rem; }
      .meta { display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.9rem; opacity: 0.85; }
      .meta span { display: inline-flex; align-items: center; gap: 0.5rem; }
      footer { margin-top: 3rem; font-size: 0.75rem; opacity: 0.6; }
    </style>
  </head>
  <body>
    <h1>Policy Backtest Report</h1>
    <div class="meta">
      <span><strong>Policy:</strong> ${report.policy.name} (${report.policy.version})</span>
      <span><strong>Run ID:</strong> <code>${report.deterministic_run_id}</code></span>
      <span><strong>History digest:</strong> <code>${report.inputs.history_digest}</code></span>
      <span><strong>Engine:</strong> v${report.engine_version}</span>
    </div>
    ${summary}
    <section>
      <h2>Rule Impact Overview</h2>
      ${impacts}
    </section>
    ${recommendationBlock}
    ${signatures}
    <footer>Generated by @summit/pbs-dashboard</footer>
  </body>
</html>`;
}
