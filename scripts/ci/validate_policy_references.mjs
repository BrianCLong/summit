#!/usr/bin/env node
/**
 * Policy Reference Validator
 *
 * Cross-references REQUIRED_CHECKS_POLICY.yml against actual workflow files
 * to ensure policy doesn't reference non-existent workflows or checks.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const POLICY_PATH = 'docs/ci/REQUIRED_CHECKS_POLICY.yml';
const WORKFLOWS_DIR = '.github/workflows';
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const MAX_SUGGESTIONS = 3;

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
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
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
    const regex = new RegExp('\\$\\{\\{\\s*matrix\\.' + escapedKey + '\\s*\\}\\}', 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

export function extractCheckNames(workflow, fileName) {
  const checkNames = new Set();
  const workflowName = normalizeCheckName(workflow?.name || fileName.replace(/\\.ya?ml$/, ''));
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
  checkNames.add(workflowName);
  return checkNames;
}

export function expandMatrix(matrix) {
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
  if (Array.isArray(policy.always_required)) {
    for (const check of policy.always_required) {
      references.push({ name: normalizeCheckName(check.name), workflow: check.workflow, section: 'always_required' });
    }
  }
  if (Array.isArray(policy.conditional_required)) {
    for (const check of policy.conditional_required) {
      references.push({ name: normalizeCheckName(check.name), workflow: check.workflow, section: 'conditional_required' });
    }
  }
  if (policy.branch_protection?.required_status_checks?.contexts) {
    for (const context of policy.branch_protection.required_status_checks.contexts) {
      references.push({ name: normalizeCheckName(context), workflow: null, section: 'branch_protection.contexts' });
    }
  }
  return references;
}

async function main() {
  console.log('Policy Reference Validator (Hardened)');
  const policy = yaml.load(readFileSync(resolve(POLICY_PATH), 'utf8'));
  const workflows = loadWorkflows(WORKFLOWS_DIR);
  const references = extractPolicyReferences(policy);
  
  const allCheckNamesSet = new Set();
  for (const names of workflows.values()) {
    for (const name of names) allCheckNamesSet.add(name);
  }

  let errors = 0;
  for (const ref of references) {
    if (ref.workflow && !workflows.has(ref.workflow)) {
      console.error(`❌ Workflow file "${ref.workflow}" not found (referenced by "${ref.name}")`);
      errors++;
      continue;
    }
    const checkSet = ref.workflow ? workflows.get(ref.workflow) : allCheckNamesSet;
    if (!checkSet.has(ref.name)) {
      const suggestions = findClosestMatches(ref.name, Array.from(checkSet));
      console.error(`❌ Check "${ref.name}" not found in ${ref.workflow || 'any workflow'}`);
      if (suggestions.length > 0) console.error(`   Did you mean: ${suggestions.join(', ')}?`);
      errors++;
    }
  }

  if (errors > 0) process.exit(1);
  console.log('✅ All policy references validated against workflows.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((err) => {
  console.error(err);
  process.exit(2);
});
