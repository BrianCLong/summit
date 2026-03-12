#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OWNER = process.env.OWNER;
const REPO = process.env.REPO;

const POINT_LABELS = (process.env.POINT_LABELS || 'sp:,pts:,size/').split(',');
const P0_LABELS = (
  process.env.P0_LABELS || 'p0,critical,priority:critical'
).split(',');
const P1_LABELS = (process.env.P1_LABELS || 'p1,high,priority:high').split(',');
const P2_LABELS = (process.env.P2_LABELS || 'p2,medium,priority:medium').split(
  ',',
);
const GOLDEN_PATH_THRESHOLD = parseInt(
  process.env.GOLDEN_PATH_THRESHOLD || '2',
  10,
);
const OPEN_ITEMS_PREVIEW = parseInt(process.env.OPEN_ITEMS_PREVIEW || '10', 10);

function loadMetrics() {
  const file = path.join(process.cwd(), 'metrics.json');
  if (!fs.existsSync(file)) {
    return { priorityGroups: [] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sortGroups(groups) {
  return groups
    .filter((g) => g.priority === 'P0' || g.priority === 'P1')
    .sort((a, b) => {
      const pri = { P0: 0, P1: 1, P2: 2 };
      if (pri[a.priority] !== pri[b.priority]) {
        return pri[a.priority] - pri[b.priority];
      }
      return (b.remainingPoints || 0) - (a.remainingPoints || 0);
    })
    .slice(0, 3)
    .map((g) => ({
      key: g.key,
      priority: g.priority,
      remainingPoints: g.remainingPoints || 0,
      velocity: g.velocityPointsPerSprint || 0,
      distanceSprints: g.distanceSprints || 0,
      eta: g.eta || '',
      risk: g.risk || '',
      openItems: (g.openItems || [])
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, OPEN_ITEMS_PREVIEW),
      recentMerged: (g.recentMerged || []).slice(0, 5),
    }));
}

function writeNowFocus(groups) {
  const out = {
    generatedAt: new Date().toISOString(),
    groups,
  };
  fs.writeFileSync('now_focus.json', JSON.stringify(out, null, 2));
}

function nextTenItems(groups) {
  const all = [];
  for (const g of groups) {
    for (const item of g.openItems) {
      all.push({ ...item, priority: g.priority });
    }
  }
  all.sort((a, b) => {
    if (b.points !== a.points) return (b.points || 0) - (a.points || 0);
    const pri = { P0: 0, P1: 1, P2: 2 };
    return pri[a.priority] - pri[b.priority];
  });
  return all.slice(0, 10);
}

function renderDashboard(groups, metrics) {
  const lines = [];
  lines.push('# Dashboard');
  lines.push('');
  lines.push('## NOW Focus (Top 3)');
  lines.push('');
  lines.push('Group | Priority | RP | V (pts/sprint) | Distance | ETA | Risk');
  lines.push('|-----|----------|----|----------------|----------|-----|-----|');
  for (const g of groups) {
    lines.push(
      `${g.key} | ${g.priority} | ${g.remainingPoints} | ${g.velocity} | ${g.distanceSprints} | ${g.eta} | ${g.risk || ''}`,
    );
  }
  lines.push('');
  lines.push('## Next 10 to pull');
  const next = nextTenItems(groups);
  for (const item of next) {
    lines.push(
      `- ${item.type} #${item.number} (${item.points} pts) [${item.priority}]`,
    );
  }
  lines.push('');
  if (metrics && metrics.footer) lines.push(metrics.footer);
  fs.writeFileSync('dashboard.md', lines.join('\n'));
}

async function github(method, url, data) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN required');
  }
  const headers = {
    Authorization: `token ${token}`,
    'User-Agent': 'now-focus-script',
  };
  const fullUrl = `https://api.github.com${url}`;
  const res = await axios({ method, url: fullUrl, data, headers });
  await new Promise((r) => setTimeout(r, 100));
  return res.data;
}

async function ensureTrackingIssue(group) {
  const title = `NOW FOCUS: ${group.key}`;
  const issues = await github('get', `/repos/${OWNER}/${REPO}/issues`, {
    params: { state: 'all', labels: 'status:now-focus', per_page: 100 },
  });
  let existing = issues.find((i) => i.title === title);
  const body = buildIssueBody(group);
  const labels = ['status:now-focus', group.priority.toLowerCase()];
  if (existing) {
    await github('patch', `/repos/${OWNER}/${REPO}/issues/${existing.number}`, {
      title,
      body,
      labels,
    });
  } else {
    existing = await github('post', `/repos/${OWNER}/${REPO}/issues`, {
      title,
      body,
      labels,
    });
  }
  return existing;
}

function buildIssueBody(group) {
  const lines = [];
  lines.push('### Snapshot');
  lines.push('');
  lines.push(`- Remaining points (RP): ${group.remainingPoints}`);
  lines.push(`- Velocity (V): ${group.velocity}`);
  lines.push(`- Distance (sprints): ${group.distanceSprints}`);
  lines.push(`- ETA: ${group.eta}`);
  if (group.risk) lines.push(`- Risk: ${group.risk}`);
  lines.push('');
  lines.push('### Open Items');
  for (const item of group.openItems) {
    lines.push(`- [ ] ${item.type} #${item.number} — ${item.points} pts`);
  }
  lines.push('');
  if (group.recentMerged.length) {
    lines.push('### Recent merged');
    for (const m of group.recentMerged) {
      lines.push(`- ${m.type} #${m.number}`);
    }
    lines.push('');
  }
  lines.push(`_Generated ${new Date().toISOString()} UTC_`);
  return lines.join('\n');
}

async function commentAndLabel(item, group, milestone) {
  const number = item.number;
  const body = `Ops update: This item is part of NOW FOCUS '${group.key}'.\nCurrent team velocity: ${group.velocity} pts/sprint. Group RP: ${group.remainingPoints}. Distance: ${group.distanceSprints} sprints. ETA: ${group.eta}.\nPlease confirm points label (e.g., sp:X) or update scope by EOD.`;
  await github('post', `/repos/${OWNER}/${REPO}/issues/${number}/comments`, {
    body,
  });
  const labels = ['now-focus'];
  const priMap = { P0: P0_LABELS[0], P1: P1_LABELS[0], P2: P2_LABELS[0] };
  if (priMap[group.priority]) labels.push(priMap[group.priority]);
  await github('post', `/repos/${OWNER}/${REPO}/issues/${number}/labels`, {
    labels,
  });
  if (milestone) {
    await github('patch', `/repos/${OWNER}/${REPO}/issues/${number}`, {
      milestone,
    });
  }
}

async function ensureMilestone(group) {
  if (!group.eta) return null;
  const title = `NOW FOCUS: ${group.key} (ETA ${group.eta})`;
  const existing = await github('get', `/repos/${OWNER}/${REPO}/milestones`, {
    params: { state: 'all', per_page: 100 },
  });
  let found = existing.find((m) => m.title === title);
  if (!found) {
    found = await github('post', `/repos/${OWNER}/${REPO}/milestones`, {
      title,
      due_on: group.eta,
    });
  }
  return found.number;
}

async function goldenPathEscalation(group, trackingIssue) {
  const message = `⚠ Golden Path risk: distance is ${group.distanceSprints} sprints (threshold=${GOLDEN_PATH_THRESHOLD}).\nRequesting escalation: add reviewer bandwidth and split largest open item into <= 2 pt slices.`;
  const owners = getCodeOwners();
  const mention = owners.length
    ? `\n${owners.map((o) => `@${o}`).join(' ')}`
    : '';
  await github(
    'post',
    `/repos/${OWNER}/${REPO}/issues/${trackingIssue.number}/labels`,
    { labels: ['risk:golden-path'] },
  );
  await github(
    'post',
    `/repos/${OWNER}/${REPO}/issues/${trackingIssue.number}/comments`,
    { body: message + mention },
  );
  for (const item of group.openItems) {
    await github(
      'post',
      `/repos/${OWNER}/${REPO}/issues/${item.number}/labels`,
      { labels: ['risk:golden-path'] },
    );
  }
}

function getCodeOwners() {
  const file = path.join(process.cwd(), 'CODEOWNERS');
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const owners = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/@([\w-]+)/g);
    if (match) match.forEach((m) => owners.add(m.slice(1)));
  }
  return Array.from(owners);
}

async function apply() {
  if (!OWNER || !REPO) {
    console.error('OWNER and REPO env vars required');
    process.exit(1);
  }
  const metrics = loadMetrics();
  const groups = sortGroups(metrics.priorityGroups || []);
  writeNowFocus(groups);
  renderDashboard(groups, metrics);

  let updatedTracking = 0;
  let labeled = 0;
  let commented = 0;
  let escalations = 0;

  for (const group of groups) {
    const milestone = await ensureMilestone(group);
    const issue = await ensureTrackingIssue(group);
    updatedTracking++;
    for (const item of group.openItems) {
      await commentAndLabel(item, group, milestone);
      labeled++;
      commented++;
    }
    if (
      group.priority === 'P0' &&
      (group.risk || group.distanceSprints > GOLDEN_PATH_THRESHOLD)
    ) {
      await goldenPathEscalation(group, issue);
      escalations++;
    }
  }

  console.log(`NOW FOCUS groups: ${groups.length}`);
  console.log(`Updated tracking issues: ${updatedTracking}`);
  console.log(`Labeled items: ${labeled}`);
  console.log(`Comments posted: ${commented}`);
  console.log(`Golden Path escalations: ${escalations}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--apply')) {
    await apply();
  } else {
    const metrics = loadMetrics();
    const groups = sortGroups(metrics.priorityGroups || []);
    renderDashboard(groups, metrics);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
