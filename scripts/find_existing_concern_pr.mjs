<<<<<<< HEAD
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
=======
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

function main() {
  const concern = process.env.PR_CONCERN;
  if (!concern || concern === 'unknown') {
    console.log('No known concern provided.');
    return;
  }

  try {
    const concernsPath = path.resolve(process.cwd(), 'governance/concerns.yml');
    const concernsContent = fs.readFileSync(concernsPath, 'utf8');
    const concerns = yaml.load(concernsContent);

    const concernData = concerns[concern];
    if (!concernData) {
      console.log(`Concern ${concern} not found in registry.`);
      return;
    }

    const canonicalBranch = concernData.canonical_branch;

    try {
        const branchExists = execSync(`git ls-remote --heads origin ${canonicalBranch}`).toString().trim().length > 0;
        if (branchExists) {
            console.log(`Found existing canonical branch: ${canonicalBranch}`);
            if (process.env.GITHUB_OUTPUT) {
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `canonical_branch=${canonicalBranch}\n`);
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_existing_pr=true\n`);
            }
        } else {
             console.log(`Canonical branch ${canonicalBranch} does not exist yet.`);
             if (process.env.GITHUB_OUTPUT) {
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_existing_pr=false\n`);
            }
        }
    } catch (e) {
         console.log('Error checking git branches', e.message);
    }
  } catch (e) {
    console.error('Error in find_existing_concern_pr:', e);
    process.exitCode = 1;
  }
}

main();
>>>>>>> origin/main
