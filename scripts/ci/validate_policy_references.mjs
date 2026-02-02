#!/usr/bin/env node
/**
 * Policy Reference Validator
 *
 * Cross-references REQUIRED_CHECKS_POLICY.yml against actual workflow files
 * to ensure policy doesn't reference non-existent workflows or checks.
 *
 * Exit codes:
 * 0 = All references valid
 * 1 = Invalid references found
 * 2 = Configuration error
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import yaml from 'js-yaml';

const POLICY_PATH = 'docs/ci/REQUIRED_CHECKS_POLICY.yml';
const WORKFLOWS_DIR = '.github/workflows';
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const MAX_SUGGESTIONS = 3;

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const matrix = [];
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

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

/**
 * Find closest matching strings using Levenshtein distance.
 */
function findClosestMatches(target, candidates, maxResults = MAX_SUGGESTIONS) {
  const targetLower = target.toLowerCase();
  const scored = [];

  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();

    // Exact match shortcut
    if (targetLower === candidateLower) {
      continue;
    }

    // Calculate distance
    const distance = levenshtein(targetLower, candidateLower);

    // Also check substring containment as a strong signal
    const containsTarget = candidateLower.includes(targetLower);
    const targetContains = targetLower.includes(candidateLower);

    // Score: prefer lower distance, boost containment matches
    let score = distance;
    if (containsTarget || targetContains) {
      score = Math.min(score, distance * 0.5);
    }

    scored.push({ candidate, distance, score });
  }

  // Sort by score, then alphabetically for stability
  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.candidate.localeCompare(b.candidate);
  });

  // Filter to reasonable matches (distance < 50% of target length or containment)
  const maxDistance = Math.max(target.length * 0.5, 10);
  return scored
    .filter(s => s.distance <= maxDistance || s.score < s.distance)
    .slice(0, maxResults)
    .map(s => s.candidate);
}

function parseArgs(argv) {
  const args = { policy: POLICY_PATH, workflows: WORKFLOWS_DIR };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--policy' && argv[i + 1]) {
      args.policy = argv[++i];
    } else if (arg.startsWith('--policy=')) {
      args.policy = arg.split('=')[1];
    } else if (arg === '--workflows' && argv[i + 1]) {
      args.workflows = argv[++i];
    } else if (arg.startsWith('--workflows=')) {
      args.workflows = arg.split('=')[1];
    } else if (arg === '--help') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log('Usage: node validate_policy_references.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --policy <path>     Policy file (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)');
  console.log('  --workflows <dir>   Workflows directory (default: .github/workflows)');
  console.log('  --help              Show this help');
}

function normalizeCheckName(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(ANSI_PATTERN, '').replace(/\s+/g, ' ').trim();
}

/**
 * Load and parse the policy file.
 */
function loadPolicy(policyPath) {
  const resolved = resolve(policyPath);
  if (!existsSync(resolved)) {
    throw new Error(`Policy file not found: ${resolved}`);
  }
  const raw = readFileSync(resolved, 'utf8');
  return yaml.load(raw);
}

/**
 * Load all workflow files and extract job names.
 * Returns Map<workflowFileName, Set<checkNames>>
 */
function loadWorkflows(workflowsDir) {
  const resolved = resolve(workflowsDir);
  if (!existsSync(resolved)) {
    throw new Error(`Workflows directory not found: ${resolved}`);
  }

  const workflows = new Map();
  const files = readdirSync(resolved).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    const filePath = join(resolved, file);
    try {
      const raw = readFileSync(filePath, 'utf8');
      const parsed = yaml.load(raw);
      const checkNames = extractCheckNames(parsed, file);
      workflows.set(file, checkNames);
    } catch (error) {
      console.warn(`Warning: Could not parse ${file}: ${error.message}`);
    }
  }

  return workflows;
}

/**
 * Extract all possible check names from a workflow definition.
 * Handles matrix jobs by expanding combinations.
 */
function extractCheckNames(workflow, fileName) {
  const checkNames = new Set();
  const workflowName = normalizeCheckName(
    workflow?.name || fileName.replace(/\.ya?ml$/, ''),
  );

  if (!workflow?.jobs) {
    return checkNames;
  }

  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    const jobName = normalizeCheckName(job?.name || jobId);
    const jobIdName = normalizeCheckName(jobId);

    // Handle matrix jobs
    if (job?.strategy?.matrix) {
      const matrixCombinations = expandMatrix(job.strategy.matrix);
      if (matrixCombinations.length > 0) {
        for (const combo of matrixCombinations) {
          // Format: "Job Name (value1, value2, ...)"
          const suffix = combo.join(', ');
          checkNames.add(normalizeCheckName(`${jobName} (${suffix})`));
          checkNames.add(normalizeCheckName(`${jobIdName} (${suffix})`));
          checkNames.add(normalizeCheckName(`${workflowName} / ${jobName} (${suffix})`));
          checkNames.add(normalizeCheckName(`${workflowName} / ${jobIdName} (${suffix})`));
        }
      }
      // Also add the base name for partial matching
      checkNames.add(jobName);
      checkNames.add(jobIdName);
    } else {
      checkNames.add(jobName);
      checkNames.add(jobIdName);
    }

    // Some workflows use the format "Workflow / Job"
    checkNames.add(normalizeCheckName(`${workflowName} / ${jobName}`));
    checkNames.add(normalizeCheckName(`${workflowName} / ${jobIdName}`));
  }

  checkNames.add(workflowName);

  return checkNames;
}

/**
 * Expand matrix combinations into arrays of values.
 */
function expandMatrix(matrix) {
  // Handle exclude/include specially
  const { include, exclude, ...dimensions } = matrix;

  const keys = Object.keys(dimensions).filter(k => Array.isArray(dimensions[k]));
  if (keys.length === 0) {
    return [];
  }

  // Generate all combinations
  function combine(keys, index, current) {
    if (index === keys.length) {
      return [current.slice()];
    }
    const key = keys[index];
    const values = dimensions[key];
    const results = [];
    for (const value of values) {
      current.push(String(value));
      results.push(...combine(keys, index + 1, current));
      current.pop();
    }
    return results;
  }

  return combine(keys, 0, []);
}

/**
 * Extract all check references from the policy.
 */
function extractPolicyReferences(policy) {
  const references = [];

  // Always required checks
  if (Array.isArray(policy.always_required)) {
    for (const check of policy.always_required) {
      references.push({
        name: normalizeCheckName(check.name),
        workflow: check.workflow,
        section: 'always_required'
      });
    }
  }

  // Conditional required checks
  if (Array.isArray(policy.conditional_required)) {
    for (const check of policy.conditional_required) {
      references.push({
        name: normalizeCheckName(check.name),
        workflow: check.workflow,
        section: 'conditional_required'
      });
    }
  }

  // Informational checks
  if (Array.isArray(policy.informational)) {
    for (const check of policy.informational) {
      references.push({
        name: normalizeCheckName(check.name),
        workflow: check.workflow,
        section: 'informational'
      });
    }
  }

  // Branch protection contexts
  if (policy.branch_protection?.required_status_checks?.contexts) {
    for (const context of policy.branch_protection.required_status_checks.contexts) {
      references.push({
        name: normalizeCheckName(context),
        workflow: null,
        section: 'branch_protection.contexts'
      });
    }
  }

  return references;
}

/**
 * Validate policy references against actual workflows.
 */
function validateReferences(references, workflows) {
  const errors = [];

  // Build a sorted array of all known check names across all workflows
  const allCheckNames = [];
  for (const [fileName, names] of workflows) {
    for (const name of names) {
      const normalized = normalizeCheckName(name);
      if (normalized && !allCheckNames.includes(normalized)) {
        allCheckNames.push(normalized);
      }
    }
  }
  allCheckNames.sort();

  // Build a sorted array of all workflow file names
  const allWorkflowFiles = Array.from(workflows.keys()).sort();

  for (const ref of references) {
    // Check if workflow file exists (if specified)
    if (ref.workflow && !allWorkflowFiles.includes(ref.workflow)) {
      const suggestions = findClosestMatches(ref.workflow, allWorkflowFiles);
      let message = `Workflow file "${ref.workflow}" not found (referenced by "${ref.name}" in ${ref.section})`;
      if (suggestions.length > 0) {
        message += `\n       Did you mean: ${suggestions.map(s => `"${s}"`).join(', ')}?`;
      }
      errors.push({
        type: 'missing_workflow',
        reference: ref,
        suggestions,
        message
      });
      continue;
    }

    // For branch protection contexts, check if any workflow produces this check name
    if (ref.section === 'branch_protection.contexts') {
      const hasMatch = allCheckNames.includes(ref.name) ||
        allCheckNames.some(n =>
          n.startsWith(`${ref.name} (`) ||
          (ref.name.includes(' / ') && n.includes(ref.name.split(' / ')[1]))
        );

      if (!hasMatch) {
        const suggestions = findClosestMatches(ref.name, allCheckNames);
        let message = `Context "${ref.name}" does not match any workflow job name`;
        if (suggestions.length > 0) {
          message += `\n       Did you mean: ${suggestions.map(s => `"${s}"`).join(', ')}?`;
        }
        errors.push({
          type: 'unmatched_context',
          reference: ref,
          suggestions,
          message
        });
      }
    }

    // For named checks with workflows, verify the workflow has a matching job
    if (ref.workflow && ref.name) {
      const workflowChecks = workflows.get(ref.workflow);
      if (workflowChecks && !workflowChecks.has(ref.name)) {
        const normalized = Array.from(workflowChecks).map(normalizeCheckName).filter(Boolean).sort();
        const hasMatch = normalized.includes(ref.name) ||
          normalized.some(n => n.startsWith(`${ref.name} (`) || n.includes(ref.name));

        if (!hasMatch) {
          const suggestions = findClosestMatches(ref.name, normalized);
          let message = `Check name "${ref.name}" not found in ${ref.workflow}`;
          if (suggestions.length > 0) {
            message += `\n       Did you mean: ${suggestions.map(s => `"${s}"`).join(', ')}?`;
          }
          errors.push({
            type: 'name_mismatch',
            reference: ref,
            suggestions,
            message
          });
        }
      }
    }
  }

  return { errors };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('Policy Reference Validator');
  console.log('==========================\n');

  let policy;
  try {
    policy = loadPolicy(args.policy);
    console.log(`✓ Loaded policy: ${args.policy}`);
  } catch (error) {
    console.error(`✗ Failed to load policy: ${error.message}`);
    process.exit(2);
  }

  let workflows;
  try {
    workflows = loadWorkflows(args.workflows);
    console.log(`✓ Loaded ${workflows.size} workflow files from ${args.workflows}\n`);
  } catch (error) {
    console.error(`✗ Failed to load workflows: ${error.message}`);
    process.exit(2);
  }

  const references = extractPolicyReferences(policy);
  console.log(`Found ${references.length} policy references to validate\n`);

  const { errors } = validateReferences(references, workflows);

  if (errors.length > 0) {
    console.log('ERRORS (blocking):');
    console.log('------------------');
    for (const error of errors) {
      console.log(`  ✗ ${error.message}`);
    }
    console.log('');
  }

  if (errors.length === 0) {
    console.log('✓ All policy references are valid\n');
    process.exit(0);
  }

  console.log(`\n✗ Validation failed with ${errors.length} error(s)`);
  process.exit(1);
}

main().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(2);
});
