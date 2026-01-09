import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const DEFAULTS = {
  analysisFile: 'artifacts/orchestration/backlog_analysis.json',
  heuristicsFile: 'scripts/orchestration/routing_heuristics.yml',
  policyFile: 'policies/orchestration_parallel.yml',
  ownershipFile: 'artifacts/orchestration/file_ownership_map.json',
  planFile: 'artifacts/orchestration/routing_plan.md',
  proposalFile: 'artifacts/orchestration/proposal_actions.json',
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

const safeReadYaml = async (filePath, fallback) => {
  try {
    return await readYamlFile(filePath);
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

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const timestamp = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
    now.getUTCDate(),
  )}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
    now.getUTCSeconds(),
  )}`;
};

const pathsOverlap = (pathsA, pathsB) => {
  for (const pathA of pathsA) {
    for (const pathB of pathsB) {
      if (pathA === pathB) return true;
      if (pathA.startsWith(pathB) || pathB.startsWith(pathA)) return true;
    }
  }
  return false;
};

const extractGroupModules = (groupTasks) =>
  Array.from(new Set(groupTasks.map((task) => task.module_hint)));

const collectGroupPaths = (groupTasks, heuristics) => {
  const paths = new Set();
  for (const task of groupTasks) {
    for (const taskPath of normalizeArray(task.paths)) {
      paths.add(taskPath);
    }
    const module = (heuristics.modules ?? []).find(
      (entry) => entry.name === task.module_hint,
    );
    for (const modulePath of normalizeArray(module?.paths)) {
      paths.add(modulePath);
    }
  }
  return Array.from(paths);
};

const determineAgent = (groupTasks) => {
  if (groupTasks.some((task) => task.agent_recommendation?.agent === 'manual')) {
    return 'manual';
  }
  if (groupTasks.some((task) => task.agent_recommendation?.agent === 'jules')) {
    return 'jules';
  }
  if (groupTasks.some((task) => task.agent_recommendation?.agent === 'codex')) {
    return 'codex';
  }
  return 'codex';
};

const determineRisk = ({ groupTasks, modules, excludedModules }) => {
  if (groupTasks.some((task) => task.agent_recommendation?.risk === 'high')) {
    return 'high';
  }
  if (modules.some((module) => excludedModules.includes(module))) {
    return 'high';
  }
  if (modules.length > 1) return 'medium';
  if (groupTasks.some((task) => task.classification === 'governance/infra/platform')) {
    return 'medium';
  }
  return 'low';
};

const buildPlanTable = (entries) => {
  const lines = [
    '| Branch | Agent | Modules | Risk | Status | Rationale |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const entry of entries) {
    lines.push(
      `| ${entry.branch} | ${entry.agent} | ${entry.modules.join(
        ', ',
      )} | ${entry.risk} | ${entry.status} | ${entry.rationale} |`,
    );
  }
  return lines.join('\n');
};

const main = async () => {
  const analysisFile = args.get('analysis') || DEFAULTS.analysisFile;
  const heuristicsFile = args.get('heuristics') || DEFAULTS.heuristicsFile;
  const policyFile = args.get('policy') || DEFAULTS.policyFile;
  const ownershipFile = args.get('ownership') || DEFAULTS.ownershipFile;
  const planFile = args.get('output') || DEFAULTS.planFile;
  const proposalFile = args.get('proposal-output') || DEFAULTS.proposalFile;

  const maxParallel = Number(args.get('max-parallel') || 3);
  const agentFilter = args.get('agent') || 'any';
  const planOnlyFlag = args.has('plan-only');

  const [analysis, heuristics, policyRaw, ownership] = await Promise.all([
    safeReadJson(resolvePath(analysisFile), {
      tasks: [],
      independent_groups: [],
    }),
    readYamlFile(resolvePath(heuristicsFile)),
    safeReadYaml(resolvePath(policyFile), { orchestration_parallel: {} }),
    safeReadJson(resolvePath(ownershipFile), { active_branches: {} }),
  ]);

  const policy = policyRaw.orchestration_parallel ?? {};
  const enabled = policy.enabled !== false;
  const planOnly = true;
  const excludedModules = normalizeArray(policy.exclude_modules).map((value) =>
    value.toLowerCase(),
  );

  const activeBranches = ownership.active_branches ?? {};
  const activeEntries = Object.values(activeBranches);

  const groupPlans = [];
  const proposals = [];
  let plannedCount = 0;

  for (const [index, group] of analysis.independent_groups.entries()) {
    if (plannedCount >= maxParallel) break;
    const groupTasks = group
      .map((id) => analysis.tasks.find((task) => task.id === id))
      .filter(Boolean);
    if (groupTasks.length === 0) continue;

    const agent = determineAgent(groupTasks);
    if (agentFilter !== 'any' && agent !== agentFilter) {
      continue;
    }

    const modules = extractGroupModules(groupTasks).map((module) => module ?? 'general');
    const paths = collectGroupPaths(groupTasks, heuristics);
    const branch = `jules/parallel/${slugify(modules.join('-') || `group-${index + 1}`)}/${timestamp()}`;

    const conflicts = activeEntries.some((entry) => {
      const activeModules = normalizeArray(entry.modules).map((module) =>
        String(module).toLowerCase(),
      );
      const activePaths = normalizeArray(entry.paths);
      const moduleOverlap = modules.some((module) =>
        activeModules.includes(String(module).toLowerCase()),
      );
      const pathOverlap = pathsOverlap(paths, activePaths);
      return moduleOverlap || pathOverlap;
    });

    const excluded = modules.some((module) =>
      excludedModules.includes(String(module).toLowerCase()),
    );

    const risk = determineRisk({ groupTasks, modules, excludedModules });
    let status = 'planned';
    let rationale = 'Parallel group ready for plan-only routing.';

    if (!enabled) {
      status = 'blocked-policy';
      rationale = 'Routing disabled by policy.';
    } else if (conflicts) {
      status = 'deferred-conflict';
      rationale = 'Conflicts with active branch ownership.';
    } else if (excluded) {
      status = 'deferred-excluded';
      rationale = 'Module excluded by policy.';
    }

    groupPlans.push({
      branch,
      agent,
      modules,
      paths,
      tasks: groupTasks.map((task) => ({
        id: task.id,
        title: task.title,
        classification: task.classification,
      })),
      risk,
      status,
      rationale,
    });

    if (status === 'planned' && enabled) {
      plannedCount += 1;
      if (policy.label?.parallel_candidate && policy.labeling_enabled) {
        for (const task of groupTasks) {
          proposals.push({
            task_id: task.id,
            label: policy.label.parallel_candidate,
            comment: `Suggested branch: ${branch}. Agent: ${agent}. Modules: ${modules.join(
              ', ',
            )}.`,
          });
        }
      }
    }
  }

  const summaryLines = [
    `# Orchestration Routing Plan`,
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Plan-only mode: ${planOnly || planOnlyFlag}`,
    `Policy enabled: ${enabled}`,
    '',
    buildPlanTable(groupPlans),
    '',
    `## Group Details`,
  ];

  for (const entry of groupPlans) {
    summaryLines.push(
      `### ${entry.branch}`,
      `- Agent: ${entry.agent}`,
      `- Modules: ${entry.modules.join(', ')}`,
      `- Risk: ${entry.risk}`,
      `- Status: ${entry.status}`,
      `- Rationale: ${entry.rationale}`,
      `- Tasks:`,
    );
    for (const task of entry.tasks) {
      summaryLines.push(
        `  - ${task.id}: ${task.title} (${task.classification})`,
      );
    }
    summaryLines.push('');
  }

  const ownershipOutput = {
    generated_at: new Date().toISOString(),
    active_branches: activeBranches,
    planned_branches: groupPlans
      .filter((entry) => entry.status === 'planned')
      .map((entry) => ({
        branch: entry.branch,
        modules: entry.modules,
        paths: entry.paths,
        agent: entry.agent,
        status: entry.status,
      })),
  };

  await fs.mkdir(path.dirname(resolvePath(planFile)), { recursive: true });
  await fs.writeFile(resolvePath(planFile), summaryLines.join('\n'));
  await fs.writeFile(
    resolvePath(ownershipFile),
    JSON.stringify(ownershipOutput, null, 2),
  );

  if (proposals.length > 0) {
    await fs.writeFile(
      resolvePath(proposalFile),
      JSON.stringify({
        generated_at: new Date().toISOString(),
        proposals,
      }, null, 2),
    );
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
