#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { program } from 'commander';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const METRICS_DIR = path.join(ROOT_DIR, 'artifacts', 'delivery-metrics');

program
  .requiredOption('--type <type>', 'Event type (commit_pushed, pr_merged, deploy_started, deploy_succeeded, deploy_failed, incident_opened, incident_resolved)')
  .requiredOption('--env <env>', 'Environment (prod, staging, etc)', 'prod') // Default to prod as metrics usually care about prod
  .option('--sha <sha>', 'Commit SHA')
  .option('--repo <repo>', 'Repository name')
  .option('--author <author>', 'Commit author')
  .option('--commit-timestamp <timestamp>', 'Commit timestamp')
  .option('--merge-timestamp <timestamp>', 'Merge timestamp')
  .option('--severity <severity>', 'Incident severity')
  .option('--opened-at <timestamp>', 'Incident opened at')
  .option('--resolved-at <timestamp>', 'Incident resolved at')
  .option('--linked-deploy-id <id>', 'Linked deploy ID')
  .option('--root-cause-sha <sha>', 'Root cause SHA')
  .option('--commit', 'Commit and push the event log to the repository')
  .parse(process.argv);

const options = program.opts();

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const dayDir = path.join(METRICS_DIR, dateStr);

if (!fs.existsSync(dayDir)) {
  fs.mkdirSync(dayDir, { recursive: true });
}

const event = {
  type: options.type,
  env: options.env,
  ts: now.toISOString(),
  sha: options.sha || process.env.GITHUB_SHA,
  ...options // Spread other options
};

// Remove undefined/null/false options that were just flags or unused
delete event.commit;
// Clean up arguments that were not passed
Object.keys(event).forEach(key => event[key] === undefined && delete event[key]);

const eventLine = JSON.stringify(event);
const logFile = path.join(dayDir, 'events.ndjson');

console.log(`Writing event to ${logFile}:`, eventLine);
fs.appendFileSync(logFile, eventLine + '\n');

if (options.commit) {
  try {
    console.log('Committing metrics...');

    // Configure git if needed
    try {
      execSync('git config user.name');
    } catch (e) {
      execSync('git config user.name "github-actions[bot]"');
      execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    }

    execSync(`git add ${logFile}`);
    // Check if there are changes to commit
    try {
        execSync('git diff --cached --exit-code');
        console.log("No changes to commit.");
    } catch (e) {
        // Changes exist
        execSync(`git commit -m "chore(metrics): log ${options.type} event [skip ci]"`);

        let attempts = 0;
        const maxAttempts = 5;
        let pushed = false;

        while (!pushed && attempts < maxAttempts) {
          try {
            execSync('git pull --rebase');
            execSync('git push');
            pushed = true;
          } catch (err) {
            attempts++;
            console.error(`Push failed, retrying (${attempts}/${maxAttempts})...`);
            if (attempts === maxAttempts) throw err;
            // Wait a bit? random backoff could be good but sleep might not be available.
          }
        }
    }
  } catch (error) {
    console.error('Failed to commit metrics:', error.message);
    process.exit(1);
  }
}
