#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert';
import process from 'node:process';

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_SHA,
  GITHUB_API_URL = 'https://api.github.com',
  REQUIRED_CHECKS_POLICY_PATH = 'docs/ci/REQUIRED_CHECKS_POLICY.yml',
  REQUIRED_CHECKS_LEGACY_PATH = '.github/required-checks.yml',
} = process.env;

assert(GITHUB_TOKEN, 'GITHUB_TOKEN missing');
assert(GITHUB_REPOSITORY, 'GITHUB_REPOSITORY missing');
assert(GITHUB_SHA, 'GITHUB_SHA missing');

const [owner, repo] = GITHUB_REPOSITORY.split("/");

function parseRequiredChecksFromLegacy(raw) {
  const checks = [];
  let inRequiredChecks = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (/^[A-Za-z0-9_-]+:/.test(trimmed) && !trimmed.startsWith("- ")) {
      inRequiredChecks = trimmed.startsWith('required_checks:');
      continue;
    }

    if (inRequiredChecks && trimmed.startsWith("- ")) {
      checks.push(trimmed.slice(2).trim());
    }
  }

  return checks;
}

function uniqueNormalizedChecks(values) {
  const unique = new Set();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (normalized.length > 0) unique.add(normalized);
  }
  return Array.from(unique);
}

function parseChecksFromPolicyYaml(raw) {
  const checks = [];
  let inBranchProtection = false;
  let inRequiredStatusChecks = false;
  let inContexts = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.search(/\S|$/);

    if (indent === 0 && !trimmed.startsWith('- ')) {
      inBranchProtection = trimmed === 'branch_protection:';
      inRequiredStatusChecks = false;
      inContexts = false;
      continue;
    }

    if (!inBranchProtection) continue;

    if (indent <= 2 && !trimmed.startsWith('- ') && trimmed !== 'required_status_checks:') {
      inRequiredStatusChecks = false;
      inContexts = false;
      continue;
    }

    if (indent === 2 && trimmed === 'required_status_checks:') {
      inRequiredStatusChecks = true;
      inContexts = false;
      continue;
    }

    if (!inRequiredStatusChecks) continue;

    if (indent === 4 && trimmed === 'contexts:') {
      inContexts = true;
      continue;
    }

    if (inContexts && indent <= 4 && !trimmed.startsWith('- ')) {
      inContexts = false;
    }

    if (inContexts && trimmed.startsWith('- ')) {
      const value = trimmed
        .slice(2)
        .replace(/\s+#.*$/, '')
        .replace(/^['"]|['"]$/g, '')
        .trim();
      if (value) checks.push(value);
    }
  }

  return uniqueNormalizedChecks(checks);
}

function loadChecks() {
  if (fs.existsSync(REQUIRED_CHECKS_POLICY_PATH)) {
    const policyChecks = parseChecksFromPolicyYaml(
      fs.readFileSync(REQUIRED_CHECKS_POLICY_PATH, 'utf8'),
    );
    if (policyChecks.length > 0) {
      console.log(`Using required checks from policy: ${REQUIRED_CHECKS_POLICY_PATH}`);
      return policyChecks;
    }
  }

  const legacyChecks = parseRequiredChecksFromLegacy(
    fs.readFileSync(REQUIRED_CHECKS_LEGACY_PATH, 'utf8'),
  );
  const normalizedLegacyChecks = uniqueNormalizedChecks(legacyChecks);
  if (normalizedLegacyChecks.length > 0) {
    console.log(`Using required checks from legacy file: ${REQUIRED_CHECKS_LEGACY_PATH}`);
  }
  return normalizedLegacyChecks;
}

const checks = loadChecks();
assert(checks.length > 0, 'No required checks defined');
const MAX_ATTEMPTS = Number(process.env.REQUIRED_CHECKS_MAX_ATTEMPTS || 12);
const POLL_MS = Number(process.env.REQUIRED_CHECKS_POLL_MS || 5000);

async function getCheckRuns() {
  const res = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${GITHUB_SHA}/check-runs?per_page=100`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    if (res.status === 403) {
      console.warn('⚠️ Unable to read check-runs API (403). Skipping required-checks verification in this context.');
      return null;
    }
    throw new Error(`GitHub API failed: ${res.status}`);
  }
  return res.json();
}

let missing = [];
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const data = await getCheckRuns();
  if (data === null) {
    process.exit(0);
  }

  const present = new Set((data.check_runs || []).map(c => c.name));
  missing = checks.filter(c => !present.has(c));

  if (missing.length === 0) {
    console.log('✅ All required checks present');
    process.exit(0);
  }

  if (attempt < MAX_ATTEMPTS) {
    console.log(`Waiting for required checks to appear (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
  }
}

console.error('❌ Missing required checks:');
missing.forEach(c => console.error(` - ${c}`));
process.exit(1);
