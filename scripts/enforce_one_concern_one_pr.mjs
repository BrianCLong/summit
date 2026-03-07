import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs';

async function run() {
  try {
    const prNumber = parseInt(process.env.PR_NUMBER, 10);
    const token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Check outputs from previous steps
    const hasExistingPrStr = core.getInput('has_existing_pr');
    const hasExistingPr = hasExistingPrStr === 'true';

    if (!hasExistingPr) {
      console.log(`PR #${prNumber} is the canonical PR for its concern. No action needed.`);
      return;
    }

    const canonicalPrNumber = parseInt(core.getInput('canonical_pr_number'), 10);
    const concern = core.getInput('concern');

    console.log(`Enforcing one-concern-one-pr policy. Converting PR #${prNumber} to artifact intake.
      Canonical PR: #${canonicalPrNumber}
      Concern: ${concern}
    `);

    // Add comment to the PR
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: `**Repository Governor Intervention**

      This PR addresses the \`${concern}\` concern, but a canonical PR already exists for this concern: #${canonicalPrNumber}.

      To maintain deterministic convergence and avoid repository explosions, this PR has been automatically designated as a patch artifact and marked as \`status:intake-artifact\`.

      Your patch has been safely recorded in the \`artifacts/pr/\` registry. The automated Patch Frontier will consider your changes for merging into the canonical branch if they do not conflict.

      **Please review #${canonicalPrNumber} and propose changes there instead of opening new PRs.**`
    });

    // Add intake-artifact label
    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      labels: ['status:intake-artifact']
    });

    // Optionally close the PR and preserve it
    // await octokit.rest.pulls.update({
    //   owner: context.repo.owner,
    //   repo: context.repo.repo,
    //   pull_number: prNumber,
    //   state: 'closed'
    // });

    // Store as JSON artifact
    const { data: prData } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber
    });

    const artifact = {
      pr: prNumber,
      concern: concern,
      patch_hash: prData.head.sha,
      superseded_by: canonicalPrNumber,
      timestamp: new Date().toISOString()
    };

    fs.mkdirSync('artifacts/pr', { recursive: true });
    fs.writeFileSync(`artifacts/pr/pr-${prNumber}.json`, JSON.stringify(artifact, null, 2));

    console.log(`Successfully converted PR #${prNumber} to an artifact.`);

  } catch (error) {
    core.setFailed(`Action failed with error ${error}`);
  }
}

run();
