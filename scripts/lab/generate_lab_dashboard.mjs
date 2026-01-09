import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const runsRoot = path.join(repoRoot, 'artifacts/lab/runs');
const dashboardPath = path.join(repoRoot, 'artifacts/lab/LAB_DASHBOARD.md');

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const getRunNotes = async (runDir) => {
  try {
    const content = await fs.readFile(path.join(runDir, 'run_log.md'), 'utf8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const tagged = lines.filter(
      (line) => line.startsWith('TODO') || line.startsWith('- TODO') || line.includes('NOTE'),
    );
    return (tagged.length ? tagged : lines.slice(0, 3)).slice(0, 3);
  } catch (error) {
    return [];
  }
};

const collectRuns = async () => {
  const recipes = await fs.readdir(runsRoot, { withFileTypes: true }).catch(() => []);
  const runs = [];

  for (const recipeDir of recipes) {
    if (!recipeDir.isDirectory()) {
      continue;
    }
    const recipePath = path.join(runsRoot, recipeDir.name);
    const entries = await fs.readdir(recipePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const runPath = path.join(recipePath, entry.name);
      try {
        const metrics = await readJson(path.join(runPath, 'metrics.json'));
        const notes = await getRunNotes(runPath);
        runs.push({
          recipeSlug: recipeDir.name,
          runPath,
          metrics,
          notes,
        });
      } catch (error) {
        // Skip incomplete runs.
      }
    }
  }
  return runs;
};

const formatDate = (iso) => new Date(iso).toISOString().split('T')[0];

const main = async () => {
  const runs = await collectRuns();
  runs.sort((a, b) => (a.metrics.runId > b.metrics.runId ? -1 : 1));

  const latestByRecipe = new Map();
  for (const run of runs) {
    if (!latestByRecipe.has(run.metrics.recipeId)) {
      latestByRecipe.set(run.metrics.recipeId, run);
    }
  }

  const latestRows = Array.from(latestByRecipe.values()).map((run) => {
    const latency = run.metrics.pipelineMetrics
      ?.map((metric) => metric.latencyMs)
      .reduce((sum, value) => sum + value, 0);
    const avgLatency = latency
      ? Math.round(latency / run.metrics.pipelineMetrics.length)
      : 0;
    return `| ${run.metrics.recipeId} | ${formatDate(run.metrics.runId)} | ${run.metrics.profile} | ${run.metrics.datasets.length} | ${avgLatency}ms |`;
  });

  const historyRows = runs.map((run) => {
    const metricSnapshot = run.metrics.evaluationMetrics
      ?.map((metric) => `${metric.id}: ${metric.value}`)
      .join(', ');
    return `| ${run.metrics.recipeId} | ${formatDate(run.metrics.runId)} | ${metricSnapshot || 'n/a'} |`;
  });

  const notesSection = Array.from(latestByRecipe.values())
    .map((run) => {
      if (!run.notes.length) {
        return `- ${run.metrics.recipeId}: (no notes)`;
      }
      return `- ${run.metrics.recipeId}: ${run.notes.join(' | ')}`;
    })
    .join('\n');

  const markdown = `# Summit Intelligence Lab Dashboard\n\n## Latest Runs\n\n| Recipe | Last Run | Profile | Datasets | Avg Pipeline Latency |\n| --- | --- | --- | --- | --- |\n${latestRows.join('\n') || '| (none) | | | | |'}\n\n## Metrics Over Time\n\n| Recipe | Run Date | Metrics |\n| --- | --- | --- |\n${historyRows.join('\n') || '| (none) | | |'}\n\n## Notes\n\n${notesSection || '- No run notes available.'}\n`;

  await fs.mkdir(path.dirname(dashboardPath), { recursive: true });
  await fs.writeFile(dashboardPath, markdown);

  console.log(`Lab dashboard generated: ${path.relative(repoRoot, dashboardPath)}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
