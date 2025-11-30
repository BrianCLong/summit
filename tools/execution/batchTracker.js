import fs from 'fs';
import path from 'path';

const VALID_STATUSES = ['not-started', 'queued', 'in-progress', 'blocked', 'done'];

function resolvePlanPath(planPath = 'execution-plan.json') {
  return path.isAbsolute(planPath) ? planPath : path.join(process.cwd(), planPath);
}

export function loadPlan(planPath = 'execution-plan.json') {
  const fullPath = resolvePlanPath(planPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Plan file not found at ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.batches)) {
    throw new Error('Plan file is missing a batches array');
  }
  return data;
}

export function savePlan(plan, planPath = 'execution-plan.json') {
  const fullPath = resolvePlanPath(planPath);
  const payload = JSON.stringify(plan, null, 2);
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
    if (updates.progress < 0 || updates.progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
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

  const batches = [...plan.batches];
  batches[idx] = next;
  return { ...plan, batches };
}

export function updateMetrics(plan, metrics) {
  const nextMetrics = { ...plan.metrics, ...metrics };
  return { ...plan, metrics: nextMetrics };
}

export function generateDashboard(plan) {
  const headers = ['Batch', 'Priority', 'Status', 'Progress', 'Target Date', 'Blockers'];
  const rows = plan.batches.map((batch) => [
    `${batch.name}`,
    batch.priority,
    statusEmoji(batch.status),
    `${batch.progress}%`,
    batch.targetDate,
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
    `**Overall Progress:** ${currentBatch.progress}% complete`,
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

export function cli(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const planPath = process.env.EXECUTION_PLAN_PATH || 'execution-plan.json';
  if (!command || command === 'help') {
    console.log('Usage: node tools/execution/batchTracker.js <command> [options]');
    console.log('Commands:');
    console.log('  dashboard                 Print markdown dashboard table');
    console.log('  weekly <label>            Print weekly report with the provided label');
    console.log('  update <batchId> key=val  Update batch status/progress/owner/notes');
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
    const updates = {};
    pairs.forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key === 'progress') {
        updates.progress = Number.parseInt(value, 10);
      } else if (key === 'status') {
        updates.status = value;
      } else if (key === 'owner') {
        updates.owner = value;
      } else if (key === 'notes') {
        updates.notes = value;
      }
    });
    const updated = updateBatch(plan, batchId, updates);
    savePlan(updated, planPath);
    console.log(`Updated ${batchId}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cli();
}
