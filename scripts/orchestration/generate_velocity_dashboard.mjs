import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const DEFAULTS = {
  prDataFile: 'prs.json',
  backlogFile: 'artifacts/orchestration/backlog_analysis.json',
  heuristicsFile: 'scripts/orchestration/routing_heuristics.yml',
  outputFile: 'artifacts/orchestration/VELOCITY_DASHBOARD.md',
};

const argv = process.argv.slice(2);
const args = new Map();
for (const arg of argv) {
  if (!arg.startsWith('--')) continue;
  const [key, value] = arg.slice(2).split('=');
  args.set(key, value ?? true);
}

const resolvePath = (value) => path.resolve(process.cwd(), value);

const readJsonFile = async (filePath) => {
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents);
};

const readYamlFile = async (filePath) => {
  const contents = await fs.readFile(filePath, 'utf8');
  return yaml.load(contents);
};

const safeReadJson = async (filePath, fallback) => {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
};

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
};

const parseDate = (value) => (value ? new Date(value) : null);

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const extractModules = (paths, heuristics) => {
  const modules = new Set();
  for (const module of heuristics.modules ?? []) {
    if (
      paths.some((filePath) =>
        module.paths?.some((modulePath) => filePath.startsWith(modulePath)),
      )
    ) {
      modules.add(module.name);
    }
  }
  if (modules.size === 0) {
    modules.add('general');
  }
  return Array.from(modules);
};

const classifyBlockers = (labels) => {
  const normalized = labels.map((label) => label.toLowerCase());
  const ciIndicators = ['ci', 'pipeline', 'gate', 'build', 'test', 'lint'];
  const governanceIndicators = ['governance', 'policy', 'compliance', 'security'];
  const reviewIndicators = ['review', 'needs-review', 'awaiting-review'];

  const ciBlocked = normalized.some((label) =>
    ciIndicators.some((keyword) => label.includes(keyword)),
  );
  const governanceBlocked = normalized.some((label) =>
    governanceIndicators.some((keyword) => label.includes(keyword)),
  );
  const reviewBlocked = normalized.some((label) =>
    reviewIndicators.some((keyword) => label.includes(keyword)),
  );

  return { ciBlocked, governanceBlocked, reviewBlocked };
};

const main = async () => {
  const prDataFile = args.get('pr-data') || DEFAULTS.prDataFile;
  const backlogFile = args.get('backlog') || DEFAULTS.backlogFile;
  const heuristicsFile = args.get('heuristics') || DEFAULTS.heuristicsFile;
  const outputFile = args.get('output') || DEFAULTS.outputFile;

  const [prPayload, backlog, heuristics] = await Promise.all([
    safeReadJson(resolvePath(prDataFile), { items: [] }),
    safeReadJson(resolvePath(backlogFile), { tasks: [] }),
    readYamlFile(resolvePath(heuristicsFile)),
  ]);

  const items = Array.isArray(prPayload)
    ? prPayload
    : prPayload.items || prPayload.pull_requests || [];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let mergedLast7 = 0;
  let mergedLast30 = 0;
  const cycleTimesHours = [];
  let multiModuleCount = 0;
  let singleModuleCount = 0;
  let ciBlockedCount = 0;
  let governanceBlockedCount = 0;
  let reviewBlockedCount = 0;

  for (const pr of items) {
    const mergedAt = parseDate(pr.merged_at ?? pr.mergedAt);
    const createdAt = parseDate(pr.created_at ?? pr.createdAt);
    const closedAt = parseDate(pr.closed_at ?? pr.closedAt);
    const labels = normalizeArray(pr.labels ?? pr.labelNames ?? []).map((label) =>
      String(label),
    );
    const files = normalizeArray(pr.files ?? pr.changed_files ?? pr.paths ?? []);

    if (mergedAt) {
      if (mergedAt >= sevenDaysAgo) mergedLast7 += 1;
      if (mergedAt >= thirtyDaysAgo) mergedLast30 += 1;
    }

    const endTime = mergedAt || closedAt;
    if (createdAt && endTime) {
      const duration = (endTime.getTime() - createdAt.getTime()) / 36e5;
      if (Number.isFinite(duration)) {
        cycleTimesHours.push(duration);
      }
    }

    const modules = extractModules(files, heuristics);
    if (modules.length > 1) {
      multiModuleCount += 1;
    } else {
      singleModuleCount += 1;
    }

    const blockers = classifyBlockers(labels);
    if (blockers.ciBlocked) ciBlockedCount += 1;
    if (blockers.governanceBlocked) governanceBlockedCount += 1;
    if (blockers.reviewBlocked) reviewBlockedCount += 1;
  }

  const totalPrs = items.length || 1;
  const medianCycleTime = median(cycleTimesHours);

  const lowRiskTasks = backlog.tasks.filter((task) => {
    const recommendation = task.agent_recommendation ?? {};
    return recommendation.risk === 'low' && recommendation.agent !== 'manual';
  });

  const dashboard = [
    '# Development Velocity Dashboard',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Throughput',
    `- PRs merged in last 7 days: ${mergedLast7}`,
    `- PRs merged in last 30 days: ${mergedLast30}`,
    `- Median PR cycle time (hours): ${
      medianCycleTime ? medianCycleTime.toFixed(1) : 'Intentionally constrained'
    }`,
    '',
    '## Parallelism Quality',
    `- % multi-module PRs: ${((multiModuleCount / totalPrs) * 100).toFixed(1)}%`,
    `- % single-module PRs: ${((singleModuleCount / totalPrs) * 100).toFixed(1)}%`,
    '',
    '## Blockers',
    `- % blocked on CI: ${((ciBlockedCount / totalPrs) * 100).toFixed(1)}%`,
    `- % blocked on governance: ${((
      governanceBlockedCount / totalPrs
    ) * 100).toFixed(1)}%`,
    `- % blocked on review: ${((reviewBlockedCount / totalPrs) * 100).toFixed(1)}%`,
    '',
    '## Parallelization Potential',
    `- Low-risk parallelizable tasks: ${lowRiskTasks.length}`,
    '',
    '## Notes',
    '- CI artifacts and stabilization signals are deferred pending availability of PR metadata feeds.',
  ];

  await fs.mkdir(path.dirname(resolvePath(outputFile)), { recursive: true });
  await fs.writeFile(resolvePath(outputFile), dashboard.join('\n'));
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
