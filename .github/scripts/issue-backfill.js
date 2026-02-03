const {
  LABEL_DEFINITIONS,
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

function collectLabelNames(labels) {
  return new Set((labels || []).map((label) => (typeof label === 'string' ? label : label.name)));
}

module.exports = async function run({ github, context }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  await ensureLabels({ github, owner, repo });

  const milestones = await github.paginate(github.rest.issues.listMilestones, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });
  const milestoneByTitle = new Map(milestones.map((milestone) => [milestone.title, milestone.number]));

  const q = `repo:${owner}/${repo} is:issue is:open -milestone:"GA Hard Gate" -milestone:"30-Day" -milestone:"60-Day" -milestone:"Backlog"`;
  const res = await github.rest.search.issuesAndPullRequests({
    q,
    per_page: 50,
    sort: 'updated',
    order: 'desc',
  });

  for (const item of res.data.items) {
    if (item.pull_request) {
      continue;
    }

    const labels = collectLabelNames(item.labels);
    const text = normalizeText(item);
    const title = item.title || '';

    const add = [];

    const hasTriage = Array.from(labels).some((label) => label.startsWith('triage:'));
    if (!hasTriage) {
      add.push('triage:needed');
    }

    const hasType = Array.from(labels).some((label) => label.startsWith('type:'));
    if (!hasType) {
      add.push(detectType(text));
    }

    const hasPriority = Array.from(labels).some((label) => label.startsWith('priority:'));
    if (!hasPriority) {
      add.push(detectPriority(title) || 'priority:P3');
    }

    if (add.length > 0) {
      await github.rest.issues.addLabels({
        owner,
        repo,
        issue_number: item.number,
        labels: add,
      });
    }

    const finalLabels = new Set([...labels, ...add]);
    const desiredMilestone = resolveMilestoneTitle(finalLabels);
    const currentMilestone = item.milestone?.title;
    const milestoneNumber = desiredMilestone ? milestoneByTitle.get(desiredMilestone) : null;

    if (desiredMilestone && currentMilestone !== desiredMilestone && milestoneNumber) {
      await github.rest.issues.update({
        owner,
        repo,
        issue_number: item.number,
        milestone: milestoneNumber,
      });
    }
  }
};
