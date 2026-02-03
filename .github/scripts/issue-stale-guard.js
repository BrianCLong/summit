const { LABEL_DEFINITIONS } = require('./issue-triage-lib');

const STALE_DAYS = 45;
const TRIAGE_LABEL = 'triage:needs-info';
const SKIP_LABEL_PREFIXES = ['ga:'];
const SKIP_LABELS = new Set(['priority:P0']);

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

function shouldSkip(labels) {
  for (const label of labels) {
    if (SKIP_LABELS.has(label)) {
      return true;
    }
    if (SKIP_LABEL_PREFIXES.some((prefix) => label.startsWith(prefix))) {
      return true;
    }
  }
  return false;
}

function collectLabelNames(labels) {
  return new Set((labels || []).map((label) => (typeof label === 'string' ? label : label.name)));
}

module.exports = async function run({ github, context }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  await ensureLabels({ github, owner, repo });

  const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;

  for await (const response of github.paginate.iterator(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
    sort: 'updated',
    direction: 'asc',
  })) {
    for (const issue of response.data) {
      if (issue.pull_request) {
        continue;
      }

      const labels = collectLabelNames(issue.labels);
      if (shouldSkip(labels)) {
        continue;
      }

      if (new Date(issue.updated_at).getTime() > cutoff) {
        continue;
      }

      if (labels.has(TRIAGE_LABEL)) {
        continue;
      }

      await github.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issue.number,
        labels: [TRIAGE_LABEL],
      });

      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: `This issue has had no activity for ${STALE_DAYS} days. Automations tagged it with \`${TRIAGE_LABEL}\`; please update the description, add new signals, or bump triage state so the backlog stays actionable.`,
      });
    }
  }
};
