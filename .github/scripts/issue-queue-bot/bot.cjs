const { classifyIssue, normalizeLabels } = require('./classifier.cjs');

const BOT_MARKER = '<!-- queue-bot:v1 -->';

function buildPayload(issue, classification) {
  return {
    queue_bot: classification.rulesVersion,
    category: classification.category,
    score: classification.score,
    confidence: classification.confidence,
    queue_order: classification.queueOrder,
    applied_labels: classification.desiredLabels,
    issue: issue.number,
  };
}

function buildCommentBody(payload) {
  return `${BOT_MARKER}\n\n\
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\``;
}

async function listIssueComments(github, owner, repo, issueNumber) {
  return github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
}

function diffLabels(currentLabels, desiredLabels) {
  const current = new Set(currentLabels);
  const desired = new Set(desiredLabels);
  const add = [...desired].filter((label) => !current.has(label));
  const remove = [...current].filter(
    (label) => (label === 'needs-triage' || label.startsWith('prio:')) && !desired.has(label),
  );
  return { add, remove };
}

async function applyLabels({ github, owner, repo, issueNumber, add, remove, dryRun }) {
  if (dryRun) {
    console.log('[dry-run] label add:', add, 'label remove:', remove);
    return;
  }

  for (const label of remove) {
    await github.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: issueNumber,
      name: label,
    });
  }

  if (add.length) {
    await github.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: add });
  }
}

async function upsertPayloadComment({ github, owner, repo, issueNumber, payload, dryRun }) {
  const desiredBody = buildCommentBody(payload);
  const comments = await listIssueComments(github, owner, repo, issueNumber);
  const existing = comments.find((comment) => comment.body && comment.body.includes(BOT_MARKER));

  if (existing && existing.body.trim() === desiredBody.trim()) {
    return;
  }

  if (dryRun) {
    console.log('[dry-run] upsert comment payload:', JSON.stringify(payload));
    return;
  }

  if (existing) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: desiredBody,
    });
    return;
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: desiredBody,
  });
}

async function processIssue({ github, context, issue, dryRun = false }) {
  if (!issue || issue.pull_request) {
    return;
  }

  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const currentLabels = normalizeLabels(issue.labels);

  const classification = classifyIssue(issue);

  if (!classification.isCandidate && !currentLabels.includes('queue:deterministic')) {
    return;
  }

  const { add, remove } = diffLabels(currentLabels, classification.desiredLabels);
  await applyLabels({
    github,
    owner,
    repo,
    issueNumber: issue.number,
    add,
    remove,
    dryRun,
  });

  const payload = buildPayload(issue, classification);
  await upsertPayloadComment({
    github,
    owner,
    repo,
    issueNumber: issue.number,
    payload,
    dryRun,
  });
}

module.exports = {
  BOT_MARKER,
  buildPayload,
  buildCommentBody,
  diffLabels,
  processIssue,
};
