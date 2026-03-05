const fs = require('fs');
const path = require('path');

const artifactDir = path.join(process.cwd(), 'artifacts');
if (!fs.existsSync(artifactDir)) {
  console.log('No artifacts dir found, creating empty rollup');
  fs.writeFileSync('ci-rollup.json', JSON.stringify({ summary: "No data" }));
  process.exit(0);
}

const entries = fs.readdirSync(artifactDir);
const allData = [];

for (const entry of entries) {
  const dirPath = path.join(artifactDir, entry);
  if (fs.statSync(dirPath).isDirectory()) {
    const jsonPath = path.join(dirPath, 'run-meta.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        allData.push(data);
      } catch (err) {
        console.error(`Error reading ${jsonPath}`, err);
      }
    }
  }
}

const summary = {
  total_runs: allData.length,
  workflows: {}
};

for (const run of allData) {
  if (!summary.workflows[run.workflow]) {
    summary.workflows[run.workflow] = { count: 0, failures: 0, total_duration_ms: 0 };
  }
  const wf = summary.workflows[run.workflow];
  wf.count++;
  if (run.conclusion === 'failure') {
    wf.failures++;
  }
  if (run.jobs) {
    let wfDuration = 0;
    for (const job of run.jobs) {
        if (job.duration_ms) wfDuration += job.duration_ms;
    }
    wf.total_duration_ms += wfDuration;
  }
}

for (const [name, wf] of Object.entries(summary.workflows)) {
    wf.avg_duration_ms = wf.count > 0 ? Math.floor(wf.total_duration_ms / wf.count) : 0;
    wf.failure_rate = wf.count > 0 ? (wf.failures / wf.count).toFixed(2) : 0;
}

fs.writeFileSync('ci-rollup.json', JSON.stringify(summary, null, 2));

// Generate a CSV
let csv = 'Workflow,Runs,Failures,Failure Rate,Avg Duration (ms),Total Duration (ms)\n';
for (const [name, wf] of Object.entries(summary.workflows)) {
  csv += `"${name}",${wf.count},${wf.failures},${wf.failure_rate},${wf.avg_duration_ms},${wf.total_duration_ms}\n`;
}
fs.writeFileSync('ci-rollup.csv', csv);

console.log('Rollup complete');
