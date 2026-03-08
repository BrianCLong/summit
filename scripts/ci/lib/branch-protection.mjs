import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

function normalizeContexts(contexts) {
  const cleaned = contexts
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(value => value.length > 0);
  return Array.from(new Set(cleaned)).sort();
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

function hashObject(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function parseRemoteRepo(remoteUrl) {
  if (!remoteUrl || typeof remoteUrl !== 'string') return null;
  const trimmed = remoteUrl.trim();
  if (trimmed.startsWith('git@')) {
    const match = trimmed.match(/git@[^:]+:([^/]+\/[^/]+?)(\.git)?$/);
    return match ? match[1] : null;
  }
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    const match = trimmed.match(/https?:\/\/[^/]+\/([^/]+\/[^/]+?)(\.git)?$/);
    return match ? match[1] : null;
  }
  return null;
}

async function execFileAsync(command, args, options = {}) {
  const mergedEnv = {
    ...process.env,
    GH_PAGER: 'cat',
    GITHUB_PAGER: 'cat',
    LESS: 'FRSX'
  };
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { ...options, env: mergedEnv }, (error, stdout, stderr) => {
      if (error) {
        const wrapped = new Error(stderr || error.message);
        wrapped.cause = error;
        reject(wrapped);
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

let ghAvailable;
async function isGhAvailable() {
  if (ghAvailable !== undefined) {
    return ghAvailable;
  }
  try {
    await execFileAsync('gh', ['--version']);
    ghAvailable = true;
  } catch (error) {
    ghAvailable = false;
  }
  return ghAvailable;
}

async function ghApi(endpoint, options = {}) {
  const args = ['api', endpoint, '-H', 'Accept: application/vnd.github+json'];
  if (options.method) {
    args.push('--method', options.method);
  }
  if (options.input) {
    args.push('--input', '-');
  }
  const execOptions = options.input
    ? { input: options.input, maxBuffer: 10 * 1024 * 1024 }
    : { maxBuffer: 10 * 1024 * 1024 };
  const result = await execFileAsync('gh', args, execOptions);
  return result.stdout;
}

async function fetchRequiredStatusChecks({ repo, branch }) {
  const endpoint = `repos/${repo}/branches/${branch}/protection/required_status_checks`;
  if (await isGhAvailable()) {
    const output = await ghApi(endpoint);
    return parseRequiredStatusChecks(output, 'gh');
  }
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN or GH_TOKEN for GitHub API access.');
  }
  const response = await fetch(`https://api.github.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }
  const data = await response.json();
  return normalizeRequiredStatusChecks(data, 'https');
}

function parseRequiredStatusChecks(output, source) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    throw new Error(`Failed to parse GitHub API response (${source}).`);
  }
  return normalizeRequiredStatusChecks(parsed, source);
}

function normalizeRequiredStatusChecks(data, source) {
  const contexts = [];
  if (Array.isArray(data?.contexts)) {
    contexts.push(...data.contexts);
  }
  if (Array.isArray(data?.checks)) {
    for (const check of data.checks) {
      if (check && typeof check.context === 'string') {
        contexts.push(check.context);
      }
    }
  }
  return {
    strict: Boolean(data?.strict),
    required_contexts: normalizeContexts(contexts),
    source
  };
}

function loadPolicy(policyPath) {
  const resolved = resolve(policyPath);
  const raw = readFileSync(resolved, 'utf8');
  const parsed = yaml.load(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Policy file must contain a YAML object.');
  }
  const branchProtection = parsed.branch_protection;
  if (!branchProtection || typeof branchProtection !== 'object') {
    throw new Error('Policy missing branch_protection section.');
  }
  const branch = branchProtection.branch;
  if (typeof branch !== 'string' || branch.trim().length === 0) {
    throw new Error('branch_protection.branch must be a non-empty string.');
  }
  const required = branchProtection.required_status_checks;
  if (!required || typeof required !== 'object') {
    throw new Error('branch_protection.required_status_checks must be an object.');
  }
  if (typeof required.strict !== 'boolean') {
    throw new Error('branch_protection.required_status_checks.strict must be boolean.');
  }
  if (!Array.isArray(required.contexts) || required.contexts.length === 0) {
    throw new Error('branch_protection.required_status_checks.contexts must be a non-empty array.');
  }
  for (const context of required.contexts) {
    if (typeof context !== 'string' || context.trim().length === 0) {
      throw new Error('branch_protection.required_status_checks.contexts entries must be strings.');
    }
  }
  return {
    policyPath: resolved,
    branch: branch.trim(),
    required_status_checks: {
      strict: required.strict,
      required_contexts: normalizeContexts(required.contexts)
    },
    raw: parsed
  };
}

function computeDiff(policy, actual) {
  const missing = policy.required_status_checks.required_contexts.filter(
    context => !actual.required_contexts.includes(context)
  );
  const extra = actual.required_contexts.filter(
    context => !policy.required_status_checks.required_contexts.includes(context)
  );
  return {
    missing_in_github: missing,
    extra_in_github: extra,
    strict_mismatch: policy.required_status_checks.strict !== actual.strict
  };
}

async function inferRepoFromGit() {
  try {
    const { stdout } = await execFileAsync('git', ['config', '--get', 'remote.origin.url']);
    return parseRemoteRepo(stdout);
  } catch (error) {
    return null;
  }
}

export {
  computeDiff,
  fetchRequiredStatusChecks,
  ghApi,
  hashObject,
  inferRepoFromGit,
  loadPolicy,
  normalizeContexts,
  sortKeysDeep,
  stableJson
};
