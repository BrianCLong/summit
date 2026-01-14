const {
  CHECKLIST_MARKER,
  MANAGED_MILESTONES,
  RESTRICTED_LABELS,
  buildChecklistComment,
  deriveLabelsFromFields,
  getMissingFields,
  parseIssueForm,
} = require('./issue-intake-strict-lib');
const { LABEL_DEFINITIONS, resolveMilestoneTitle } = require('./issue-triage-lib');

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

function collectLabelNames(labels) {
  return new Set((labels || []).map((label) => (typeof label === 'string' ? label : label.name)));
}

function collectRemoveLabels({ currentLabels, desiredLabels, isValid, derivedLabels, allowRestricted }) {
  const labelsToRemove = new Set();

  for (const label of currentLabels) {
    if (label.startsWith('triage:') && !desiredLabels.has(label)) {
      labelsToRemove.add(label);
      continue;
    }

    if (label.startsWith('priority:')) {
      if (!isValid || label !== derivedLabels.priorityLabel) {
        labelsToRemove.add(label);
      }
      continue;
    }

    if (label.startsWith('area:')) {
      if (!isValid || label !== derivedLabels.areaLabel) {
        labelsToRemove.add(label);
      }
      continue;
    }

    if (label.startsWith('type:')) {
      if (!isValid || label !== derivedLabels.typeLabel) {
        labelsToRemove.add(label);
      }
      continue;
    }

    if (!allowRestricted && RESTRICTED_LABELS.has(label) && !desiredLabels.has(label)) {
      labelsToRemove.add(label);
    }
  }

  return labelsToRemove;
}

async function syncLabels({ github, owner, repo, issueNumber, labelsToAdd, labelsToRemove }) {
  for (const label of labelsToRemove) {
    await github.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label });
  }

  if (labelsToAdd.length > 0) {
    await github.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: labelsToAdd });
  }
}

async function updateMilestone({ github, owner, repo, issue, labels, isValid }) {
  const desiredTitle = isValid ? resolveMilestoneTitle(labels) : null;
  const currentTitle = issue.milestone?.title || null;

  if (!desiredTitle && !currentTitle) {
    return;
  }

  if (!desiredTitle && currentTitle && MANAGED_MILESTONES.has(currentTitle)) {
    await github.rest.issues.update({ owner, repo, issue_number: issue.number, milestone: null });
    return;
  }

  if (!desiredTitle || desiredTitle === currentTitle) {
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

async function findChecklistComment({ github, owner, repo, issueNumber }) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  return comments.find((comment) => comment.body && comment.body.includes(CHECKLIST_MARKER));
}

async function ensureChecklistComment({ github, owner, repo, issueNumber, missingFields }) {
  const existing = await findChecklistComment({ github, owner, repo, issueNumber });
  if (existing) {
    return;
  }

  const body = buildChecklistComment(missingFields);
  await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}

async function getActorPermission({ github, owner, repo, actor }) {
  if (!actor) {
    return 'none';
  }
  if (actor.endsWith('[bot]')) {
    return 'automation';
  }

  try {
    const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username: actor,
    });
    return data.permission || 'none';
  } catch (error) {
    return 'none';
  }
}

function isPrivilegedActor(permission) {
  return permission === 'automation' || permission === 'admin' || permission === 'maintain';
}

async function processIssue({ github, context, issue }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  if (issue.pull_request) {
    return;
  }

  const fields = parseIssueForm(issue.body || '');
  const missingFields = getMissingFields(fields);
  const isValid = missingFields.length === 0;
  const derivedLabels = deriveLabelsFromFields(fields);

  const currentLabels = collectLabelNames(issue.labels);
  const desiredLabels = new Set();

  if (isValid) {
    if (derivedLabels.priorityLabel) {
      desiredLabels.add(derivedLabels.priorityLabel);
    }
    if (derivedLabels.areaLabel) {
      desiredLabels.add(derivedLabels.areaLabel);
    }
    if (derivedLabels.typeLabel) {
      desiredLabels.add(derivedLabels.typeLabel);
    }
    desiredLabels.add('triage:ready');
  } else {
    desiredLabels.add('triage:needs-info');
  }

  const permission = await getActorPermission({
    github,
    owner,
    repo,
    actor: context.actor,
  });
  const allowRestricted = isPrivilegedActor(permission);

  const labelsToRemove = collectRemoveLabels({
    currentLabels,
    desiredLabels,
    isValid,
    derivedLabels,
    allowRestricted,
  });

  const labelsToAdd = [];
  for (const label of desiredLabels) {
    if (!currentLabels.has(label)) {
      labelsToAdd.push(label);
    }
  }

  await syncLabels({
    github,
    owner,
    repo,
    issueNumber: issue.number,
    labelsToAdd,
    labelsToRemove: Array.from(labelsToRemove),
  });

  const updatedLabels = new Set(
    [...currentLabels]
      .filter((label) => !labelsToRemove.has(label))
      .concat(labelsToAdd),
  );

  await updateMilestone({ github, owner, repo, issue, labels: updatedLabels, isValid });

  if (!isValid) {
    await ensureChecklistComment({
      github,
      owner,
      repo,
      issueNumber: issue.number,
      missingFields,
    });
  }
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
