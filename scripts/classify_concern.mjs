<<<<<<< HEAD
import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs';
import yaml from 'yaml';

async function run() {
  try {
    const prNumber = parseInt(process.env.PR_NUMBER, 10);
    const token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Load concerns mapping
    const fileContents = fs.readFileSync('./governance/concerns.yml', 'utf8');
    const config = yaml.parse(fileContents);
    const concerns = config.concerns;

    // Get files changed in the PR
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber
    });

    const changedFiles = files.map(f => f.filename);

    // Simple heuristic: which concern best matches the files changed?
    // In a real implementation this would use embeddings or path mapping
    // For now we do simple string matching
    let assignedConcern = 'uncategorized';

    if (changedFiles.some(f => f.includes('.github/workflows/') || f.includes('ci'))) {
      assignedConcern = 'ci-gate';
    } else if (changedFiles.some(f => f.includes('neo4j') || f.includes('graph'))) {
      assignedConcern = 'neo4j-reconciliation';
    } else if (changedFiles.some(f => f.includes('artifacts/') || f.includes('evidence'))) {
      assignedConcern = 'artifact-evidence';
    } else if (changedFiles.some(f => f.includes('docs/governance') || f.includes('governance/'))) {
      assignedConcern = 'docs-governance';
    }

    core.setOutput('concern', assignedConcern);
    console.log(`Classified PR #${prNumber} as concern: ${assignedConcern}`);

    // Tag the PR
    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      labels: [`concern:${assignedConcern}`]
    });

  } catch (error) {
    core.setFailed(`Action failed with error ${error}`);
  }
}

run();
=======
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import yaml from 'js-yaml';

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only origin/main...HEAD').toString();
    return output.split('\n').filter(Boolean);
  } catch (e) {
    console.error('Failed to get changed files', e);
    return [];
  }
}

function classifyConcern(files, title, body, concernsMap) {
  const text = `${title} ${body} ${files.join(' ')}`.toLowerCase();

  for (const [concernName, data] of Object.entries(concernsMap)) {
    if (text.includes(concernName) || (data.keywords && data.keywords.some(k => text.includes(k)))) {
      return concernName;
    }
    if (concernName === 'ci-gate' && (text.includes('ci') || text.includes('workflow') || text.includes('github'))) {
      return concernName;
    }
    if (concernName === 'artifact-evidence' && (text.includes('artifact') || text.includes('evidence'))) {
      return concernName;
    }
  }

  return 'unknown';
}

function main() {
  try {
    const concernsPath = path.resolve(process.cwd(), 'governance/concerns.yml');
    const concernsContent = fs.readFileSync(concernsPath, 'utf8');
    const concerns = yaml.load(concernsContent);

    const changedFiles = getChangedFiles();
    const title = process.env.PR_TITLE || '';
    const body = process.env.PR_BODY || '';

    const concern = classifyConcern(changedFiles, title, body, concerns);
    console.log(`Classified concern: ${concern}`);

    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `concern=${concern}\n`);
    }
  } catch (e) {
    console.error('Error in classify_concern:', e);
    process.exitCode = 1;
  }
}

main();
>>>>>>> origin/main
