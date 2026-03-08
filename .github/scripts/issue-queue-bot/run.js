const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const github = require('@actions/github');
const QueueBot = require('./index');

async function run() {
  try {
    const rulesPath = path.join(__dirname, 'rules.json');
    const bot = new QueueBot(rulesPath);

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is missing");
    }
    const octokit = github.getOctokit(token);
    const context = github.context;

    const isDryRun = process.env.DRY_RUN === 'true';

    // Figure out which issue we are processing
    let issueNumber;
    let eventName = context.eventName;

    if (eventName === 'workflow_dispatch') {
      issueNumber = context.payload.inputs.issue_number;
    } else if (eventName === 'issues' || eventName === 'issue_comment') {
      issueNumber = context.payload.issue.number;
    } else {
      console.log(`Unsupported event: ${eventName}. Exiting gracefully.`);
      return;
    }

    if (!issueNumber) {
        throw new Error("Could not determine issue number from context.");
    }

    console.log(`Processing issue #${issueNumber}`);

    // Fetch the issue and its comments
    const { data: issueData } = await octokit.rest.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
    });

    // Formatting for our bot structure
    const issue = {
      number: issueData.number,
      title: issueData.title,
      body: issueData.body || '',
      labels: issueData.labels.map(l => typeof l === 'string' ? l : l.name),
    };

    const { data: comments } = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
    });

    const result = bot.processIssue(issue, comments);

    if (!result) {
      console.log("Issue is not a P0 candidate. No action taken.");
      return;
    }

    if (result.action === 'none') {
      console.log("Issue has already been processed with the current score. Idempotent exit.");
      return;
    }

    console.log(`Determined actions for issue #${issueNumber}:`, JSON.stringify(result, null, 2));

    const payloadComment = "```json\n" + JSON.stringify(result.payload, null, 2) + "\n```";

    if (isDryRun) {
      console.log("DRY RUN ACTIVE. Would apply labels:", result.payload.applied_labels);
      console.log("DRY RUN ACTIVE. Would post comment:", payloadComment);
      return;
    }

    // Apply new labels
    // We only add labels, we don't necessarily want to remove old ones unless they are mutually exclusive like prio:P1 vs prio:P0
    const currentLabels = new Set(issue.labels);
    const labelsToAdd = result.payload.applied_labels.filter(l => !currentLabels.has(l));

    // Handle mutually exclusive labels if we are adding prio:P0, maybe remove prio:P1
    if (result.payload.applied_labels.includes('prio:P0')) {
        if(currentLabels.has('prio:P1')) {
            try {
             await octokit.rest.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                name: 'prio:P1'
             });
            } catch (e) { console.log(e); }
        }
    } else if (result.payload.applied_labels.includes('prio:P1')) {
         if(currentLabels.has('prio:P0')) {
             try {
             await octokit.rest.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                name: 'prio:P0'
             });
             } catch (e) { console.log(e); }
        }
    }


    if (labelsToAdd.length > 0) {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        labels: labelsToAdd,
      });
      console.log(`Added labels: ${labelsToAdd.join(', ')}`);
    }

    // Post comment
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body: payloadComment,
    });
    console.log(`Posted deterministic JSON payload comment.`);

  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
