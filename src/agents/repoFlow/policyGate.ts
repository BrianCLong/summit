import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { EvidenceReport, PolicyDecision } from './types';

type RepoFlowPolicy = {
  version: string;
  denyPaths: string[];
  requiredEvidenceFields: string[];
  secretPatterns: string[];
};

const sha256 = (input: string) =>
  crypto.createHash('sha256').update(input).digest('hex');

const getField = (obj: Record<string, unknown>, pathKey: string): unknown =>
  pathKey.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

export const loadPolicy = async (policyPath: string): Promise<RepoFlowPolicy> => {
  const raw = await fs.readFile(policyPath, 'utf8');
  const parsed = JSON.parse(raw) as RepoFlowPolicy;
  return parsed;
};

export const policyHash = async (policyPath: string): Promise<string> => {
  const raw = await fs.readFile(policyPath, 'utf8');
  return sha256(raw);
};

export type PolicyGateInput = {
  changedFiles: string[];
  evidence: EvidenceReport;
  fileContents?: Record<string, string>;
  policyPath?: string;
};

export const runPolicyGate = async (
  input: PolicyGateInput,
): Promise<PolicyDecision> => {
  const policyFile =
    input.policyPath ??
    path.join(process.cwd(), '.github', 'policies', 'repoFlow-policy.json');
  const policy = await loadPolicy(policyFile);
  const hash = await policyHash(policyFile);
  const reasons: string[] = [];
  const evidenceForValidation = {
    ...input.evidence,
    policy: {
      ...input.evidence.policy,
      policyHash: input.evidence.policy.policyHash || hash,
    },
  };

  const denied = input.changedFiles.filter((file) =>
    policy.denyPaths.some((denyPath) => file.startsWith(denyPath)),
  );
  if (denied.length > 0) {
    reasons.push(`Denied paths touched: ${denied.join(', ')}`);
  }

  const missingFields = policy.requiredEvidenceFields.filter((field) => {
    const value = getField(
      evidenceForValidation as Record<string, unknown>,
      field,
    );
    return value === undefined || value === null || value === '';
  });
  if (missingFields.length > 0) {
    reasons.push(`Missing evidence fields: ${missingFields.join(', ')}`);
  }

  if (input.fileContents) {
    for (const [filePath, contents] of Object.entries(input.fileContents)) {
      const matches = policy.secretPatterns.filter((pattern) => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(contents);
      });
      if (matches.length > 0) {
        reasons.push(
          `Secret pattern hits in ${filePath}: ${matches.join(', ')}`,
        );
      }
    }
  }

  return {
    decision: reasons.length > 0 ? 'deny' : 'allow',
    reasons,
    policyHash: hash,
  };
};
