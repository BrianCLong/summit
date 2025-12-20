import { readFileSync, writeFileSync } from "fs";
import path from "path";

type MetricSummary = {
  average: number;
  by_query: Record<string, number>;
};

type DashboardPayload = {
  summary: {
    baseline_version: string;
    candidate_version: string;
    metrics: {
      k_values: number[];
      baseline: {
        exposure: { ratio: number; max_gap: number; per_group: Record<string, number> };
        fairness: Record<string, MetricSummary>;
        coverage: Record<string, MetricSummary>;
      };
      candidate: {
        exposure: { ratio: number; max_gap: number; per_group: Record<string, number> };
        fairness: Record<string, MetricSummary>;
        coverage: Record<string, MetricSummary>;
      };
      alerts: Array<Record<string, unknown>>;
    };
    explanations: Array<{
      query_id: string;
      doc_id: string;
      rank_shift: number;
      shap_contributions: Record<string, number>;
      ablation_effects: Record<string, number>;
    }>;
  };
  alerts: Array<Record<string, unknown>>;
};

type CliArgs = {
  input: string;
  output: string;
};

function parseArgs(argv: string[]): CliArgs {
  let input = "";
  let output = path.resolve(process.cwd(), "dashboard.html");
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--input" && i + 1 < argv.length) {
      input = path.resolve(process.cwd(), argv[++i]);
    } else if (token === "--output" && i + 1 < argv.length) {
      output = path.resolve(process.cwd(), argv[++i]);
    }
  }
  if (!input) {
    throw new Error("Missing --input parameter pointing to dashboard JSON payload");
  }
  return { input, output };
}

function loadPayload(filePath: string): DashboardPayload {
  const raw = readFileSync(filePath, "utf8");
  const payload = JSON.parse(raw);
  return payload as DashboardPayload;
}

function createHtml(payload: DashboardPayload): string {
  const summary = payload.summary;
  const metrics = summary.metrics;
  const kValues = metrics.k_values;
  const fairnessSeries = kValues.map((k) => ({
    k,
    baseline: metrics.baseline.fairness[String(k)].average,
    candidate: metrics.candidate.fairness[String(k)].average,
  }));
  const coverageSeries = kValues.map((k) => ({
    k,
    baseline: metrics.baseline.coverage[String(k)].average,
    candidate: metrics.candidate.coverage[String(k)].average,
  }));
  const alerts = payload.alerts ?? [];
  const explanations = summary.explanations.slice(0, 5);

  const dataScript = JSON.stringify({ fairnessSeries, coverageSeries, alerts, explanations, summary }, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>XRA Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #e2e8f0; }
    h1, h2, h3 { color: #38bdf8; }
    section { margin-bottom: 32px; }
    .card { background: #1e293b; padding: 16px 20px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.4); }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #334155; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .badge.high { background: #ef4444; color: #fff; }
    .badge.medium { background: #f97316; color: #fff; }
    .badge.low { background: #facc15; color: #000; }
    canvas { max-width: 600px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
    code { background: rgba(148, 163, 184, 0.2); padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <header>
    <h1>Explainable Ranking Auditor Dashboard</h1>
    <p>Baseline: <strong>${summary.baseline_version}</strong> vs Candidate: <strong>${summary.candidate_version}</strong></p>
  </header>
  <section class="grid">
    <div class="card">
      <h2>Exposure Disparity</h2>
      <p>Baseline ratio: ${metrics.baseline.exposure.ratio.toFixed(3)} | Candidate ratio: ${metrics.candidate.exposure.ratio.toFixed(3)}</p>
      <p>Per-group exposure (candidate):</p>
      <table>
        <thead><tr><th>Group</th><th>Exposure</th></tr></thead>
        <tbody>
          ${Object.entries(metrics.candidate.exposure.per_group).map(([group, value]) => `<tr><td>${group}</td><td>${value.toFixed(3)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="card">
      <h2>Alerts</h2>
      <ul>
        ${alerts.length ? alerts.map((alert) => {
          const severity = String(alert.severity || 'info').toLowerCase();
          return `<li><span class="badge ${severity}">${severity}</span> <code>${alert.type}</code> - ${alert.message}</li>`;
        }).join('') : '<li>No alerts triggered.</li>'}
      </ul>
    </div>
  </section>
  <section class="grid">
    <div class="card">
      <h2>Fairness@k</h2>
      <canvas id="fairnessChart" width="600" height="360"></canvas>
    </div>
    <div class="card">
      <h2>Coverage@k</h2>
      <canvas id="coverageChart" width="600" height="360"></canvas>
    </div>
  </section>
  <section>
    <div class="card">
      <h2>Top Rank Shift Explanations</h2>
      ${explanations.map((item) => {
        const topContrib = Object.entries(item.shap_contributions)
          .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
          .slice(0, 3)
          .map(([feature, value]) => `<li><strong>${feature}</strong>: ${Number(value).toFixed(4)}</li>`)
          .join('');
        return `<article style="margin-bottom:16px;">
          <h3>Query ${item.query_id} – Document ${item.doc_id}</h3>
          <p>Rank shift: ${item.rank_shift > 0 ? '+' : ''}${item.rank_shift}</p>
          <h4>SHAP-lite drivers</h4>
          <ul>${topContrib || '<li>No drivers available.</li>'}</ul>
        </article>`;
      }).join('')}
    </div>
  </section>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" integrity="sha384-BWw7J5+BzA3+OeFZoai1AHrqvwQuC5/uwXugJbMIngGgP9myuXsJG6WE4Prp+Pkg" crossorigin="anonymous"></script>
  <script>
    const payload = ${dataScript};
    const fairnessCtx = document.getElementById('fairnessChart').getContext('2d');
    const coverageCtx = document.getElementById('coverageChart').getContext('2d');
    const fairnessLabels = payload.fairnessSeries.map(item => `k=${item.k}`);
    const fairnessBaseline = payload.fairnessSeries.map(item => item.baseline);
    const fairnessCandidate = payload.fairnessSeries.map(item => item.candidate);
    new Chart(fairnessCtx, {
      type: 'line',
      data: {
        labels: fairnessLabels,
        datasets: [
          { label: 'Baseline', data: fairnessBaseline, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.2)', tension: 0.3 },
          { label: 'Candidate', data: fairnessCandidate, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.2)', tension: 0.3 }
        ]
      },
      options: { scales: { y: { min: 0, max: 1 } } }
    });
    const coverageLabels = payload.coverageSeries.map(item => `k=${item.k}`);
    const coverageBaseline = payload.coverageSeries.map(item => item.baseline);
    const coverageCandidate = payload.coverageSeries.map(item => item.candidate);
    new Chart(coverageCtx, {
      type: 'line',
      data: {
        labels: coverageLabels,
        datasets: [
          { label: 'Baseline', data: coverageBaseline, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.2)', tension: 0.3 },
          { label: 'Candidate', data: coverageCandidate, borderColor: '#facc15', backgroundColor: 'rgba(250,204,21,0.2)', tension: 0.3 }
        ]
      },
      options: { scales: { y: { min: 0, max: 1 } } }
    });
  </script>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv);
  const payload = loadPayload(args.input);
  const html = createHtml(payload);
  writeFileSync(args.output, html, "utf8");
  console.log(`Dashboard written to ${args.output}`);
}

main();
