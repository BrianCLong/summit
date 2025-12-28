#!/usr/bin/env -S node --loader ts-node/esm

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type EvidenceLinkType =
  | 'code'
  | 'test'
  | 'release'
  | 'policy'
  | 'decision'
  | 'behavior'
  | 'config'
  | 'artifact';

type EvidenceStatus = 'present' | 'missing' | 'stale';

type EvidenceAccess = 'internal' | 'auditor';

type RedactionStrategy = 'none' | 'hash' | 'mask';

interface EvidenceLink {
  type: EvidenceLinkType;
  target: string;
}

interface RetentionPolicy {
  duration: string;
  policy: string;
}

interface RedactionPolicy {
  strategy: RedactionStrategy;
  fields: string[];
}

interface EvidenceControl {
  id: string;
  claim: string;
  source: string;
  sources: string[];
  requiredLinkTypes: EvidenceLinkType[];
  links: EvidenceLink[];
  retention: RetentionPolicy;
  access: EvidenceAccess;
  redaction: RedactionPolicy;
  stalenessHours: number;
}

interface EvidenceDomain {
  id: string;
  name: string;
  controls: EvidenceControl[];
}

interface EvidenceTaxonomy {
  version: string;
  domains: EvidenceDomain[];
}

interface EvidenceArtifact {
  path: string;
  sha256: string;
  lastModified: string;
  sizeBytes: number;
}

interface EvidenceRecord {
  id: string;
  domain: string;
  controlId: string;
  claim: string;
  source: string;
  timestamp: string;
  version: {
    commit: string;
    branch: string;
    releaseTag?: string;
  };
  retention: RetentionPolicy;
  access: EvidenceAccess;
  redaction: RedactionPolicy;
  artifacts: EvidenceArtifact[];
  links: EvidenceLink[];
  status: EvidenceStatus;
}

interface EvidenceCatalog {
  schemaVersion: string;
  generatedAt: string;
  git: {
    commit: string;
    branch: string;
    shortCommit: string;
  };
  records: EvidenceRecord[];
  summary: {
    totalControls: number;
    present: number;
    missing: number;
    stale: number;
  };
}

const TAXONOMY_PATH = process.env.EVIDENCE_TAXONOMY || 'audit/evidence-taxonomy.json';
const OUTPUT_PATH = process.env.EVIDENCE_CATALOG_OUT || 'audit/evidence-catalog.json';

const ALLOWED_EXTENSIONS = new Set([
  '.json',
  '.md',
  '.txt',
  '.log',
  '.yaml',
  '.yml',
  '.csv',
  '.tgz',
  '.sha256',
  '.sig',
  '.crt',
  '.pem',
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

const optionalRun = async (command: string): Promise<string | undefined> => {
  try {
    const result = await execAsync(command);
    return result.stdout.trim();
  } catch (error) {
    return undefined;
  }
};

const resolveGitInfo = async () => {
  const commit = process.env.GITHUB_SHA || (await optionalRun('git rev-parse HEAD')) || 'unknown';
  const branch =
    process.env.GITHUB_REF_NAME ||
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF ||
    (await optionalRun('git rev-parse --abbrev-ref HEAD')) ||
    'unknown';
  const shortCommit = commit.slice(0, 12);
  return { commit, branch, shortCommit };
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const isAllowedFile = (filePath: string): boolean => {
  if (filePath.includes(`${path.sep}node_modules${path.sep}`)) return false;
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
};

const listFiles = async (dirPath: string): Promise<string[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...(await listFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && isAllowedFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
};

const sha256File = async (filePath: string): Promise<string> => {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
};

const collectArtifacts = async (sources: string[]): Promise<EvidenceArtifact[]> => {
  const root = process.cwd();
  const collected = new Map<string, EvidenceArtifact>();

  for (const source of sources) {
    const resolved = path.resolve(root, source);
    if (!(await fileExists(resolved))) continue;

    const stat = await fs.stat(resolved);
    const files = stat.isDirectory() ? await listFiles(resolved) : [resolved];

    for (const filePath of files) {
      const relativePath = path.relative(root, filePath);
      if (collected.has(relativePath)) continue;

      const fileStat = await fs.stat(filePath);
      const sha256 = await sha256File(filePath);
      collected.set(relativePath, {
        path: relativePath,
        sha256,
        lastModified: fileStat.mtime.toISOString(),
        sizeBytes: fileStat.size,
      });
    }
  }

  return Array.from(collected.values()).sort((a, b) => a.path.localeCompare(b.path));
};

const deriveStatus = (latestTimestamp: Date | undefined, stalenessHours: number, count: number): EvidenceStatus => {
  if (count === 0) return 'missing';
  if (!latestTimestamp) return 'missing';
  const ageHours = (Date.now() - latestTimestamp.getTime()) / (1000 * 60 * 60);
  if (ageHours > stalenessHours) return 'stale';
  return 'present';
};

const loadTaxonomy = async (): Promise<EvidenceTaxonomy> => {
  const data = await fs.readFile(TAXONOMY_PATH, 'utf8');
  return JSON.parse(data) as EvidenceTaxonomy;
};

const buildRecord = async (
  domainId: string,
  control: EvidenceControl,
  gitInfo: { commit: string; branch: string; shortCommit: string },
): Promise<EvidenceRecord> => {
  const artifacts = await collectArtifacts(control.sources);
  const latestTimestamp = artifacts.reduce<Date | undefined>((latest, artifact) => {
    const timestamp = new Date(artifact.lastModified);
    if (!latest || timestamp > latest) return timestamp;
    return latest;
  }, undefined);

  const status = deriveStatus(latestTimestamp, control.stalenessHours, artifacts.length);
  const timestamp = latestTimestamp ? latestTimestamp.toISOString() : new Date().toISOString();

  return {
    id: `${control.id}-${gitInfo.shortCommit}`,
    domain: domainId,
    controlId: control.id,
    claim: control.claim,
    source: control.source,
    timestamp,
    version: {
      commit: gitInfo.commit,
      branch: gitInfo.branch,
      releaseTag: process.env.RELEASE_TAG,
    },
    retention: control.retention,
    access: control.access,
    redaction: control.redaction,
    artifacts,
    links: control.links,
    status,
  };
};

const generateCatalog = async () => {
  const taxonomy = await loadTaxonomy();
  const gitInfo = await resolveGitInfo();

  const records: EvidenceRecord[] = [];
  for (const domain of taxonomy.domains) {
    for (const control of domain.controls) {
      records.push(await buildRecord(domain.id, control, gitInfo));
    }
  }

  const summary = {
    totalControls: records.length,
    present: records.filter(record => record.status === 'present').length,
    missing: records.filter(record => record.status === 'missing').length,
    stale: records.filter(record => record.status === 'stale').length,
  };

  const catalog: EvidenceCatalog = {
    schemaVersion: taxonomy.version,
    generatedAt: new Date().toISOString(),
    git: gitInfo,
    records,
    summary,
  };

  const outputPath = path.resolve(OUTPUT_PATH);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));

  console.log(`Evidence catalog written to ${outputPath}`);
  console.log(`Controls: ${summary.totalControls} | Present: ${summary.present} | Missing: ${summary.missing} | Stale: ${summary.stale}`);
};

generateCatalog().catch(error => {
  console.error('Failed to generate evidence catalog:', error);
  process.exitCode = 1;
});
