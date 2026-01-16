const REQUIRED_FIELDS = [
  { key: 'priority', heading: 'priority', label: 'Priority' },
  { key: 'area', heading: 'area', label: 'Area' },
  { key: 'type', heading: 'type', label: 'Type' },
  { key: 'reproducibility', heading: 'reproducibility', label: 'Reproducibility' },
  {
    key: 'acceptance',
    heading: 'acceptance criteria',
    label: 'Acceptance criteria',
  },
];

const ACCEPTANCE_BULLET_MIN = 2;
const NEEDS_INFO_MARKER = '<!-- triage-strict:needs-info -->';
const RESTRICTED_LABEL_MARKER = '<!-- triage-strict:restricted-label -->';
const NO_RESPONSE_PATTERN = /_?No response_?/i;
const RESTRICTED_LABELS = new Set([
  'priority:P0',
  'priority:P1',
  'ga:blocker',
  'ga:hard-gate',
]);
const RESTRICTED_MILESTONES = new Set(['GA Hard Gate']);
const PRIORITY_MILESTONE_MAP = {
  P0: 'GA Hard Gate',
  P1: '30-Day',
  P2: '60-Day',
  P3: 'Backlog',
};

function normalizeHeading(heading) {
  return heading.trim().toLowerCase();
}

function parseSections(body) {
  const sections = new Map();
  if (!body) {
    return sections;
  }

  const regex = /###\s+([^\n]+)\n([\s\S]*?)(?=\n###\s+|$)/g;
  let match;

  while ((match = regex.exec(body)) !== null) {
    const heading = normalizeHeading(match[1]);
    const value = match[2].replace(/\r/g, '').trim();
    sections.set(heading, value);
  }

  return sections;
}

function hasMeaningfulValue(value) {
  return Boolean(value && value.trim() && !NO_RESPONSE_PATTERN.test(value));
}

function countBullets(value) {
  if (!value) {
    return 0;
  }
  return value
    .split('\n')
    .filter((line) => /^\s*[-*]\s+/.test(line)).length;
}

function validateSections(sections) {
  const missing = [];

  for (const field of REQUIRED_FIELDS) {
    const value = sections.get(field.heading);
    if (!hasMeaningfulValue(value)) {
      missing.push(field);
      continue;
    }

    if (field.key === 'acceptance') {
      const bulletCount = countBullets(value);
      if (bulletCount < ACCEPTANCE_BULLET_MIN) {
        missing.push({
          ...field,
          detail: `Need ${ACCEPTANCE_BULLET_MIN}+ checklist bullets`,
        });
      }
    }
  }

  return missing;
}

function normalizeLabelValue(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function extractLabelValue(sections, heading) {
  const value = sections.get(heading);
  if (!hasMeaningfulValue(value)) {
    return null;
  }
  return normalizeLabelValue(value.split('\n')[0]);
}

function deriveLabelsFromFields(sections) {
  const priorityValue = extractLabelValue(sections, 'priority');
  const areaValue = extractLabelValue(sections, 'area');
  const typeValue = extractLabelValue(sections, 'type');

  return {
    priority: priorityValue ? `priority:${priorityValue}` : null,
    area: areaValue ? `area:${areaValue}` : null,
    type: typeValue ? `type:${typeValue}` : null,
  };
}

function getCurrentLabels(issue) {
  return new Set(
    (issue.labels || []).map((label) => (typeof label === 'string' ? label : label.name)),
  );
}

function replaceLabelByPrefix(currentLabels, prefix, desiredLabel) {
  const labelsToRemove = [];
  for (const label of currentLabels) {
    if (label.startsWith(prefix)) {
      labelsToRemove.push(label);
    }
  }

  const labelsToAdd = [];
  if (desiredLabel) {
    labelsToAdd.push(desiredLabel);
  }

  return { labelsToAdd, labelsToRemove };
}

function buildNeedsInfoComment(missingFields) {
  const checklist = missingFields
    .map((field) => {
      const detail = field.detail ? ` (${field.detail})` : '';
      return `- [ ] ${field.label}${detail}`;
    })
    .join('\n');

  return [
    NEEDS_INFO_MARKER,
    'Strict intake gate: required metadata is missing or malformed.',
    '',
    'Please edit the issue form and complete the checklist:',
    checklist,
    '',
    'Once updated, the triage bot will automatically re-evaluate this issue.',
  ].join('\n');
}

function buildRestrictedLabelComment(label) {
  return [
    RESTRICTED_LABEL_MARKER,
    `The label \`${label}\` is restricted to maintainers or automation.`,
    'If escalation is required, request maintainer review in a comment.',
  ].join('\n');
}

async function getExistingComment({ github, owner, repo, issueNumber, marker }) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  return comments.find(
    (comment) => comment.body && comment.body.includes(marker) && comment.user?.type === 'Bot',
  );
}

async function upsertComment({ github, owner, repo, issueNumber, body, marker }) {
  const existing = await getExistingComment({ github, owner, repo, issueNumber, marker });
  if (existing) {
    if (existing.body !== body) {
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body,
      });
    }
    return;
  }

  await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}

async function deleteCommentIfPresent({ github, owner, repo, issueNumber, marker }) {
  const existing = await getExistingComment({ github, owner, repo, issueNumber, marker });
  if (existing) {
    await github.rest.issues.deleteComment({
      owner,
      repo,
      comment_id: existing.id,
    });
  }
}

async function getPermissionLevel({ github, owner, repo, username }) {
  const response = await github.rest.repos.getCollaboratorPermissionLevel({
    owner,
    repo,
    username,
  });
  return response.data.permission;
}

function isAutomationActor(login) {
  return login === 'github-actions[bot]' || login.endsWith('[bot]');
}

function isMaintainerPermission(permission) {
  return permission === 'admin' || permission === 'maintain';
}

async function syncLabels({ github, owner, repo, issueNumber, labelsToAdd, labelsToRemove }) {
  for (const label of labelsToRemove) {
    await github.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label });
  }

  if (labelsToAdd.length > 0) {
    await github.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: labelsToAdd,
    });
  }
}

async function updateMilestone({ github, owner, repo, issueNumber, desiredTitle }) {
  if (!desiredTitle) {
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
    issue_number: issueNumber,
    milestone: match.number,
  });
}

async function clearMilestone({ github, owner, repo, issueNumber }) {
  await github.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    milestone: null,
  });
}

async function enforceRestrictedLabels({
  github,
  owner,
  repo,
  issue,
  actor,
  action,
  label,
}) {
  if (!label || !RESTRICTED_LABELS.has(label) || isAutomationActor(actor)) {
    return;
  }

  const permission = await getPermissionLevel({ github, owner, repo, username: actor });
  if (isMaintainerPermission(permission)) {
    return;
  }

  if (action === 'labeled') {
    await github.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: issue.number,
      name: label,
    });

    const body = buildRestrictedLabelComment(label);
    await upsertComment({
      github,
      owner,
      repo,
      issueNumber: issue.number,
      body,
      marker: RESTRICTED_LABEL_MARKER,
    });
  }
}

async function enforceRestrictedMilestones({
  github,
  owner,
  repo,
  issue,
  actor,
  action,
}) {
  if (!issue.milestone || !RESTRICTED_MILESTONES.has(issue.milestone.title)) {
    return;
  }

  if (isAutomationActor(actor)) {
    return;
  }

  const permission = await getPermissionLevel({ github, owner, repo, username: actor });
  if (isMaintainerPermission(permission)) {
    return;
  }

  if (action === 'milestoned') {
    await clearMilestone({ github, owner, repo, issueNumber: issue.number });
  }
}

async function applyStrictTriage({ github, owner, repo, issue }) {
  const sections = parseSections(issue.body || '');
  const missingFields = validateSections(sections);
  const labelsFromFields = deriveLabelsFromFields(sections);
  const currentLabels = getCurrentLabels(issue);

  const labelAdds = [];
  const labelRemoves = [];

  const priorityUpdate = replaceLabelByPrefix(
    currentLabels,
    'priority:',
    labelsFromFields.priority,
  );
  labelAdds.push(...priorityUpdate.labelsToAdd);
  labelRemoves.push(...priorityUpdate.labelsToRemove);

  const areaUpdate = replaceLabelByPrefix(currentLabels, 'area:', labelsFromFields.area);
  labelAdds.push(...areaUpdate.labelsToAdd);
  labelRemoves.push(...areaUpdate.labelsToRemove);

  const typeUpdate = replaceLabelByPrefix(currentLabels, 'type:', labelsFromFields.type);
  labelAdds.push(...typeUpdate.labelsToAdd);
  labelRemoves.push(...typeUpdate.labelsToRemove);

  if (missingFields.length > 0) {
    labelAdds.push('triage:needs-info');
    labelRemoves.push('triage:ready', 'triage:needed');
  } else {
    labelAdds.push('triage:ready');
    labelRemoves.push('triage:needs-info', 'triage:needed');
  }

  await syncLabels({
    github,
    owner,
    repo,
    issueNumber: issue.number,
    labelsToAdd: Array.from(new Set(labelAdds)).filter((label) => !labelRemoves.includes(label)),
    labelsToRemove: Array.from(new Set(labelRemoves)),
  });

  if (missingFields.length > 0) {
    const body = buildNeedsInfoComment(missingFields);
    await upsertComment({
      github,
      owner,
      repo,
      issueNumber: issue.number,
      body,
      marker: NEEDS_INFO_MARKER,
    });
  } else {
    await deleteCommentIfPresent({
      github,
      owner,
      repo,
      issueNumber: issue.number,
      marker: NEEDS_INFO_MARKER,
    });

    const priorityValue = extractLabelValue(sections, 'priority');
    const milestoneTitle = PRIORITY_MILESTONE_MAP[priorityValue];
    await updateMilestone({
      github,
      owner,
      repo,
      issueNumber: issue.number,
      desiredTitle: milestoneTitle,
    });
  }
}

async function processIssueEvent({ github, context }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const issue = context.payload.issue;

  if (!issue || issue.pull_request) {
    return;
  }

  const actor = context.actor;
  const action = context.payload.action;
  const label = context.payload.label?.name;

  await applyStrictTriage({ github, owner, repo, issue });
  await enforceRestrictedLabels({
    github,
    owner,
    repo,
    issue,
    actor,
    action,
    label,
  });
  await enforceRestrictedMilestones({
    github,
    owner,
    repo,
    issue,
    actor,
    action,
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
      if (issue.pull_request) {
        continue;
      }
      await applyStrictTriage({ github, owner, repo, issue });
    }
  }
}

async function run({ github, context, mode = 'event' }) {
  if (mode === 'audit') {
    await processAllOpenIssues({ github, context });
    return;
  }

  await processIssueEvent({ github, context });
}

export {
  run,
  parseSections,
  validateSections,
  deriveLabelsFromFields,
  buildNeedsInfoComment,
  countBullets,
};
