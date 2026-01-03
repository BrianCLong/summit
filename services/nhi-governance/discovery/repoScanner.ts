import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createProvenance, Credential, InventoryGraph } from '../models.js';

const SECRET_REGEXES = [
  { name: 'aws-access-key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'private-key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'generic-token', regex: /(?:token|api_key|secret|password)[\s:=]+[A-Za-z0-9\-_]{16,}/i },
  { name: 'jwt', regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/ },
];

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.turbo', '.next', 'dist', 'build']);

interface RepoFinding {
  credential: Credential;
  filePath: string;
}

const walk = async (dir: string, findings: RepoFinding[]): Promise<void> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, findings);
    } else {
      const content = await fs.readFile(fullPath, 'utf8');
      for (const rule of SECRET_REGEXES) {
        if (rule.regex.test(content)) {
          findings.push({
            credential: {
              id: `${fullPath}#${rule.name}`,
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
    }
  }
};

export const scanRepositoryForSecrets = async (rootDir: string): Promise<RepoFinding[]> => {
  const findings: RepoFinding[] = [];
  await walk(rootDir, findings);
  return findings;
};

export const applyRepoFindings = (graph: InventoryGraph, findings: RepoFinding[]): InventoryGraph => {
  const credentials = [...graph.credentials];
  for (const finding of findings) {
    credentials.push(finding.credential);
  }
  return { ...graph, credentials };
};
