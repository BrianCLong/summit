#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const ADOPTERS_FILE = resolve(ROOT, '.repoos/adopters/early-adopters.json');
const FEEDBACK_FILE = resolve(ROOT, '.repoos/adopters/feedback-log.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const [key, value] = token.slice(2).split('=');
      args[key] = value ?? argv[i + 1];
      if (!token.includes('=') && argv[i + 1] && !argv[i + 1].startsWith('--')) {
        i += 1;
      }
    }
  }
  return args;
}

function required(value, name) {
  if (!value) {
    throw new Error(`Missing required argument: --${name}`);
  }
  return value;
}

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function issueApiKey(org) {
  const safe = org.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `summit_${safe}_${Date.now()}`;
}

function createWorkflowPlan() {
  return {
    setup: [
      'API key creation',
      'First project initialization',
      'Plugin installation',
      'Demo workflow execution'
    ],
    status: 'automated'
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const organizationName = required(args.organization, 'organization');
  const useCase = required(args.useCase, 'useCase');

  const adopters = await readJson(ADOPTERS_FILE);
  const existing = adopters.organizations.find(
    (org) => org.organization_name === organizationName,
  );

  if (existing) {
    throw new Error(`Organization already exists: ${organizationName}`);
  }

  const apiKey = issueApiKey(organizationName);
  const organizationRecord = {
    organization_name: organizationName,
    use_case: useCase,
    onboarding_status: 'onboarding',
    feedback_collected: false,
    onboarding_artifacts: {
      api_key: apiKey,
      project_slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
      workflow: createWorkflowPlan()
    }
  };

  adopters.organizations.push(organizationRecord);
  adopters.last_updated = new Date().toISOString();
  await writeJson(ADOPTERS_FILE, adopters);

  const feedback = await readJson(FEEDBACK_FILE);
  feedback.entries.push({
    organization_name: organizationName,
    captured_at: new Date().toISOString(),
    feature_gaps: [],
    usability_issues: [],
    integration_requests: [],
    severity: 'pending',
    owner: 'product'
  });
  await writeJson(FEEDBACK_FILE, feedback);

  process.stdout.write(
    `${JSON.stringify({ status: 'ok', organization: organizationName, apiKey }, null, 2)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
