import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const run = (command) => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    console.error(`Failed to execute command: ${command}`);
    return null;
  }
};

const getOpenPRs = () => {
  console.log("Fetching open PRs...");
  const json = run('gh pr list --state open --limit 50 --json number,title,author,url,createdAt,headRefName');
  return json ? JSON.parse(json) : [];
};

const getMergedPRs = (weeksAgo) => {
    const startDate = new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    console.log(`Fetching merged PRs from the last ${weeksAgo} weeks (since ${startDate})...`);
    const command = `gh search prs --merged-at ">=${startDate}" --limit 1000 --json number`;
    const json = run(command);
    return json ? JSON.parse(json) : [];
}

const generateDashboard = () => {
  const outputPath = path.resolve(process.cwd(), 'artifacts/orchestration/velocity_dashboard.md');
  const openPRs = getOpenPRs();
  const mergedLastWeek = getMergedPRs(1);
  const mergedLastFourWeeks = getMergedPRs(4);

  const historicalBaseline = Math.round(mergedLastFourWeeks.length / 4);

  const activeStreams = openPRs.map(pr => {
    const age = Math.floor((new Date() - new Date(pr.createdAt)) / (1000 * 60 * 60 * 24));
    const agent = pr.author.login === 'jules-bot' ? 'Jules' : 'Codex'; // Simple logic
    return `| \`${pr.headRefName}\` | **${agent}** | In Review | ${age} days | [#${pr.number}](${pr.url}) |`;
  }).join('\n');

  const dashboardContent = `
# Development Throughput Dashboard

*Generated on: ${new Date().toISOString()}*

---

## 🚀 Key Metrics

| Metric | Value | Trend |
|---|---|---|
| **Active Parallel Streams** | ${openPRs.length} | 🟢 |
| **PRs Merged (Last 7 Days)** | ${mergedLastWeek.length} | - |
| **Historical Baseline (PRs/Week)**| ${historicalBaseline} | - |
| **Merge Queue Depth** | ${openPRs.filter(pr => pr.labels?.some(l => l.name === 'merge-queue')).length} | 🟡 |
| **Estimated Time-to-Main** | *Not Implemented* | - |
| **Conflict Rate** | *Not Implemented (requires CI integration)* | - |
| **Quality Gate Pass Rate** | *Not Implemented (requires CI integration)* | - |

---

## 🏃 Active Parallel Work Streams

| Branch | Agent | Status | Age | PR |
|---|---|---|---|---|
${activeStreams}

---

## 🤖 Agent Utilization (Last 7 Days)

*This section is a placeholder and requires more sophisticated data collection.*

| Agent | Daily Limit | Actual Usage | Utilization |
|---|---|---|---|
| **Jules** | 10 tasks/day | *N/A* | *N/A* |
| **Codex** | 20 tasks/day | *N/A* | *N/A* |
| **Quick Wins**| 50 tasks/day | *N/A* | *N/A* |

`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, dashboardContent.trim());

  console.log(`Velocity dashboard generated successfully at ${outputPath}`);
};

generateDashboard();
