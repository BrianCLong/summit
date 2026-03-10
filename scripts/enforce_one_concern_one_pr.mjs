<<<<<<< HEAD
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
=======
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function main() {
  const hasExistingPR = process.env.HAS_EXISTING_PR === 'true';
  const concern = process.env.PR_CONCERN;
  const canonicalBranch = process.env.CANONICAL_BRANCH;
  const prNumber = process.env.PR_NUMBER || Math.floor(Math.random() * 10000) + 20000;

  if (hasExistingPR && concern && concern !== 'unknown') {
    console.log(`\n🛑 DUPLICATE CONCERN DETECTED: ${concern}`);
    console.log(`An open PR or canonical branch (${canonicalBranch}) already exists for this concern.`);
    console.log(`To prevent PR explosion, this patch is being converted to an Evidence Artifact.`);

    const artifactDir = path.resolve(process.cwd(), '.artifacts/pr');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    const patchHash = crypto.createHash('sha256').update(Date.now().toString()).digest('hex');

    const artifact = {
      pr: parseInt(prNumber, 10),
      concern: concern,
      patch_hash: patchHash,
      superseded_by: canonicalBranch,
      timestamp: new Date().toISOString(),
      status: 'superseded',
      message: 'Automatically closed and converted to artifact by PR Dedupe Gate'
    };

    const artifactPath = path.join(artifactDir, `pr-${prNumber}.json`);
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

    console.log(`Artifact created at: ${artifactPath}`);

    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `duplicate=true\n`);
    }
  } else {
    console.log('No duplicate concern found. Proceeding as canonical PR.');
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `duplicate=false\n`);
    }
  }
}

main();
>>>>>>> origin/main
