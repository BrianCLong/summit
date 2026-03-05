const { processIssue } = require('./bot.cjs');

module.exports = async function run({ github, context }) {
  const dryRun = String(process.env.QUEUE_BOT_DRY_RUN || '').toLowerCase() === 'true';

  if (context.eventName === 'workflow_dispatch') {
    const issueNumber = Number(context.payload.inputs?.issue_number || 0);
    if (!issueNumber) {
      throw new Error('issue_number input is required for workflow_dispatch');
    }

    const { data: issue } = await github.rest.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
    });
    await processIssue({ github, context, issue, dryRun });
    return;
  }

  await processIssue({ github, context, issue: context.payload.issue, dryRun });
};
