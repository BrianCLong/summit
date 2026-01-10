const STALE_DAYS = 30;
const ACTION_RESET_DAYS = 7;

const LABEL_DEFINITIONS = {
  'status/stale': {
    color: '6e7781',
    description: 'No recent activity; needs update to stay actionable',
  },
  'status/actionable': {
    color: '0e8a16',
    description: 'Active issue with recent signal or updates',
  },
  'area/frontend': { color: 'c2e0c6', description: 'Web client / UI' },
  'area/backend': { color: 'd4c5f9', description: 'API, GraphQL, or server' },
  'area/infra': { color: 'f9d0c4', description: 'Infrastructure, CI/CD, or platform' },
  'area/security': { color: 'e11d21', description: 'Security, auth, and policy' },
  'area/docs': { color: '0075ca', description: 'Documentation and guides' },
  'area/needs-triage': { color: 'cfd3d7', description: 'Subsystem not automatically detected' },
  'severity/P0': { color: 'b60205', description: 'Critical / Blocker. Must fix immediately.' },
  'severity/P1': { color: 'd93f0b', description: 'Major / High. Fix in current sprint.' },
  'severity/P2': { color: 'fbca04', description: 'Minor / Medium. Fix if time permits.' },
  'severity/P3': { color: 'fef2c0', description: 'Trivial / Low. Backlog candidate.' },
};

const SEVERITY_MATCHERS = [
  { regex: /\b(p0|sev0|blocker|critical)\b/i, label: 'severity/P0' },
  { regex: /\b(p1|sev1|major|high)\b/i, label: 'severity/P1' },
  { regex: /\b(p2|sev2|medium|moderate)\b/i, label: 'severity/P2' },
  { regex: /\b(p3|sev3|low|minor|trivial)\b/i, label: 'severity/P3' },
];

const AREA_MATCHERS = [
  {
    label: 'area/frontend',
    regex: /(frontend|front-end|ui|ux|react|browser|component|css|design system)/i,
  },
  {
    label: 'area/backend',
    regex: /(backend|back-end|api|graphql|service|node|express|server|handler)/i,
  },
  {
    label: 'area/infra',
    regex: /(infrastructure|kubernetes|k8s|docker|helm|terraform|cicd|ci\/cd|pipeline|workflow|gha|github action|observability)/i,
  },
  {
    label: 'area/security',
    regex: /(security|auth|authentication|authorization|oauth|jwt|policy|compliance|rbac|abac)/i,
  },
  {
    label: 'area/docs',
    regex: /(docs|documentation|readme|guide|tutorial)/i,
  },
];

function daysSince(dateString) {
  const then = new Date(dateString).getTime();
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

async function ensureLabels({ github, owner, repo }) {
  const existingLabels = await github.paginate(github.rest.issues.listLabelsForRepo, {
    owner,
    repo,
    per_page: 100,
  });
  const existingNames = new Set(existingLabels.map((label) => label.name));

  for (const [name, definition] of Object.entries(LABEL_DEFINITIONS)) {
    if (!existingNames.has(name)) {
      await github.rest.issues.createLabel({ owner, repo, name, ...definition });
    }
  }
}

function detectSeverity(text) {
  for (const matcher of SEVERITY_MATCHERS) {
    if (matcher.regex.test(text)) {
      return matcher.label;
    }
  }
  return 'severity/P2';
}

function detectArea(text) {
  for (const matcher of AREA_MATCHERS) {
    if (matcher.regex.test(text)) {
      return matcher.label;
    }
  }
  return 'area/needs-triage';
}

function normalizeText(issue) {
  const title = issue.title || '';
  const body = issue.body || '';
  const labels = Array.isArray(issue.labels) ? issue.labels.map((l) => (typeof l === 'string' ? l : l.name)).join(' ') : '';
  return `${title}\n${body}\n${labels}`.toLowerCase();
}

function computeDesiredLabels(issue) {
  const text = normalizeText(issue);
  const severityLabel = detectSeverity(text);
  const areaLabel = detectArea(text);
  const stale = daysSince(issue.updated_at) >= STALE_DAYS;
  const statusLabel = stale ? 'status/stale' : 'status/actionable';

  return { severityLabel, areaLabel, statusLabel, stale };
}

function deriveLabelChanges(issue, desiredLabels) {
  const currentLabels = new Set(
    (issue.labels || []).map((label) => (typeof label === 'string' ? label : label.name)),
  );

  const { severityLabel, areaLabel, statusLabel } = desiredLabels;
  const labelsToAdd = [];
  const labelsToRemove = [];

  const severityPrefixed = Array.from(currentLabels).filter((name) => name.startsWith('severity/'));
  const areaPrefixed = Array.from(currentLabels).filter((name) => name.startsWith('area/'));
  const statusPrefixed = Array.from(currentLabels).filter((name) => name.startsWith('status/'));

  for (const name of severityPrefixed) {
    if (name !== severityLabel) {
      labelsToRemove.push(name);
      currentLabels.delete(name);
    }
  }

  for (const name of areaPrefixed) {
    if (name !== areaLabel) {
      labelsToRemove.push(name);
      currentLabels.delete(name);
    }
  }

  for (const name of statusPrefixed) {
    if (name !== statusLabel) {
      labelsToRemove.push(name);
      currentLabels.delete(name);
    }
  }

  [severityLabel, areaLabel, statusLabel].forEach((label) => {
    if (!currentLabels.has(label)) {
      labelsToAdd.push(label);
    }
  });

  return { labelsToAdd, labelsToRemove };
}

async function syncLabels({ github, owner, repo, issueNumber, labelsToAdd, labelsToRemove }) {
  for (const label of labelsToRemove) {
    await github.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label });
  }

  if (labelsToAdd.length > 0) {
    await github.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: labelsToAdd });
  }
}

async function updateStatusComment({
  github,
  owner,
  repo,
  issue,
  stale,
  labelsToAdd,
  labelsToRemove,
}) {
  const addingStale = labelsToAdd.includes('status/stale');
  const addingActionable = labelsToAdd.includes('status/actionable');
  const removingStale = labelsToRemove.includes('status/stale');

  if (stale && addingStale) {
    const cutoffDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: `Marking this issue as stale because there has been no activity since ${cutoffDate}. Please add updates or context to keep it actionable.`,
    });
  }

  if (!stale && addingActionable && removingStale && daysSince(issue.updated_at) <= ACTION_RESET_DAYS) {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: 'Activity detected. Moving this issue back to actionable.',
    });
  }
}

async function processIssue({ github, context, issue }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  if (issue.pull_request) {
    return;
  }

  const desiredLabels = computeDesiredLabels(issue);
  const { labelsToAdd, labelsToRemove } = deriveLabelChanges(issue, desiredLabels);

  await syncLabels({ github, owner, repo, issueNumber: issue.number, labelsToAdd, labelsToRemove });
  await updateStatusComment({
    github,
    owner,
    repo,
    issue,
    stale: desiredLabels.stale,
    labelsToAdd,
    labelsToRemove,
  });
}

async function processAllOpenIssues({ github, context }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  for await (const response of github.paginate.iterator(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  })) {
    for (const issue of response.data) {
      await processIssue({ github, context, issue });
    }
  }
}

module.exports = async function run({ github, context }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  await ensureLabels({ github, owner, repo });

  if (context.eventName === 'issues') {
    const issue = context.payload.issue;
    await processIssue({ github, context, issue });
    return;
  }

  await processAllOpenIssues({ github, context });
};
