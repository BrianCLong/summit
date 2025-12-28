#!/usr/bin/env -S node --loader ts-node/esm

import { promises as fs } from 'fs';
import path from 'path';
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

interface EvidencePolicyInput {
  generatedAt: string;
  controls: Array<{
    controlId: string;
    domain: string;
    claim: string;
    status: EvidenceStatus;
    requiredLinkTypes: EvidenceLinkType[];
    links: Array<{ type: EvidenceLinkType; target: string; exists: boolean }>;
    artifacts: Array<{ path: string; exists: boolean }>;
    retention: RetentionPolicy;
    access: EvidenceAccess;
    redaction: RedactionPolicy;
  }>;
}

const TAXONOMY_PATH = process.env.EVIDENCE_TAXONOMY || 'audit/evidence-taxonomy.json';
const CATALOG_PATH = process.env.EVIDENCE_CATALOG || 'audit/evidence-catalog.json';
const OPA_POLICY_PATH = process.env.EVIDENCE_POLICY || 'policy/evidence.rego';

const loadJson = async <T>(filePath: string): Promise<T> => {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data) as T;
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const buildPolicyInput = async (
  taxonomy: EvidenceTaxonomy,
  catalog: EvidenceCatalog,
): Promise<EvidencePolicyInput> => {
  const controls = [] as EvidencePolicyInput['controls'];

  for (const domain of taxonomy.domains) {
    for (const control of domain.controls) {
      const record = catalog.records.find(item => item.controlId === control.id);
      const links = record?.links ?? control.links;
      const artifacts = record?.artifacts ?? [];

      const linkFacts = await Promise.all(
        links.map(async link => ({
          type: link.type,
          target: link.target,
          exists: await fileExists(path.resolve(process.cwd(), link.target)),
        })),
      );

      const artifactFacts = await Promise.all(
        artifacts.map(async artifact => ({
          path: artifact.path,
          exists: await fileExists(path.resolve(process.cwd(), artifact.path)),
        })),
      );

      controls.push({
        controlId: control.id,
        domain: domain.id,
        claim: control.claim,
        status: record?.status ?? 'missing',
        requiredLinkTypes: control.requiredLinkTypes,
        links: linkFacts,
        artifacts: artifactFacts,
        retention: record?.retention ?? control.retention,
        access: record?.access ?? control.access,
        redaction: record?.redaction ?? control.redaction,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    controls,
  };
};

const runOpa = async (inputPath: string) => {
  const command = `opa eval --format pretty --fail-defined -d ${OPA_POLICY_PATH} -i ${inputPath} 'data.summit.evidence.deny'`;
  await execAsync(command);
};

const validateEvidence = async () => {
  const taxonomy = await loadJson<EvidenceTaxonomy>(TAXONOMY_PATH);
  const catalog = await loadJson<EvidenceCatalog>(CATALOG_PATH);

  const input = await buildPolicyInput(taxonomy, catalog);
  const inputPath = path.resolve('.tmp', 'evidence-policy-input.json');
  await fs.mkdir(path.dirname(inputPath), { recursive: true });
  await fs.writeFile(inputPath, JSON.stringify(input, null, 2));

  await runOpa(inputPath);
  console.log('Evidence drift check passed.');
};

validateEvidence().catch(error => {
  console.error('Evidence drift check failed:', error);
  process.exitCode = 1;
});
