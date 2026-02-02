#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  compareByCodeUnit,
  hashStringList,
  normalizeRelativePath,
  sha256Hex,
  writeDeterministicJson,
} from './lib/governance_evidence.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--') continue;
    if (current === '--policy') {
      args.policy = argv[++i];
      continue;
    }
    if (current.startsWith('--policy=')) {
      args.policy = current.split('=')[1];
      continue;
    }
    if (current === '--workflows') {
      args.workflows = argv[++i];
      continue;
    }
    if (current.startsWith('--workflows=')) {
      args.workflows = current.split('=')[1];
      continue;
    }
    if (current === '--evidence-out') {
      args.evidenceOut = argv[++i];
      continue;
    }
    if (current.startsWith('--evidence-out=')) {
      args.evidenceOut = current.split('=')[1];
      continue;
    }
    if (current === '--allowlist') {
      args.allowlist = argv[++i];
      continue;
    }
    if (current.startsWith('--allowlist=')) {
      args.allowlist = current.split('=')[1];
      continue;
    }
    if (current === '--allow-prefix-match') {
      args.allowPrefixMatch = true;
      continue;
    }
    if (current === '--help') {
      args.help = true;
      continue;
    }
    throw new Error(`Unknown arg: ${current}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: node scripts/ci/validate_policy_references.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --policy path         Policy file (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)');
  console.log('  --workflows path      Workflow directory (default: .github/workflows)');
  console.log('  --evidence-out path   Evidence output path (default: artifacts/governance/required-checks-policy.evidence.json)');
  console.log('  --allowlist path      Allowlist path (default: docs/ci/REQUIRED_CHECKS_ALLOWLIST.yml)');
  console.log('  --allow-prefix-match  Allow prefix matching (default: false)');
}

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function cartesianProduct(entries) {
  if (entries.length === 0) return [{}];
  const [[key, values], ...rest] = entries;
  const tail = cartesianProduct(rest);
  const results = [];
  for (const value of values) {
    for (const suffix of tail) {
      results.push({ ...suffix, [key]: value });
    }
  }
  return results;
}

function expandMatrix(matrix) {
  if (!matrix || typeof matrix !== 'object') {
    return [];
  }
  const entries = Object.keys(matrix)
    .sort(compareByCodeUnit)
    .filter((key) => key !== 'include' && key !== 'exclude')
    .map((key) => {
      const value = matrix[key];
      return [key, Array.isArray(value) ? value : [value]];
    });
  if (entries.length === 0) return [];
  return cartesianProduct(entries);
}

function formatMatrixSuffix(combo) {
  const keys = Object.keys(combo).sort(compareByCodeUnit);
  if (keys.length === 0) return '';
  const parts = keys.map((key) => `${key}=${combo[key]}`);
  return ` (${parts.join(', ')})`;
}

function buildCheckNamesForWorkflow(workflowPath) {
  const workflowRaw = fs.readFileSync(workflowPath, 'utf8');
  const workflow = yaml.load(workflowRaw) || {};
  const workflowName = normalizeName(workflow.name || path.basename(workflowPath));
  const checks = new Set([workflowName]);

  const jobs = workflow.jobs || {};
  for (const [jobId, job] of Object.entries(jobs)) {
    const jobName = normalizeName((job || {}).name || jobId);
    const baseId = `${workflowName} / ${normalizeName(jobId)}`;
    const baseName = `${workflowName} / ${jobName}`;
    checks.add(baseId);
    checks.add(baseName);

    const matrixCombos = expandMatrix(job?.strategy?.matrix);
    for (const combo of matrixCombos) {
      const suffix = formatMatrixSuffix(combo);
      checks.add(`${baseId}${suffix}`);
      checks.add(`${baseName}${suffix}`);
    }
  }

  return { workflowName, checks: Array.from(checks) };
}

function loadPolicy(policyPath) {
  const raw = fs.readFileSync(policyPath, 'utf8');
  const policy = yaml.load(raw) || {};
  return { raw, policy };
}

function loadAllowlist(allowlistPath) {
  const raw = fs.readFileSync(allowlistPath, 'utf8');
  const allowlist = yaml.load(raw) || {};
  return { raw, allowlist };
}

function collectPolicyNames(policy) {
  const names = [];
  const alwaysRequired = Array.isArray(policy.always_required)
    ? policy.always_required
    : [];
  const conditionalRequired = Array.isArray(policy.conditional_required)
    ? policy.conditional_required
    : [];
  for (const entry of [...alwaysRequired, ...conditionalRequired]) {
    const name = normalizeName(entry?.name);
    if (name) names.push(name);
  }
  return names;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const repoRoot = process.cwd();
  const policyPath = args.policy ?? 'docs/ci/REQUIRED_CHECKS_POLICY.yml';
  const workflowsPath = args.workflows ?? '.github/workflows';
  const evidenceOut = args.evidenceOut ?? 'artifacts/governance/required-checks-policy.evidence.json';
  const allowlistPath = args.allowlist ?? 'docs/ci/REQUIRED_CHECKS_ALLOWLIST.yml';
  const allowPrefixMatch = Boolean(args.allowPrefixMatch);

  const policyResolved = path.resolve(repoRoot, policyPath);
  const workflowsResolved = path.resolve(repoRoot, workflowsPath);
  const evidenceResolved = path.resolve(repoRoot, evidenceOut);
  const allowlistResolved = allowlistPath
    ? path.resolve(repoRoot, allowlistPath)
    : null;

  const notes = [];
  let policyRaw = '';
  let policy = {};
  let policyLoaded = false;
  try {
    const loaded = loadPolicy(policyResolved);
    policyRaw = loaded.raw;
    policy = loaded.policy;
    policyLoaded = true;
  } catch (error) {
    notes.push(`Policy load failed: ${error.message}`);
  }

  let allowlistLoaded = false;
  let allowlist = {};
  let allowlistRaw = '';
  if (allowlistResolved && fs.existsSync(allowlistResolved)) {
    try {
      const loaded = loadAllowlist(allowlistResolved);
      allowlistRaw = loaded.raw;
      allowlist = loaded.allowlist;
      allowlistLoaded = true;
    } catch (error) {
      notes.push(`Allowlist load failed: ${error.message}`);
    }
  } else if (allowlistResolved) {
    allowlistLoaded = true;
  }

  const workflowFiles = fs.existsSync(workflowsResolved)
    ? fs
        .readdirSync(workflowsResolved)
        .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
        .map((file) => path.join(workflowsResolved, file))
    : [];

  const unparsableWorkflows = [];
  const knownChecks = [];
  for (const workflowFile of workflowFiles) {
    try {
      const info = buildCheckNamesForWorkflow(workflowFile);
      knownChecks.push(...info.checks);
    } catch (error) {
      unparsableWorkflows.push(
        `${normalizeRelativePath(repoRoot, workflowFile)} - ${error.message}`,
      );
    }
  }

  const { sorted: knownChecksSorted, sha256: knownChecksSha } = hashStringList(
    knownChecks.map((value) => normalizeName(value)),
  );

  const knownChecksSet = new Set(knownChecksSorted);
  const requiredNames = collectPolicyNames(policy).sort(compareByCodeUnit);
  const allowlistedChecks = Array.isArray(allowlist.allowlisted_checks)
    ? allowlist.allowlisted_checks.map((value) => normalizeName(value))
    : [];
  const allowlistedChecksSet = new Set(allowlistedChecks);

  const missingRequiredChecks = [];
  const allowlistedChecksUsed = [];
  for (const name of requiredNames) {
    if (knownChecksSet.has(name)) continue;
    if (allowlistedChecksSet.has(name)) {
      allowlistedChecksUsed.push(name);
      continue;
    }
    if (allowPrefixMatch) {
      const prefixMatches = knownChecksSorted.filter((check) =>
        check.startsWith(name),
      );
      if (prefixMatches.length > 0) {
        notes.push(
          `Policy entry "${name}" prefix-matched ${prefixMatches.length} checks (e.g., "${prefixMatches[0]}").`,
        );
        continue;
      }
    }
    missingRequiredChecks.push(name);
  }

  const verdict =
    policyLoaded && allowlistLoaded && missingRequiredChecks.length === 0
      ? 'PASS'
      : 'FAIL';

  const evidence = {
    schema_version: 1,
    kind: 'required_checks_policy_validation',
    policy_path: normalizeRelativePath(repoRoot, policyResolved),
    policy_sha256: policyRaw ? sha256Hex(Buffer.from(policyRaw, 'utf8')) : null,
    allowlist_path: allowlistPath
      ? normalizeRelativePath(repoRoot, allowlistResolved)
      : null,
    allowlisted_checks_used: allowlistedChecksUsed.slice().sort(compareByCodeUnit),
    known_checks_count: knownChecksSorted.length,
    known_checks_sha256: knownChecksSha,
    missing_required_checks: missingRequiredChecks.slice().sort(compareByCodeUnit),
    unparsable_workflows: unparsableWorkflows.slice().sort(compareByCodeUnit),
    verdict,
  };

  if (notes.length > 0) {
    evidence.notes = notes.slice().sort(compareByCodeUnit);
  }

  writeDeterministicJson(evidenceResolved, evidence);

  if (verdict !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
