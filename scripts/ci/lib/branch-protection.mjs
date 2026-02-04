import {
  execFile
} from 'node:child_process';
import {
  createHash
} from 'node:crypto';
import {
  readFileSync
} from 'node:fs';
import {
  resolve
} from 'node:path';
import yaml from 'js-yaml';

export const VerificationState = {
  VERIFIED_MATCH: 'VERIFIED_MATCH',
  VERIFIED_DRIFT: 'VERIFIED_DRIFT',
  UNVERIFIABLE_PERMISSIONS: 'UNVERIFIABLE_PERMISSIONS',
  UNVERIFIABLE_ERROR: 'UNVERIFIABLE_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  NO_PROTECTION: 'NO_PROTECTION'
};

class GitHubApiError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status ?? null;
    this.kind = kind ?? 'unknown';
  }
}

function normalizeContexts(contexts) {
  const cleaned = contexts.filter(v => typeof v === 'string').map(v => v.trim()).filter(v => v.length > 0);
  return Array.from(new Set(cleaned)).sort();
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortKeysDeep(value[key]);
    return sorted;
  }
  return value;
}

function stableJson(value) { return `${JSON.stringify(sortKeysDeep(value), null, 2)}
`; }
function hashObject(value) { return createHash('sha256').update(stableJson(value)).digest('hex'); }

async function execFileAsync(command, args, options = {}) {
  const mergedEnv = { ...process.env, GH_PAGER: 'cat', GITHUB_PAGER: 'cat', LESS: 'FRSX' };
  return new Promise((res, rej) => {
    execFile(command, args, { ...options, env: mergedEnv }, (err, stdout, stderr) => {
      if (err) rej(new Error(stderr || err.message)); else res({ stdout, stderr });
    });
  });
}

let ghAvailable;
async function isGhAvailable() {
  if (ghAvailable !== undefined) return ghAvailable;
  try { await execFileAsync('gh', ['--version']); ghAvailable = true; } catch { ghAvailable = false; }
  return ghAvailable;
}

async function ghApi(endpoint, options = {}) {
  const args = ['api', endpoint, '-H', 'Accept: application/vnd.github+json'];
  if (options.method) args.push('--method', options.method);
  if (options.input) args.push('--input', '-');
  const execOptions = options.input ? { input: options.input, maxBuffer: 10 * 1024 * 1024 } : { maxBuffer: 10 * 1024 * 1024 };
  const result = await execFileAsync('gh', args, execOptions);
  return result.stdout;
}

export function classifyHttpError(status, headers, body) {
  const normalizedMessage = String(typeof body === 'string' ? body : body?.message || '').toLowerCase();
  if (status === 403) {
    const remaining = headers?.get?.('X-RateLimit-Remaining') ?? headers?.['x-ratelimit-remaining'];
    if (remaining === '0' || remaining === 0 || normalizedMessage.includes('rate limit')) 
      return { state: VerificationState.RATE_LIMITED, message: 'Rate limit exceeded' };
    const message = typeof body === 'string' ? body : body?.message ?? 'Forbidden';
    if (message.includes('Must have admin rights') || message.includes('Resource not accessible')) 
      return { state: VerificationState.UNVERIFIABLE_PERMISSIONS, message };
    return { state: VerificationState.UNVERIFIABLE_ERROR, message: `403: ${message}` };
  }
  if (status === 404) return { state: VerificationState.NO_PROTECTION, message: 'Branch protection not configured' };
  const message = typeof body === 'string' ? body : body?.message ?? `HTTP ${status}`;
  return { state: VerificationState.UNVERIFIABLE_ERROR, message };
}

export async function fetchRequiredStatusChecks({ repo, branch }) {
  const endpoint = `repos/${repo}/branches/${branch}/protection/required_status_checks`;
  if (await isGhAvailable()) {
    try {
      const output = await ghApi(endpoint);
      const res = normalizeRequiredStatusChecks(JSON.parse(output), 'gh');
      res.state = VerificationState.VERIFIED_MATCH;
      return res;
    } catch (err) {
      const status = Number(err.message.match(/\b(\d{3})\b/)?.[1] || 0);
      if (status) return { ...classifyHttpError(status, {}, { message: err.message }), required_contexts: [], strict: false };
      throw err;
    }
  }
  
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return { state: VerificationState.UNVERIFIABLE_ERROR, required_contexts: [], strict: false, error: 'Missing GITHUB_TOKEN or GH_TOKEN' };
  }

  try {
    const response = await fetch(`https://api.github.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!response.ok) {
      let body;
      try { body = await response.json(); } catch { body = await response.text(); }
      return { ...classifyHttpError(response.status, response.headers, body), required_contexts: [], strict: false };
    }
    const data = await response.json();
    const res = normalizeRequiredStatusChecks(data, 'https');
    res.state = VerificationState.VERIFIED_MATCH;
    return res;
  } catch (error) {
    return { state: VerificationState.UNVERIFIABLE_ERROR, required_contexts: [], strict: false, error: error.message };
  }
}

function normalizeRequiredStatusChecks(data, source) {
  const contexts = [];
  if (Array.isArray(data?.contexts)) contexts.push(...data.contexts);
  if (Array.isArray(data?.checks)) for (const c of data.checks) if (c?.context) contexts.push(c.context);
  return { strict: Boolean(data?.strict), required_contexts: normalizeContexts(contexts), source };
}

export function loadPolicy(policyPath) {
  const parsed = yaml.load(readFileSync(resolve(policyPath), 'utf8'));
  const req = parsed?.branch_protection?.required_status_checks;
  if (!req) throw new Error('Invalid policy');
  return {
    branch: parsed.branch_protection.branch,
    required_status_checks: {
      strict: Boolean(req.strict),
      required_contexts: normalizeContexts(req.contexts || [])
    }
  };
}

export function computeDiff(p, a) {
  const m = p.required_status_checks.required_contexts.filter(c => !a.required_contexts.includes(c));
  const e = a.required_contexts.filter(c => !p.required_status_checks.required_contexts.includes(c));
  return { missing_in_github: m, extra_in_github: e, strict_mismatch: p.required_status_checks.strict !== a.strict };
}

function parseRemoteRepo(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

export async function inferRepoFromGit() {
  try {
    const { stdout } = await execFileAsync('git', ['config', '--get', 'remote.origin.url']);
    return parseRemoteRepo(stdout.trim());
  } catch { return null; }
}

export {
  GitHubApiError,
  ghApi,
  hashObject,
  normalizeContexts,
  sortKeysDeep,
  stableJson,
  stableJson as stableJsonExport
};