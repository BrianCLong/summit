const {
  LABEL_DEFINITIONS,
  detectAreas,
  detectPriority,
  detectType,
  normalizeText,
  resolveMilestoneTitle,
} = require('./issue-triage-lib');

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

function deriveLabelChanges(issue) {
  const currentLabels = new Set(
    (issue.labels || []).map((label) => (typeof label === 'string' ? label : label.name)),
  );

  const labelsToAdd = [];
  const labelsToRemove = [];

  const text = normalizeText(issue);
  const detectedType = detectType(text);
  const detectedAreas = detectAreas(text);
  const detectedPriority = detectPriority(issue.title || '');
  const hasPriority = Array.from(currentLabels).some((label) => label.startsWith('priority:'));
  const hasType = Array.from(currentLabels).some((label) => label.startsWith('type:'));
  const triageLabels = Array.from(currentLabels).filter((label) => label.startsWith('triage:'));
  const hasTriage = triageLabels.length > 0;
  const hasNonNeededTriage = triageLabels.some((label) => label !== 'triage:needed');

  if (!hasType && detectedType) {
    labelsToAdd.push(detectedType);
  }

  if (!hasPriority && detectedPriority) {
    labelsToAdd.push(detectedPriority);
  }

  if (!hasTriage) {
    labelsToAdd.push('triage:needed');
  } else if (hasNonNeededTriage && currentLabels.has('triage:needed')) {
    labelsToRemove.push('triage:needed');
  }

  for (const areaLabel of detectedAreas) {
    if (!currentLabels.has(areaLabel)) {
      labelsToAdd.push(areaLabel);
    }
  }

  if (/\bga\b|\bga hard gate\b|\bgolden path\b|\bblocker\b/.test(text)) {
    if (!currentLabels.has('ga:polish')) {
      labelsToAdd.push('ga:polish');
    }
  }

  if (/\bga\b.*\bblocker\b|\bga:blocker\b|\bshipstopper\b/.test(text)) {
    if (!currentLabels.has('ga:blocker')) {
      labelsToAdd.push('ga:blocker');
    }
    if (!hasPriority && !labelsToAdd.some((label) => label.startsWith('priority:'))) {
      labelsToAdd.push('priority:P0');
    }
  }

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

async function updateMilestone({ github, owner, repo, issue, labels }) {
  const desiredTitle = resolveMilestoneTitle(labels);
  if (!desiredTitle || issue.milestone?.title === desiredTitle) {
    return;
  }

  const milestones = await github.paginate(github.rest.issues.listMilestones, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });
  const match = milestones.find((milestone) => milestone.title === desiredTitle);
  if (!match) {
    return;
  }

  await github.rest.issues.update({
    owner,
    repo,
    issue_number: issue.number,
    milestone: match.number,
  });
}

async function processIssue({ github, context, issue }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  if (issue.pull_request) {
    return;
  }

  const { labelsToAdd, labelsToRemove } = deriveLabelChanges(issue);

  await syncLabels({ github, owner, repo, issueNumber: issue.number, labelsToAdd, labelsToRemove });

  const updatedLabels = new Set(
    (issue.labels || [])
      .map((label) => (typeof label === 'string' ? label : label.name))
      .concat(labelsToAdd)
      .filter((label) => !labelsToRemove.includes(label)),
  );
  await updateMilestone({ github, owner, repo, issue, labels: updatedLabels });
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
