import { createHash } from 'node:crypto';
import { existsSync, promises as fsp } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export const REPO_ROOT = process.cwd();

export async function loadYamlFile(filePath, { allowEmpty = false } = {}) {
  const raw = await fsp.readFile(filePath, 'utf8');
  const parsed = yaml.load(raw);
  if (parsed === null || parsed === undefined) {
    if (allowEmpty) {
      return {};
    }
    throw new Error(`YAML file is invalid: ${filePath}`);
  }
  if (typeof parsed !== 'object') {
    throw new Error(`YAML file is invalid: ${filePath}`);
  }
  return parsed;
}

export async function loadControlMap(controlMapPath) {
  const data = await loadYamlFile(controlMapPath);
  if (!data.controls || typeof data.controls !== 'object') {
    throw new Error(`Control map missing controls: ${controlMapPath}`);
  }
  return data;
}

export async function loadControlExceptions(exceptionsPath) {
  if (!existsSync(exceptionsPath)) {
    return {};
  }
  const data = await loadYamlFile(exceptionsPath, { allowEmpty: true });
  return data || {};
}

export function normalizeCoverageStatus(status) {
  const raw = (status || '').toString().trim().toLowerCase();
  if (raw === 'covered') return 'covered';
  if (raw === 'partial' || raw === 'partially_covered' || raw === 'partial_covered') {
    return 'partially_covered';
  }
  if (raw === 'deferred' || raw === 'planned' || raw === 'not_covered') {
    return 'deferred';
  }
  return raw || 'deferred';
}

export function normalizeEvidenceEntry(entry) {
  if (typeof entry === 'string') {
    return { source: entry };
  }
  if (!entry || typeof entry !== 'object') {
    return { source: '' };
  }
  return {
    source: entry.source || entry.path || entry.artifact_path || '',
    type: entry.type || entry.evidence_type,
    producer: entry.producer,
    verification: entry.verification,
    location: entry.location || entry.artifact_location,
    artifact_path: entry.artifact_path
  };
}

export function normalizeCiArtifactPath(source) {
  const suffix = source.slice(3).replace(/[^A-Za-z0-9._-]+/g, '-');
  const fileName = suffix.endsWith('.json') ? suffix : `${suffix}.json`;
  return `ci/${fileName}`;
}

export function guessEvidenceType(source, artifactPath, location) {
  if (location === 'repo') return 'policy_doc';
  const value = `${source} ${artifactPath}`.toLowerCase();
  if (value.includes('sbom')) return 'sbom';
  if (value.includes('sarif') || value.includes('scan') || value.includes('sast') || value.includes('security')) {
    return 'security_scan';
  }
  if (value.includes('unit')) return 'unit_test';
  if (value.includes('integration') || value.includes('e2e') || value.includes('test')) {
    return 'integration_test';
  }
  return 'config_assertion';
}

export function resolveEvidenceEntry(entry) {
  const normalized = normalizeEvidenceEntry(entry);
  const source = normalized.source || '';
  let artifactLocation = normalized.location;
  let artifactPath = normalized.artifact_path;

  if (!artifactLocation) {
    artifactLocation = source.startsWith('repo/') ? 'repo' : 'bundle';
  }

  if (!artifactPath) {
    if (artifactLocation === 'repo' && source.startsWith('repo/')) {
      artifactPath = source.slice(5);
    } else if (source.startsWith('ci/')) {
      artifactPath = normalizeCiArtifactPath(source);
    } else {
      artifactPath = source;
    }
  }

  const evidenceType = normalized.type || guessEvidenceType(source, artifactPath, artifactLocation);
  const producer = normalized.producer || (artifactLocation === 'repo'
    ? 'repo-doc'
    : `ci:${source.startsWith('ci/') ? source.slice(3) : source || 'unknown'}`);
  const verification = normalized.verification || (artifactLocation === 'repo'
    ? `Review repo evidence at ${artifactPath}`
    : `Review bundle evidence at ${artifactPath}`);

  return {
    evidence_type: evidenceType,
    artifact_path: artifactPath.split(path.sep).join('/'),
    artifact_location: artifactLocation,
    producer,
    verification
  };
}

export async function hashFile(filePath) {
  const content = await fsp.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}
