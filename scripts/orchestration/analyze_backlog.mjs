import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const DEFAULTS = {
  taskFile: '.agentic-tasks.yaml',
  labelsFile: 'artifacts/orchestration/github_labels.json',
  projectFile: 'artifacts/orchestration/project_board.json',
  heuristicsFile: 'scripts/orchestration/routing_heuristics.yml',
  outputFile: 'artifacts/orchestration/backlog_analysis.json',
};

const argv = process.argv.slice(2);
const args = new Map();
for (const arg of argv) {
  if (!arg.startsWith('--')) continue;
  const [key, value] = arg.slice(2).split('=');
  args.set(key, value ?? true);
}

const resolvePath = (value) => path.resolve(process.cwd(), value);

const readYamlFile = async (filePath) => {
  const contents = await fs.readFile(filePath, 'utf8');
  return yaml.load(contents);
};

const readJsonFile = async (filePath) => {
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents);
};

const safeReadJson = async (filePath) => {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const safeReadYaml = async (filePath) => {
  try {
    return await readYamlFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
};

const normalizeLabels = (value) =>
  normalizeArray(value).map((label) => String(label).toLowerCase());

const normalizePaths = (value) => normalizeArray(value).map(String);

const pickFirst = (values) => values.find(Boolean) ?? null;

const extractTasks = ({ agenticTasks, labelsPayload, projectPayload }) => {
  const tasks = [];

  if (agenticTasks && Array.isArray(agenticTasks.tasks)) {
    for (const item of agenticTasks.tasks) {
      tasks.push({
        id: item.id ?? item.task_id ?? item.key ?? `task-${tasks.length + 1}`,
        title: item.title ?? item.summary ?? 'Untitled task',
        labels: normalizeLabels(item.labels ?? item.tags),
        paths: normalizePaths(item.paths ?? item.touched_paths),
        source: 'agentic-tasks',
      });
    }
  }

  const mergePayload = (payload, source) => {
    if (!payload) return;
    const entries = Array.isArray(payload)
      ? payload
      : payload.tasks || payload.items || [];
    for (const item of entries) {
      const id = item.id ?? item.key ?? item.number ?? item.issue;
      if (!id) continue;
      const existing = tasks.find((task) => task.id === id);
      const labels = normalizeLabels(item.labels ?? item.tags);
      const paths = normalizePaths(item.paths ?? item.touched_paths);
      if (existing) {
        existing.labels = [...new Set([...existing.labels, ...labels])];
        existing.paths = [...new Set([...existing.paths, ...paths])];
        existing.title = pickFirst([existing.title, item.title, item.summary]);
        existing.source = `${existing.source},${source}`;
      } else {
        tasks.push({
          id,
          title: item.title ?? item.summary ?? 'Untitled task',
          labels,
          paths,
          source,
        });
      }
    }
  };

  mergePayload(labelsPayload, 'labels');
  mergePayload(projectPayload, 'project');

  return tasks;
};

const matchesKeyword = (value, keyword) =>
  value.includes(keyword.toLowerCase());

const classifyTask = (task, heuristics) => {
  const haystack = `${task.title} ${task.labels.join(' ')}`.toLowerCase();
  for (const [bucket, rule] of Object.entries(heuristics.classifications)) {
    const keywords = normalizeArray(rule.keywords).map((keyword) =>
      String(keyword).toLowerCase(),
    );
    if (keywords.some((keyword) => matchesKeyword(haystack, keyword))) {
      return bucket;
    }
  }
  return 'feature/UX';
};

const inferModule = (task, heuristics) => {
  for (const module of heuristics.modules ?? []) {
    const matchedByPath = normalizePaths(task.paths).some((taskPath) =>
      module.paths?.some((modulePath) => taskPath.startsWith(modulePath)),
    );
    if (matchedByPath) return module.name;
    const haystack = `${task.title} ${task.labels.join(' ')}`.toLowerCase();
    const keywords = normalizeArray(module.keywords).map((keyword) =>
      String(keyword).toLowerCase(),
    );
    if (keywords.some((keyword) => matchesKeyword(haystack, keyword))) {
      return module.name;
    }
  }
  return 'general';
};

const inferStack = (task, heuristics) => {
  const extensions = normalizePaths(task.paths)
    .map((taskPath) => path.extname(taskPath))
    .filter(Boolean);
  if (extensions.length === 0) return 'unspecified';
  for (const [stack, rule] of Object.entries(heuristics.stack_hints ?? {})) {
    const supported = normalizeArray(rule.extensions).map((ext) =>
      ext.toLowerCase(),
    );
    if (extensions.some((ext) => supported.includes(ext))) {
      return stack;
    }
  }
  return 'unspecified';
};

const recommendAgent = (task, heuristics) => {
  const haystack = `${task.title} ${task.labels.join(' ')}`.toLowerCase();
  const matchGroup = (group) => {
    const labels = normalizeArray(group.labels).map((label) => label.toLowerCase());
    const keywords = normalizeArray(group.keywords).map((keyword) =>
      keyword.toLowerCase(),
    );
    return (
      labels.some((label) => task.labels.includes(label)) ||
      keywords.some((keyword) => matchesKeyword(haystack, keyword))
    );
  };

  if (matchGroup(heuristics.agents?.human_review ?? {})) {
    return { agent: 'manual', rationale: 'Requires human review', risk: 'high' };
  }
  if (matchGroup(heuristics.agents?.jules ?? {})) {
    return { agent: 'jules', rationale: 'Cross-cutting or governance scope', risk: 'medium' };
  }
  if (matchGroup(heuristics.agents?.codex ?? {})) {
    return { agent: 'codex', rationale: 'Well-bounded execution scope', risk: 'low' };
  }
  return { agent: 'codex', rationale: 'Default execution path', risk: 'low' };
};

const buildIndependentGroups = (tasks) => {
  const grouped = new Map();
  for (const task of tasks) {
    const key = task.module_hint ?? task.classification ?? 'general';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(task.id);
  }
  return Array.from(grouped.values());
};

const main = async () => {
  const taskFile = args.get('tasks') || DEFAULTS.taskFile;
  const labelsFile = args.get('labels') || DEFAULTS.labelsFile;
  const projectFile = args.get('project') || DEFAULTS.projectFile;
  const heuristicsFile = args.get('heuristics') || DEFAULTS.heuristicsFile;
  const outputFile = args.get('output') || DEFAULTS.outputFile;

  const [agenticTasks, labelsPayload, projectPayload, heuristics] =
    await Promise.all([
      safeReadYaml(resolvePath(taskFile)),
      safeReadJson(resolvePath(labelsFile)),
      safeReadJson(resolvePath(projectFile)),
      readYamlFile(resolvePath(heuristicsFile)),
    ]);

  const tasks = extractTasks({ agenticTasks, labelsPayload, projectPayload });

  const enrichedTasks = tasks.map((task) => {
    const classification = classifyTask(task, heuristics);
    const module_hint = inferModule(task, heuristics);
    const stack_hint = inferStack(task, heuristics);
    const recommendation = recommendAgent(task, heuristics);
    return {
      ...task,
      classification,
      module_hint,
      stack_hint,
      agent_recommendation: recommendation,
    };
  });

  const independent_groups = buildIndependentGroups(enrichedTasks);

  const output = {
    generated_at: new Date().toISOString(),
    sources: {
      agentic_tasks: Boolean(agenticTasks),
      labels_payload: Boolean(labelsPayload),
      project_payload: Boolean(projectPayload),
    },
    boundaries: {
      modules: (heuristics.modules ?? []).map((module) => module.name),
      stacks: Object.keys(heuristics.stack_hints ?? {}),
    },
    tasks: enrichedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      labels: task.labels,
      paths: task.paths,
      module_hint: task.module_hint,
      classification: task.classification,
      stack_hint: task.stack_hint,
      agent_recommendation: task.agent_recommendation,
      source: task.source,
    })),
    independent_groups,
    agent_recommendations: enrichedTasks.map((task) => ({
      id: task.id,
      agent: task.agent_recommendation.agent,
      rationale: task.agent_recommendation.rationale,
      risk: task.agent_recommendation.risk,
    })),
  };

  await fs.mkdir(path.dirname(resolvePath(outputFile)), { recursive: true });
  await fs.writeFile(resolvePath(outputFile), JSON.stringify(output, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
