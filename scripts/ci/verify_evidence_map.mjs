import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

const DEFAULT_MAP_PATH = 'docs/ga/evidence_map.yml';

export function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--map') {
      options.map = args[i + 1];
      i += 1;
    } else if (arg === '--sha') {
      options.sha = args[i + 1];
      i += 1;
    } else if (arg === '--out') {
      options.out = args[i + 1];
      i += 1;
    } else if (arg === '--ref') {
      options.ref = args[i + 1];
      i += 1;
    } else if (arg === '--run-id') {
      options.runId = args[i + 1];
      i += 1;
    }
  }
  return options;
}

export function getGitSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.stdout?.trim() || 'unknown';
}

export function resolveTimestamp() {
  const sourceEpoch = process.env.SOURCE_DATE_EPOCH;
  if (sourceEpoch) {
    const millis = Number(sourceEpoch) * 1000;
    if (!Number.isNaN(millis)) {
      return new Date(millis).toISOString();
    }
  }
  return new Date().toISOString();
}

export function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function sha256File(filePath) {
  const content = await fs.readFile(filePath);
  return sha256Buffer(content);
}

export function resolveTemplate(value, variables) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/\$\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key]);
    }
    return match;
  });
}

export function resolveEntryPath(entryPath, variables) {
  return resolveTemplate(entryPath, variables);
}

export function validateMap(map) {
  if (!map || typeof map !== 'object') {
    throw new Error('Evidence map must be a YAML object.');
  }
  if (map.schema_version !== '1') {
    throw new Error('schema_version must be "1".');
  }
  if (!map.scope || typeof map.scope !== 'object') {
    throw new Error('scope must be defined.');
  }
  if (!Array.isArray(map.required_evidence)) {
    throw new Error('required_evidence must be an array.');
  }
  const ids = new Set();
  const allEntries = [...map.required_evidence, ...(map.optional_evidence ?? [])];
  allEntries.forEach((entry) => {
    if (!entry.id || typeof entry.id !== 'string') {
      throw new Error('Each evidence entry must include a string id.');
    }
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate evidence id found: ${entry.id}`);
    }
    ids.add(entry.id);
    if (!entry.path || typeof entry.path !== 'string') {
      throw new Error(`Evidence entry ${entry.id} must include a path.`);
    }
    if (!entry.verifier || typeof entry.verifier !== 'object') {
      throw new Error(`Evidence entry ${entry.id} must include a verifier.`);
    }
    if (!entry.verifier.type || typeof entry.verifier.type !== 'string') {
      throw new Error(`Evidence entry ${entry.id} verifier.type is required.`);
    }
    if (entry.verifier.type === 'json' && !Array.isArray(entry.verifier.required_fields)) {
      throw new Error(`Evidence entry ${entry.id} requires verifier.required_fields.`);
    }
  });
}

export function evaluateConditions(conditions, variables) {
  if (!conditions) {
    return true;
  }
  if (conditions.ref_prefix && !variables.ref?.startsWith(conditions.ref_prefix)) {
    return false;
  }
  if (conditions.ref_equals && variables.ref !== conditions.ref_equals) {
    return false;
  }
  if (conditions.env) {
    for (const [key, expected] of Object.entries(conditions.env)) {
      if (process.env[key] !== expected) {
        return false;
      }
    }
  }
  return true;
}

function findManifestEntry(manifest, entry, resolvedPath) {
  if (!manifest) {
    return null;
  }
  const entries = manifest.entries ?? [];
  return (
    entries.find((item) => item.id === entry.id) ??
    entries.find((item) => item.path === resolvedPath)
  );
}

function getFieldValue(obj, fieldPath) {
  return fieldPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function validateRequiredFields(parsed, fields) {
  const missing = [];
  for (const field of fields) {
    if (getFieldValue(parsed, field) === undefined) {
      missing.push(field);
    }
  }
  return missing;
}

function scanForSecrets(content) {
  const patterns = [
    /ghp_[A-Za-z0-9]{36,}/g,
    /github_pat_[A-Za-z0-9_]{20,}/g,
    /AKIA[0-9A-Z]{16}/g,
    /ASIA[0-9A-Z]{16}/g,
    /xox[baprs]-[A-Za-z0-9-]{10,}/g,
    /-----BEGIN PRIVATE KEY-----/g,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return `Secret pattern detected: ${match[0]}`;
    }
  }
  return null;
}

async function validateEvidenceEntry({
  entry,
  resolvedPath,
  manifest,
  sha,
  variables,
  allowGeneratedStamp,
}) {
  const result = {
    id: entry.id,
    description: entry.description ?? null,
    path: resolvedPath,
    status: 'passed',
    verifier: entry.verifier,
    messages: [],
    sha256: null,
    size_bytes: null,
    mtime: null,
  };

  if (allowGeneratedStamp) {
    result.messages.push('Stamp generated by verifier.');
    return result;
  }

  const absolutePath = path.resolve(resolvedPath);
  try {
    const stat = await fs.stat(absolutePath);
    result.size_bytes = stat.size;
    result.mtime = stat.mtime.toISOString();
  } catch {
    result.status = 'failed';
    result.messages.push(`Evidence file not found at ${resolvedPath}.`);
    return result;
  }

  const fileBuffer = await fs.readFile(absolutePath);
  result.sha256 = sha256Buffer(fileBuffer);

  const secretMessage = scanForSecrets(fileBuffer.toString('utf8'));
  if (secretMessage) {
    result.status = 'failed';
    result.messages.push(secretMessage);
  }

  if (entry.verifier?.max_age_hours) {
    const maxAgeMs = Number(entry.verifier.max_age_hours) * 60 * 60 * 1000;
    const mtime = new Date(result.mtime).getTime();
    const now = new Date(variables.now).getTime();
    if (Number.isFinite(maxAgeMs) && now - mtime > maxAgeMs) {
      result.status = 'failed';
      result.messages.push(`Evidence is older than ${entry.verifier.max_age_hours} hours.`);
    }
  }

  if (entry.verifier.type === 'sha256' || entry.verifier.must_match_manifest) {
    if (entry.verifier.must_match_manifest && !manifest) {
      result.status = 'failed';
      result.messages.push('Evidence manifest is unavailable.');
    } else {
      const manifestEntry = findManifestEntry(manifest, entry, resolvedPath);
      if (entry.verifier.must_match_manifest && !manifestEntry) {
        result.status = 'failed';
        result.messages.push('Manifest entry not found for evidence.');
      } else if (manifestEntry?.sha256 && manifestEntry.sha256 !== result.sha256) {
        result.status = 'failed';
        result.messages.push(`Digest mismatch: expected ${manifestEntry.sha256}.`);
      }
    }
  }

  if (entry.verifier.type === 'json') {
    let parsed = null;
    try {
      parsed = JSON.parse(fileBuffer.toString('utf8'));
    } catch (error) {
      result.status = 'failed';
      result.messages.push(`JSON parse failed: ${error.message}`);
    }

    if (parsed) {
      const missingFields = validateRequiredFields(parsed, entry.verifier.required_fields ?? []);
      if (missingFields.length > 0) {
        result.status = 'failed';
        result.messages.push(`Missing required fields: ${missingFields.join(', ')}`);
      }

      if (Array.isArray(entry.verifier.sha_fields)) {
        for (const field of entry.verifier.sha_fields) {
          const value = getFieldValue(parsed, field);
          if (value && value !== sha) {
            result.status = 'failed';
            result.messages.push(`SHA mismatch for ${field}: expected ${sha}.`);
          }
        }
      }
    }
  }

  if (entry.verifier.type === 'text') {
    const content = fileBuffer.toString('utf8');
    if (Array.isArray(entry.verifier.must_contain)) {
      for (const pattern of entry.verifier.must_contain) {
        if (!content.includes(pattern)) {
          result.status = 'failed';
          result.messages.push(`Missing required text: ${pattern}`);
        }
      }
    }
    if (Array.isArray(entry.verifier.must_not_contain)) {
      for (const pattern of entry.verifier.must_not_contain) {
        if (content.includes(pattern)) {
          result.status = 'failed';
          result.messages.push(`Forbidden text detected: ${pattern}`);
        }
      }
    }
  }

  return result;
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push(`# GA Evidence Map Verification Report`);
  lines.push('');
  lines.push(`- Status: ${report.status}`);
  lines.push(`- SHA: ${report.sha}`);
  lines.push(`- Ref: ${report.ref}`);
  lines.push(`- Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('| Evidence ID | Status | Path | Messages |');
  lines.push('| --- | --- | --- | --- |');
  for (const entry of report.entries) {
    const messages = entry.messages.length > 0 ? entry.messages.join(' | ') : '';
    lines.push(`| ${entry.id} | ${entry.status} | ${entry.path} | ${messages} |`);
  }
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Required: ${report.summary.required}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push(`- Skipped: ${report.summary.skipped}`);
  return `${lines.join('\n')}\n`;
}

async function loadManifest(manifestPath, sha) {
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    if (manifest.schema_version !== '1') {
      throw new Error('Manifest schema_version must be "1".');
    }
    if (manifest.sha !== sha) {
      throw new Error(`Manifest sha mismatch. Expected ${sha} but got ${manifest.sha}.`);
    }
    if (!Array.isArray(manifest.entries)) {
      throw new Error('Manifest entries must be an array.');
    }
    return manifest;
  } catch (error) {
    throw new Error(`Manifest validation failed: ${error.message}`);
  }
}

export async function runVerification(options) {
  const sha = options.sha ?? process.env.GITHUB_SHA ?? getGitSha();
  const mapPath = options.map ?? DEFAULT_MAP_PATH;
  const mapContent = await fs.readFile(mapPath, 'utf8');
  const map = yaml.load(mapContent);
  validateMap(map);

  const now = resolveTimestamp();
  const ref = options.ref ?? process.env.GITHUB_REF ?? process.env.GITHUB_REF_NAME ?? map.scope?.default_ref ?? 'local';
  const runId = options.runId ?? process.env.GITHUB_RUN_ID ?? 'local';

  const variables = {
    sha,
    ref,
    run_id: runId,
    now,
  };

  const manifestPath = resolveTemplate(
    map.scope?.manifest_path ?? path.join('artifacts', 'evidence', '${sha}', 'manifest.json'),
    variables,
  );

  const mustLoadManifest = [...map.required_evidence, ...(map.optional_evidence ?? [])].some(
    (entry) => entry.verifier?.must_match_manifest,
  );

  let manifest = null;
  let manifestError = null;
  if (mustLoadManifest) {
    try {
      manifest = await loadManifest(manifestPath, sha);
    } catch (error) {
      manifestError = error.message;
    }
  }

  const entries = [];
  const failures = [];
  const evidenceEntries = [
    ...map.required_evidence.map((entry) => ({ ...entry, required: true })),
    ...(map.optional_evidence ?? []).map((entry) => ({ ...entry, required: false })),
  ];

  for (const entry of evidenceEntries) {
    const isEligible = evaluateConditions(entry.when, variables);
    if (!isEligible) {
      entries.push({
        id: entry.id,
        description: entry.description ?? null,
        path: resolveEntryPath(entry.path, variables),
        status: 'skipped',
        verifier: entry.verifier,
        messages: ['Condition not met for this run.'],
        sha256: null,
        size_bytes: null,
        mtime: null,
      });
      continue;
    }

    const resolvedPath = resolveEntryPath(entry.path, variables);
    const allowGeneratedStamp = entry.verifier?.allow_generated === true &&
      path.resolve(resolvedPath) === path.resolve(options.out ?? path.join('artifacts', 'ga-verify', sha), 'stamp.json');

    const result = await validateEvidenceEntry({
      entry,
      resolvedPath,
      manifest,
      sha,
      variables,
      allowGeneratedStamp,
    });

    if (result.status !== 'passed' && entry.required) {
      failures.push(result);
    }

    entries.push(result);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));

  const requiredEligible = entries.filter(
    (entry) =>
      entry.status !== 'skipped' &&
      evidenceEntries.some((candidate) => candidate.id === entry.id && candidate.required),
  );

  const summary = {
    required: requiredEligible.length,
    passed: entries.filter((entry) => entry.status === 'passed').length,
    failed: entries.filter((entry) => entry.status === 'failed').length,
    skipped: entries.filter((entry) => entry.status === 'skipped').length,
  };

  const report = {
    schema_version: '1',
    status: failures.length > 0 || manifestError ? 'failed' : 'passed',
    sha,
    ref,
    run_id: runId,
    generated_at: now,
    policy: {
      map_path: mapPath,
      map_hash: sha256Buffer(Buffer.from(mapContent)),
      manifest_path: manifestPath,
      manifest_error: manifestError,
    },
    summary,
    entries,
  };

  const outDir = options.out ?? path.join('artifacts', 'ga-verify', sha);
  const reportPath = path.join(outDir, 'report.json');
  const reportMdPath = path.join(outDir, 'report.md');

  await writeJson(reportPath, report);
  await fs.mkdir(path.dirname(reportMdPath), { recursive: true });
  await fs.writeFile(reportMdPath, buildMarkdownReport(report));

  const reportHash = await sha256File(reportPath);
  const stamp = {
    status: report.status,
    sha,
    timestamp: now,
    policy_hash: report.policy.map_hash,
    report_hash: reportHash,
    report_path: path.relative(process.cwd(), reportPath),
  };
  const stampPath = path.join(outDir, 'stamp.json');
  await writeJson(stampPath, stamp);

  return { report, reportPath, reportMdPath, stampPath };
}

async function main() {
  const options = parseArgs(process.argv);
  try {
    const { report } = await runVerification(options);
    if (report.status !== 'passed') {
      process.exit(1);
    }
  } catch (error) {
    console.error(error?.stack ?? error);
    process.exit(2);
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
