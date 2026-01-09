#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yargsParser from 'yargs-parser';

const ARTIFACTS_DIR = 'artifacts/deploy';

async function main() {
  const args = yargsParser(process.argv.slice(2));
  const { profile, mode = 'dry-run' } = args;

  if (!profile) {
    console.error('Usage: ./scripts/deploy/run_deploy.mjs --profile <profile_name>');
    process.exit(1);
  }

  // 1. Generate the plan
  console.log(`Generating deployment plan for profile: ${profile}...`);
  const planOutput = execSync(`node scripts/deploy/plan_deploy.mjs --profile ${profile} --mode ${mode}`, { encoding: 'utf8' });
  const planJsonPath = planOutput.split('\n').find(line => line.endsWith('.json'));

  if (!planJsonPath) {
    console.error('Could not find plan JSON path in the output of plan_deploy.mjs');
    process.exit(1);
  }

  const plan = JSON.parse(fs.readFileSync(planJsonPath, 'utf8'));


  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const run = {
    plan,
    results: [],
    timestamp,
  };

  console.log(`\nExecuting deployment plan in ${mode} mode...`);

  for (const step of plan.steps) {
    console.log(`\n-- ${step.name} --`);
    const stepResult = {
      name: step.name,
      commands: [],
    };

    for (const command of step.commands) {
      console.log(`\n$ ${command}`);
      const commandResult = {
        command,
        stdout: '',
        stderr: '',
        error: null,
      };

      if (mode === 'apply') {
        try {
          const output = execSync(command, { encoding: 'utf8' });
          commandResult.stdout = output;
          console.log(output);
        } catch (error) {
          commandResult.error = error.message;
          commandResult.stdout = error.stdout;
          commandResult.stderr = error.stderr;
          console.error(error.stdout);
          console.error(error.stderr);
        }
      }
      stepResult.commands.push(commandResult);
    }
    run.results.push(stepResult);
  }

  // Write artifacts
  const baseFilename = path.join(ARTIFACTS_DIR, `RUN_${profile}_${timestamp}`);
  fs.writeFileSync(`${baseFilename}.json`, JSON.stringify(run, null, 2));

  let markdown = `# Deployment Run: ${profile}\n\n`;
  markdown += `* **Mode:** ${mode}\n`;
  markdown += `* **Timestamp:** ${timestamp}\n\n`;

  run.results.forEach(step => {
    markdown += `## ${step.name}\n`;
    step.commands.forEach(cmdResult => {
      markdown += `### \`${cmdResult.command}\`\n`;
      if (cmdResult.stdout) {
        markdown += `**Output:**\n\`\`\`\n${cmdResult.stdout}\n\`\`\`\n`;
      }
      if (cmdResult.stderr) {
        markdown += `**Error:**\n\`\`\`\n${cmdResult.stderr}\n\`\`\`\n`;
      }
    });
  });

  fs.writeFileSync(`${baseFilename}.md`, markdown);


  console.log(`\nDeployment run complete. Artifacts saved to ${baseFilename}.json and ${baseFilename}.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
