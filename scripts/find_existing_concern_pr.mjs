import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
  try {
    const prNumber = parseInt(process.env.PR_NUMBER, 10);
    const token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Get the concern label from the current PR
    const { data: pr } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber
    });

    const concernLabel = pr.labels.find(l => l.name.startsWith('concern:'));
    if (!concernLabel) {
      console.log('No concern label found. Skipping duplicate check.');
      core.setOutput('has_existing_pr', 'false');
      return;
    }

    const concern = concernLabel.name.split(':')[1];

    // Look for existing open PRs with this concern label
    const { data: openPRs } = await octokit.rest.issues.listForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
      state: 'open',
      labels: concernLabel.name
    });

    // Filter out the current PR and any draft PRs acting as artifacts
    const existingPRs = openPRs.filter(p =>
      p.number !== prNumber &&
      p.pull_request && // Ensure it's a PR, not an issue
      !p.labels.some(l => l.name === 'status:intake-artifact')
    );

    if (existingPRs.length > 0) {
      // Find the oldest open PR for this concern to act as the canonical one
      existingPRs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const canonicalPR = existingPRs[0];

      console.log(`Found existing canonical PR #${canonicalPR.number} for concern: ${concern}`);
      core.setOutput('has_existing_pr', 'true');
      core.setOutput('canonical_pr_number', canonicalPR.number.toString());
      core.setOutput('concern', concern);
    } else {
      console.log(`No existing canonical PR found for concern: ${concern}. This PR will become canonical.`);
      core.setOutput('has_existing_pr', 'false');
    }

  } catch (error) {
    core.setFailed(`Action failed with error ${error}`);
  }
}

run();
