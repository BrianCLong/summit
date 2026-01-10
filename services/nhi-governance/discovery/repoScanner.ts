import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createProvenance, Credential, InventoryGraph } from '../models.js';

const SECRET_REGEXES = [
  { name: 'aws-access-key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'private-key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'generic-token', regex: /(?:token|api_key|secret|password)[\s:=]+[A-Za-z0-9\-_]{16,}/i },
  { name: 'jwt', regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/ },
];

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '.turbo',
  '.next',
  '.pnpm',
  '.cache',
  'dist',
  'build',
  'coverage',
  'tmp',
  'tmp-test',
  'artifacts',
]);
const MAX_FILE_BYTES = 1024 * 1024;

interface RepoFinding {
  credential: Credential;
  filePath: string;
}

const buildFindingId = (filePath: string, ruleName: string): string =>
  `repo:${createHash('sha256').update(`${filePath}:${ruleName}`).digest('hex')}`;

const walk = async (dir: string, findings: RepoFinding[], seen: Set<string>): Promise<void> => {
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, findings, seen);
      continue;
    }
    if (!entry.isFile()) continue;
    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(fullPath);
    } catch {
      continue;
    }
    if (stats.size > MAX_FILE_BYTES) continue;
    let content = '';
    try {
      content = await fs.readFile(fullPath, 'utf8');
    } catch {
      continue;
    }
    if (content.includes('\u0000')) continue;
    for (const rule of SECRET_REGEXES) {
      if (!rule.regex.test(content)) continue;
      const findingId = buildFindingId(fullPath, rule.name);
      if (seen.has(findingId)) continue;
      seen.add(findingId);
      findings.push({
        credential: {
          id: findingId,
          name: `${rule.name}-leak`,
          kind: 'secret',
          boundTo: 'unknown',
          secretSource: fullPath,
          provenance: createProvenance('repo-scanner', [`${fullPath}:${rule.name}`], 'high'),
        },
        filePath: fullPath,
      });
    }
  }
};

export const scanRepositoryForSecrets = async (rootDir: string): Promise<RepoFinding[]> => {
  const findings: RepoFinding[] = [];
  const seen = new Set<string>();
  await walk(rootDir, findings, seen);
  return findings;
};

export const applyRepoFindings = (graph: InventoryGraph, findings: RepoFinding[]): InventoryGraph => {
  const credentials = [...graph.credentials];
  for (const finding of findings) {
    credentials.push(finding.credential);
  }
  return { ...graph, credentials };
};
