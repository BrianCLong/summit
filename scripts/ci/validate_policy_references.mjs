#!/usr/bin/env node
/**
 * Policy Reference Validator (Unified)
 *
 * Cross-references REQUIRED_CHECKS_POLICY.yml against actual workflow files.
 * Supports matrix expansion, levenshtein suggestions, and evidence generation.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  normalizeRelativePath,
  sha256Hex,
  writeDeterministicJson,
} from './lib/governance_evidence.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const MAX_SUGGESTIONS = 3;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--') continue;
    if (current === '--policy') { args.policy = argv[++i]; continue; }
    if (current.startsWith('--policy=')) { args.policy = current.split('=')[1]; continue; }
    if (current === '--workflows') { args.workflows = argv[++i]; continue; }
    if (current.startsWith('--workflows=')) { args.workflows = current.split('=')[1]; continue; }
    if (current === '--evidence-out') { args.evidenceOut = argv[++i]; continue; }
    if (current.startsWith('--evidence-out=')) { args.evidenceOut = current.split('=')[1]; continue; }
    if (current === '--allowlist') { args.allowlist = argv[++i]; continue; }
    if (current.startsWith('--allowlist=')) { args.allowlist = current.split('=')[1]; continue; }
    if (current === '--help') { args.help = true; continue; }
  }
  return args;
}

function levenshtein(a, b) {
  const matrix = [];
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;
  for (let i = 0; i <= bLen; i++) matrix[i] = [i];
  for (let j = 0; j <= aLen; j++) matrix[0][j] = j;
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bLen][aLen];
}

function findClosestMatches(target, candidates, maxResults = MAX_SUGGESTIONS) {
  const targetLower = target.toLowerCase();
  const scored = [];
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    if (targetLower === candidateLower) continue;
    const distance = levenshtein(targetLower, candidateLower);
    const containsTarget = candidateLower.includes(targetLower);
    const targetContains = targetLower.includes(candidateLower);
    let score = distance;
    if (containsTarget || targetContains) score = Math.min(score, distance * 0.5);
    scored.push({ candidate, distance, score });
  }
  scored.sort((a, b) => a.score !== b.score ? a.score - b.score : a.candidate.localeCompare(b.candidate));
  const maxDistance = Math.max(target.length * 0.5, 10);
  return scored.filter(s => s.distance <= maxDistance || s.score < s.distance).slice(0, maxResults).map(s => s.candidate);
}

export function normalizeCheckName(value) {
  if (typeof value !== 'string') return '';
  return value.replace(ANSI_PATTERN, '').replace(/\s+/g, ' ').trim();
}

function resolveTemplate(template, matrixCombo) {
  let result = template;
  for (const [key, value] of Object.entries(matrixCombo)) {
    const escapedKey = String(key).replace(/\./g, '\\.');
    const regex = new RegExp('\$\s*\{\{\s*matrix\.' + escapedKey + '\s*\}\}', 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

export function expandMatrix(matrix) {
  if (!matrix || typeof matrix !== 'object') return [];
  const { include = [], exclude = [], ...dimensions } = matrix;
  const keys = Object.keys(dimensions).filter(k => Array.isArray(dimensions[k]));
  if (keys.length === 0 && include.length === 0) return [];
  let combinations = [{}];
  for (const key of keys) {
    const next = [];
    for (const combo of combinations) {
      for (const value of dimensions[key]) next.push({ ...combo, [key]: value });
    }
    combinations = next;
  }
  if (exclude.length > 0) {
    combinations = combinations.filter(combo => !exclude.some(ex => Object.entries(ex).every(([k, v]) => String(combo[k]) === String(v))));
  }
  if (include.length > 0) {
    for (const inc of include) {
      let matched = false;
      for (let i = 0; i < combinations.length; i++) {
        if (Object.keys(inc).every(k => !(k in dimensions) || String(combinations[i][k]) === String(inc[k]))) {
          combinations[i] = { ...combinations[i], ...inc };
          matched = true;
        }
      }
      if (!matched) combinations.push(inc);
    }
  }
  return combinations;
}

export function extractCheckNames(workflow, fileName) {
  const checkNames = new Set();
  const workflowName = normalizeCheckName(workflow?.name || fileName.replace(/\.ya?ml$/, ''));
  checkNames.add(workflowName);
  if (!workflow?.jobs) return checkNames;
  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    const jobNameTemplate = job?.name || jobId;
    if (job?.strategy?.matrix) {
      const matrixCombinations = expandMatrix(job.strategy.matrix);
      if (matrixCombinations.length > 0) {
        for (const comboObj of matrixCombinations) {
          const resolvedJobName = normalizeCheckName(resolveTemplate(jobNameTemplate, comboObj));
          if (job?.name) {
            checkNames.add(resolvedJobName);
            checkNames.add(normalizeCheckName(`${workflowName} / ${resolvedJobName}`));
          } else {
            const values = Object.values(comboObj).map(String).join(', ');
            const ghDefaultName = normalizeCheckName(`${jobId} (${values})`);
            checkNames.add(ghDefaultName);
            checkNames.add(normalizeCheckName(`${workflowName} / ${ghDefaultName}`));
          }
        }
      }
      checkNames.add(normalizeCheckName(jobNameTemplate));
    } else {
      const jobName = normalizeCheckName(jobNameTemplate);
      checkNames.add(jobName);
      checkNames.add(normalizeCheckName(`${workflowName} / ${jobName}`));
    }
    checkNames.add(normalizeCheckName(jobId));
  }
  return checkNames;
}

function loadWorkflows(workflowsDir) {
  const resolved = resolve(workflowsDir);
  const workflows = new Map();
  if (!existsSync(resolved)) return workflows;
  const files = readdirSync(resolved).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  for (const file of files) {
    try {
      const parsed = yaml.load(readFileSync(join(resolved, file), 'utf8'));
      workflows.set(file, extractCheckNames(parsed, file));
    } catch {} // eslint-disable-line no-empty
  }
  return workflows;
}

function extractPolicyReferences(policy) {
  const references = [];
  const add = (arr, section) => {
    if (Array.isArray(arr)) {
      for (const check of arr) {
        if (check?.name) references.push({ name: normalizeCheckName(check.name), workflow: check.workflow, section });
      }
    }
  };
  add(policy.always_required, 'always_required');
  add(policy.conditional_required, 'conditional_required');
  if (policy.branch_protection?.required_status_checks?.contexts) {
    for (const context of policy.branch_protection.required_status_checks.contexts) {
      references.push({ name: normalizeCheckName(context), workflow: null, section: 'branch_protection.contexts' });
    }
  }
  return references;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const policyPath = args.policy || 'docs/ci/REQUIRED_CHECKS_POLICY.yml';
  const workflowsDir = args.workflows || '.github/workflows';
  const evidenceOut = args.evidenceOut || 'artifacts/governance/required-checks-policy.evidence.json';
  const allowlistPath = args.allowlist || 'docs/ci/REQUIRED_CHECKS_ALLOWLIST.yml';

  console.log('Policy Reference Validator (Hardened)');

  let policyRaw = '';
  let policy = {};
  try {
    policyRaw = readFileSync(resolve(ROOT, policyPath), 'utf8');
    policy = yaml.load(policyRaw);
  } catch (err) {
    console.error(`❌ Failed to load policy: ${err.message}`);
    process.exit(1);
  }

  const workflows = loadWorkflows(resolve(ROOT, workflowsDir));
  const references = extractPolicyReferences(policy);
  const allowlist = existsSync(resolve(ROOT, allowlistPath)) ? yaml.load(readFileSync(resolve(ROOT, allowlistPath), 'utf8')) : {};
  const allowlistedSet = new Set((allowlist.allowlisted_checks || []).map(normalizeCheckName));

  const allCheckNamesSet = new Set();
  for (const names of workflows.values()) {
    for (const name of names) allCheckNamesSet.add(name);
  }

  const missingRequiredChecks = [];
  const allowlistedUsed = [];
  let errors = 0;

  for (const ref of references) {
    if (ref.workflow && !workflows.has(ref.workflow)) {
      console.error(`❌ Workflow file "${ref.workflow}" not found (referenced by "${ref.name}")`);
      errors++;
      missingRequiredChecks.push(ref.name);
      continue;
    }
    const checkSet = ref.workflow ? workflows.get(ref.workflow) : allCheckNamesSet;
    if (!checkSet.has(ref.name)) {
      if (allowlistedSet.has(ref.name)) {
        allowlistedUsed.push(ref.name);
        continue;
      }
      const suggestions = findClosestMatches(ref.name, Array.from(checkSet));
      console.error(`❌ Check "${ref.name}" not found in ${ref.workflow || 'any workflow'}`);
      if (suggestions.length > 0) console.error(`   Did you mean: ${suggestions.join(', ')}?`);
      errors++;
      missingRequiredChecks.push(ref.name);
    }
  }

  const verdict = errors === 0 ? 'PASS' : 'FAIL';
  const evidence = {
    schema_version: 1,
    kind: 'required_checks_policy_validation',
    policy_path: normalizeRelativePath(ROOT, resolve(ROOT, policyPath)),
    policy_sha256: sha256Hex(Buffer.from(policyRaw, 'utf8')),
    allowlisted_checks_used: allowlistedUsed.sort(),
    known_checks_count: allCheckNamesSet.size,
    missing_required_checks: missingRequiredChecks.sort(),
    verdict
  };

  writeDeterministicJson(resolve(ROOT, evidenceOut), evidence);

  if (errors > 0) {
    console.error(`\nFound ${errors} policy reference errors.`);
    process.exit(1);
  }
  console.log('✅ All policy references validated against workflows.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}