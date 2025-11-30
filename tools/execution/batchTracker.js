import fs from 'fs';
import path from 'path';

const VALID_STATUSES = ['not-started', 'queued', 'in-progress', 'blocked', 'done'];
const DEFAULT_PLAN = 'execution-plan.json';

function resolvePlanPath(planPath = DEFAULT_PLAN) {
  return path.isAbsolute(planPath) ? planPath : path.join(process.cwd(), planPath);
}

function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function requireProgress(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('Progress must be between 0 and 100');
  }
}

export function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Plan must be an object');
  }
  if (!Array.isArray(plan.batches) || plan.batches.length === 0) {
    throw new Error('Plan file is missing a non-empty batches array');
  }

  const ids = new Set();
  plan.batches.forEach((batch) => {
    requireString(batch.id, 'Batch id');
    if (ids.has(batch.id)) {
      throw new Error(`Duplicate batch id detected: ${batch.id}`);
    }
    ids.add(batch.id);
    requireString(batch.name, 'Batch name');
    requireString(batch.priority, 'Batch priority');
    if (!VALID_STATUSES.includes(batch.status)) {
      throw new Error(`Invalid status '${batch.status}' in plan. Allowed: ${VALID_STATUSES.join(', ')}`);
    }
    requireProgress(batch.progress);
    if (!Array.isArray(batch.blockers)) {
      throw new Error(`Blockers for ${batch.id} must be an array`);
    }
  });

  if (!plan.metrics || typeof plan.metrics !== 'object') {
    plan.metrics = {};
  }

  return plan;
}

export function loadPlan(planPath = DEFAULT_PLAN) {
  const fullPath = resolvePlanPath(planPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Plan file not found at ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  const data = JSON.parse(raw);
  return validatePlan(data);
}

export function savePlan(plan, planPath = DEFAULT_PLAN) {
  const validated = validatePlan(plan);
  const fullPath = resolvePlanPath(planPath);
  const payload = JSON.stringify(validated, null, 2);
  fs.writeFileSync(fullPath, `${payload}\n`, 'utf8');
}

export function updateBatch(plan, batchId, updates) {
  const idx = plan.batches.findIndex((batch) => batch.id === batchId);
  if (idx === -1) {
    throw new Error(`Unknown batch id: ${batchId}`);
  }
  const next = { ...plan.batches[idx] };

  if (updates.status) {
    if (!VALID_STATUSES.includes(updates.status)) {
      throw new Error(`Invalid status '${updates.status}'. Allowed: ${VALID_STATUSES.join(', ')}`);
    }
    next.status = updates.status;
  }

  if (typeof updates.progress === 'number') {
    requireProgress(updates.progress);
    next.progress = updates.progress;
  }

  if (updates.owner !== undefined) {
    next.owner = updates.owner;
  }

  if (updates.blockers) {
    next.blockers = [...updates.blockers];
  }

  if (updates.notes) {
    next.notes = updates.notes;
  }

  if (updates.targetDate) {
    requireString(updates.targetDate, 'targetDate');
    next.targetDate = updates.targetDate;
  }

  const batches = [...plan.batches];
  batches[idx] = next;
  return validatePlan({ ...plan, batches });
}

export function updateMetrics(plan, metrics) {
  const sanitized = { ...plan.metrics };
  Object.entries(metrics).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      throw new Error(`Metric '${key}' must be a non-negative number`);
    }
    sanitized[key] = value;
  });
  return { ...plan, metrics: sanitized };
}

export function generateDashboard(plan) {
  const headers = ['Batch', 'Priority', 'Status', 'Progress', 'Target Date', 'Owner', 'Blockers'];
  const rows = plan.batches.map((batch) => [
    `${batch.name}`,
    batch.priority,
    statusEmoji(batch.status),
    `${batch.progress}%`,
    batch.targetDate,
    batch.owner || 'Unassigned',
    batch.blockers.length ? batch.blockers.join(', ') : 'None',
  ]);
  return buildTable(headers, rows);
}

export function generateWeeklyReport(plan, weekLabel) {
  const currentBatch = plan.batches.find((batch) => batch.status !== 'done') || plan.batches[plan.batches.length - 1];
  const completed = plan.batches.filter((batch) => batch.status === 'done');
  const inProgress = plan.batches.filter((batch) => batch.status === 'in-progress');

  const lines = [
    `## Weekly Progress Report - ${weekLabel}`,
    '',
    `### 🎯 Current Batch: ${currentBatch.name}`,
    '',
    `**Overall Progress:** ${currentBatch.progress}% complete (Owner: ${currentBatch.owner || 'unassigned'})`,
    '',
    '### ✅ Completed This Week',
    ...formatChecklist(completed, 'No batches completed'),
    '',
    '### 🚧 In Progress',
    ...formatChecklist(inProgress, 'No batches in flight'),
    '',
    '### ⚠️ Blockers',
    ...formatBlockers(plan),
    '',
    '### 📊 Metrics This Week',
    `- PRs merged: ${plan.metrics.prsMerged ?? 0}`,
    `- CI pass rate: ${plan.metrics.ciPassRate ?? 0}%`,
    `- Test coverage: ${plan.metrics.coverage ?? 0}%`,
    `- Production incidents: ${plan.metrics.productionIncidents ?? 0}`,
    `- Mean time to deploy: ${plan.metrics.deploymentMinutes ?? 0} minutes`,
    '',
    '### 📅 Next Week Goals',
    '- [ ] Define goals for next sprint',
    '',
    '### 🆘 Help Needed',
    '- [ ] Identify assistance required',
    '',
    '### 🎉 Wins',
    '- [ ] Celebrate accomplishments',
  ];

  return lines.join('\n');
}

function formatChecklist(items, emptyLabel) {
  if (!items.length) {
    return [`- [ ] ${emptyLabel}`];
  }
  return items.map((item) => `- [x] ${item.name} (${item.progress}%)`);
}

function formatBlockers(plan) {
  const blockers = plan.batches
    .filter((batch) => batch.blockers && batch.blockers.length)
    .flatMap((batch) => batch.blockers.map((blocker) => `${batch.name} blocked by ${blocker}`));
  return blockers.length ? blockers.map((b) => `- ${b}`) : ['- None'];
}

function statusEmoji(status) {
  switch (status) {
    case 'done':
      return '✅ Done';
    case 'in-progress':
      return '🟡 In Progress';
    case 'blocked':
      return '🟥 Blocked';
    case 'queued':
      return '⚪ Queued';
    default:
      return '🔴 Not Started';
  }
}

function buildTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return `${headerLine}\n${separator}\n${body}`;
}

function parseKeyValuePairs(pairs) {
  const updates = {};
  pairs.forEach((pair) => {
    const [key, value] = pair.split('=');
    if (value === undefined) return;
    if (key === 'progress') {
      updates.progress = Number.parseInt(value, 10);
    } else if (key === 'status') {
      updates.status = value;
    } else if (key === 'owner') {
      updates.owner = value;
    } else if (key === 'notes') {
      updates.notes = value;
    } else if (key === 'blockers') {
      updates.blockers = value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
    } else if (key === 'targetDate') {
      updates.targetDate = value;
    } else if (['ciPassRate', 'coverage', 'deploymentMinutes', 'productionIncidents', 'prsMerged'].includes(key)) {
      updates[key] = Number.parseFloat(value);
    }
  });
  return updates;
}

export function cli(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const planPath = process.env.EXECUTION_PLAN_PATH || DEFAULT_PLAN;
  if (!command || command === 'help') {
    console.log('Usage: node tools/execution/batchTracker.js <command> [options]');
    console.log('Commands:');
    console.log('  dashboard                        Print markdown dashboard table');
    console.log('  weekly <label>                   Print weekly report with the provided label');
    console.log('  update <batchId> key=val [...]   Update batch status/progress/owner/notes/blockers/targetDate');
    console.log('  metrics key=val [...]            Update aggregated metrics (ciPassRate, coverage, prsMerged, etc.)');
    console.log('  validate                         Validate plan structure without writing changes');
    process.exit(0);
  }

  const plan = loadPlan(planPath);

  if (command === 'dashboard') {
    console.log(generateDashboard(plan));
    return;
  }

  if (command === 'weekly') {
    const [label] = rest;
    if (!label) {
      throw new Error('Weekly command requires a label, e.g., "Week 1"');
    }
    console.log(generateWeeklyReport(plan, label));
    return;
  }

  if (command === 'update') {
    const [batchId, ...pairs] = rest;
    if (!batchId) {
      throw new Error('Update command requires a batch id');
    }
    const updates = parseKeyValuePairs(pairs);
    const updated = updateBatch(plan, batchId, updates);
    savePlan(updated, planPath);
    console.log(`Updated ${batchId}`);
    return;
  }

  if (command === 'metrics') {
    const metricUpdates = parseKeyValuePairs(rest);
    const updated = updateMetrics(plan, metricUpdates);
    savePlan(updated, planPath);
    console.log('Metrics updated');
    return;
  }

  if (command === 'validate') {
    validatePlan(plan);
    console.log('Plan is valid');
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cli();
}
