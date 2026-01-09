#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import yargsParser from 'yargs-parser';

const DEPLOYMENT_PROFILES_PATH = 'configs/deploy/DEPLOYMENT_PROFILES.yaml';
const ARTIFACTS_DIR = 'artifacts/deploy';

async function main() {
  const args = yargsParser(process.argv.slice(2));
  const { profile, mode = 'dry-run' } = args;

  if (!profile) {
    console.error('Usage: ./scripts/deploy/plan_deploy.mjs --profile <profile_name>');
    process.exit(1);
  }

  // Create artifacts directory if it doesn't exist
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  // Load deployment profiles
  const profilesFile = fs.readFileSync(DEPLOYMENT_PROFILES_PATH, 'utf8');
  const allProfiles = yaml.load(profilesFile).profiles;
  const selectedProfile = allProfiles.find((p) => p.name === profile);

  if (!selectedProfile) {
    console.error(`Profile "${profile}" not found in ${DEPLOYMENT_PROFILES_PATH}`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const plan = {
    profile: selectedProfile,
    mode,
    timestamp,
    steps: [],
  };

  // 1. Preflight checks
  plan.steps.push({
    name: 'Run preflight checks',
    commands: [
      'pnpm ga:verify --profile ' + selectedProfile.name,
      'pnpm risk:validate --tenant ' + selectedProfile.tenant_profile,
    ],
  });

  // 2. Orchestration steps
  if (selectedProfile.primary_orchestration === 'docker-compose') {
    plan.steps.push({
      name: 'Deploy with Docker Compose',
      commands: [
        `docker-compose -f compose/docker-compose.yml -f compose/deploy/docker-compose.${selectedProfile.name}.yml up -d`,
      ],
    });
  } else if (selectedProfile.primary_orchestration === 'helm') {
    plan.steps.push({
      name: 'Deploy with Helm',
      commands: [
        `helm upgrade --install summit charts/summit -f charts/summit/values.yaml -f charts/summit/values.${selectedProfile.name}.yaml`,
      ],
    });
  }

  // 3. Post-flight checks
  plan.steps.push({
    name: 'Run post-flight checks',
    commands: ['pnpm deploy:smoke_check --profile ' + selectedProfile.name],
  });

  // Write artifacts
  const baseFilename = path.join(ARTIFACTS_DIR, `PLAN_${profile}_${timestamp}`);
  fs.writeFileSync(`${baseFilename}.json`, JSON.stringify(plan, null, 2));

  let markdown = `# Deployment Plan: ${profile}\n\n`;
  markdown += `* **Mode:** ${mode}\n`;
  markdown += `* **Timestamp:** ${timestamp}\n\n`;
  plan.steps.forEach((step) => {
    markdown += `## ${step.name}\n`;
    step.commands.forEach((cmd) => {
      markdown += `\`\`\`sh\n${cmd}\n\`\`\`\n`;
    });
  });
  fs.writeFileSync(`${baseFilename}.md`, markdown);

  console.log(`Deployment plan generated at ${baseFilename}.json and ${baseFilename}.md`);

  // Output the JSON filename for the run script
  console.log(baseFilename + '.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
