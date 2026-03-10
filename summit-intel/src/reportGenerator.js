export function toConsoleReport(report) {
  return [
    'Repository Intelligence',
    '-----------------------',
    `Modules: ${report.graph.modules.length}`,
    `High Risk Dependencies: ${report.dependencies.highRisk.length}`,
    `Architecture Drift Score: ${report.drift.driftScore}`,
    `CI Failure Probability: ${(report.risk.probability * 100).toFixed(1)}% (${report.risk.grade})`,
  ].join('\n');
}

export function toHtmlReport(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Summit Architecture Report</title>
</head>
<body>
  <h1>Repository Intelligence</h1>
  <ul>
    <li>Modules: ${report.graph.modules.length}</li>
    <li>Dependency Risk: ${report.dependencies.highRisk.length > 0 ? 'Elevated' : 'Low'}</li>
    <li>Architecture Drift: ${(report.drift.driftScore * 100).toFixed(2)}%</li>
    <li>CI Failure Risk: ${(report.risk.probability * 100).toFixed(1)}% (${report.risk.grade})</li>
  </ul>
</body>
</html>`;
}
