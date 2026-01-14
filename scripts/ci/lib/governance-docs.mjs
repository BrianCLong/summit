import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { minimatch } from 'minimatch';

const DEFAULT_INDEX_PATH = path.join('governance', 'INDEX.yml');
const DEFAULT_EVIDENCE_MAP_PATH = path.join('governance', 'EVIDENCE_MAP.json');

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'artifacts']);

const toPosixPath = (value) => value.split(path.sep).join('/');

const normalizeEntryPath = (root, filePath) => {
  const relative = path.relative(root, filePath);
  return toPosixPath(relative);
};

const hashEvidenceId = (input) => {
  const digest = createHash('sha256').update(input).digest('hex').slice(0, 8);
  return `GOV-DOC-${digest.toUpperCase()}`;
};

const classifyType = (filePath) => {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.md')) return 'doc';
  if (lower.endsWith('.rego')) return 'policy';
  if (lower.endsWith('.schema.json')) return 'schema';
  if (lower.endsWith('.spdx.json')) return 'data';
  if (lower.endsWith('.pub')) return 'key';
  if (lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'data';
  if (lower.endsWith('.txt')) return 'bundle';
  return 'data';
};

const isDocType = (type, filePath) => {
  if (type) return type === 'doc';
  return filePath.toLowerCase().endsWith('.md');
};

const loadYamlFile = async (filePath) => {
  const content = await readFile(filePath, 'utf8');
  return yaml.load(content);
};

const writeYamlFile = async (filePath, data) => {
  const content = yaml.dump(data, { lineWidth: 120, noRefs: true });
  await writeFile(filePath, content, 'utf8');
};

const listFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const childDir = path.join(dir, entry.name);
      const childFiles = await listFiles(childDir);
      files.push(...childFiles);
    } else if (entry.isFile()) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
};

const matchesPatterns = (value, patterns) => {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((pattern) => minimatch(value, pattern, { dot: true }));
};

export const loadGovernanceIndex = async ({ repoRoot, indexPath = DEFAULT_INDEX_PATH }) => {
  const fullPath = path.isAbsolute(indexPath)
    ? indexPath
    : path.join(repoRoot, indexPath);
  const data = await loadYamlFile(fullPath);
  return { data, fullPath };
};

export const listGovernanceFiles = async ({ repoRoot, scope }) => {
  const scopeRoot = path.join(repoRoot, scope.root);
  const files = await listFiles(scopeRoot);
  const scoped = files
    .map((filePath) => normalizeEntryPath(repoRoot, filePath))
    .filter((filePath) => matchesPatterns(filePath, scope.include))
    .filter((filePath) => !matchesPatterns(filePath, scope.exclude));
  return scoped.sort();
};

export const collectWorkflowJobNames = async (repoRoot) => {
  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  const workflowFiles = await listFiles(workflowsDir);
  const jobNames = new Set();
  for (const filePath of workflowFiles) {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) continue;
    if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) continue;
    let parsed;
    try {
      parsed = await loadYamlFile(filePath);
    } catch (error) {
      continue;
    }
    if (!parsed || typeof parsed !== 'object') continue;
    const jobs = parsed.jobs || {};
    for (const [jobId, job] of Object.entries(jobs)) {
      if (job && typeof job === 'object' && job.name) {
        jobNames.add(String(job.name));
      }
      jobNames.add(String(jobId));
    }
  }
  return Array.from(jobNames);
};

export const validateGovernanceIndex = ({ index, files, workflowJobNames }) => {
  const entries = Array.isArray(index.entries) ? index.entries : [];
  const paths = entries.map((entry) => entry.path).filter(Boolean);
  const uniquePaths = new Set(paths);

  const duplicatePaths = paths.filter((value, idx) => paths.indexOf(value) !== idx);

  const missingPaths = files.filter((filePath) => !uniquePaths.has(filePath));
  const extraPaths = paths.filter((entryPath) => !files.includes(entryPath));

  const invalidEntries = entries.filter((entry) => {
    if (!entry || typeof entry !== 'object') return true;
    if (!entry.path || !entry.type || !entry.status || !entry.owner) return true;
    if (isDocType(entry.type, entry.path) && !entry.evidence_id) return true;
    return false;
  });

  const evidenceIds = entries
    .filter((entry) => isDocType(entry.type, entry.path))
    .map((entry) => entry.evidence_id)
    .filter(Boolean);
  const duplicateEvidenceIds = evidenceIds.filter(
    (value, idx) => evidenceIds.indexOf(value) !== idx,
  );

  const gates = Array.isArray(index.gates) ? index.gates : [];
  const missingGates = gates.filter((gate) => !workflowJobNames.includes(gate));

  return {
    missingPaths,
    extraPaths,
    invalidEntries,
    duplicatePaths,
    duplicateEvidenceIds,
    missingGates,
  };
};

export const syncGovernanceIndex = ({ index, files }) => {
  const entries = Array.isArray(index.entries) ? index.entries : [];
  const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));

  const syncedEntries = files.map((filePath) => {
    const existing = entriesByPath.get(filePath);
    if (existing) return existing;
    const type = classifyType(filePath);
    const isDoc = isDocType(type, filePath);
    return {
      path: filePath,
      type,
      status: 'active',
      owner: 'Governance',
      ...(isDoc ? { evidence_id: hashEvidenceId(filePath) } : {}),
    };
  });

  syncedEntries.sort((a, b) => a.path.localeCompare(b.path));

  return {
    ...index,
    entries: syncedEntries,
  };
};

export const loadEvidenceMap = async ({ repoRoot, evidenceMapPath = DEFAULT_EVIDENCE_MAP_PATH }) => {
  const fullPath = path.isAbsolute(evidenceMapPath)
    ? evidenceMapPath
    : path.join(repoRoot, evidenceMapPath);
  const raw = await readFile(fullPath, 'utf8');
  const data = JSON.parse(raw);
  return { data, fullPath };
};

export const validateEvidenceMap = ({ index, evidenceMap }) => {
  const indexEntries = Array.isArray(index.entries) ? index.entries : [];
  const indexEvidence = indexEntries
    .filter((entry) => isDocType(entry.type, entry.path))
    .map((entry) => ({ evidence_id: entry.evidence_id, path: entry.path }))
    .filter((entry) => entry.evidence_id);

  const mapEntries = Array.isArray(evidenceMap.entries) ? evidenceMap.entries : [];
  const mapEvidence = mapEntries
    .filter((entry) => entry && entry.evidence_id)
    .map((entry) => ({ evidence_id: entry.evidence_id, path: entry.path }));

  const indexIds = indexEvidence.map((entry) => entry.evidence_id);
  const mapIds = mapEvidence.map((entry) => entry.evidence_id);

  const missingInMap = indexIds.filter((id) => !mapIds.includes(id));
  const extraInMap = mapIds.filter((id) => !indexIds.includes(id));

  const duplicateMapIds = mapIds.filter((id, idx) => mapIds.indexOf(id) !== idx);
  const duplicateIndexIds = indexIds.filter((id, idx) => indexIds.indexOf(id) !== idx);

  const pathMismatch = mapEvidence
    .map((entry) => {
      const match = indexEvidence.find((item) => item.evidence_id === entry.evidence_id);
      if (!match) return null;
      if (match.path !== entry.path) {
        return {
          evidence_id: entry.evidence_id,
          index_path: match.path,
          map_path: entry.path,
        };
      }
      return null;
    })
    .filter(Boolean);

  return {
    missingInMap,
    extraInMap,
    duplicateMapIds,
    duplicateIndexIds,
    pathMismatch,
  };
};

export const writeGovernanceIndex = async ({ fullPath, index }) => {
  await writeYamlFile(fullPath, index);
};
