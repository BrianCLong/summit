import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { computeSnapshotId, effectivePolicySnapshotSchema, NormalizedPolicy, redactNormalized } from './types.js';

function readYamlIfExists(filePath: string): any | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

function loadGovernanceConfig(rootDir: string): any {
  const configPath = path.join(rootDir, 'policy', 'governance-config.yaml');
  return readYamlIfExists(configPath) || {};
}

function loadAllowlist(rootDir: string): string[] {
  const allowPath = path.join(rootDir, 'server', 'config', 'egress-allowlist.json');
  if (!fs.existsSync(allowPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(allowPath, 'utf8'));
    return parsed.allowed || [];
  } catch {
    return [];
  }
}

function deriveNormalizedPolicy(rootDir: string): NormalizedPolicy {
  const governance = loadGovernanceConfig(rootDir);
  const allowlist = loadAllowlist(rootDir);
  const envMode = governance.environments?.prod?.mode || 'strict';
  const enforce = governance.environments?.prod?.enforce !== false;
  const approvalBundles: string[] = Array.isArray(governance.environments?.prod?.bundles)
    ? governance.environments?.prod?.bundles
    : [];

  return {
    toolAllowlist: allowlist,
    toolDenylist: [],
    budgets: { globalUsdCap: Number(process.env.BASELINE_BUDGET_CAP || 10) },
    strictAttribution: envMode === 'strict' && enforce,
    approvalRequirements: approvalBundles.reduce<Record<string, string[]>>(function reduceApproval(
      acc: Record<string, string[]>,
      bundle: string
    ) {
      acc[bundle] = ['security-review'];
      return acc;
    }, {}),
    riskWeights: { default: 1 },
    redaction: { enabled: true, strategy: 'mask', fields: ['token', 'secret', 'apiKey'] },
  };
}

export function createRepoBaselineSnapshot(rootDir: string = process.cwd()) {
  const normalized = deriveNormalizedPolicy(rootDir);
  const snapshot = effectivePolicySnapshotSchema.parse({
    snapshotId: '',
    metadata: {
      timestamp: new Date().toISOString(),
      environment: 'repo-baseline',
      gitCommit: process.env.GIT_COMMIT_SHA,
      policySchemaVersion: '1.0',
      serviceVersion: process.env.npm_package_version,
      sourcePrecedence: ['policy/governance-config.yaml', 'server/config/egress-allowlist.json'],
      changeActor: 'repository',
    },
    normalized: redactNormalized(normalized),
  });
  snapshot.snapshotId = computeSnapshotId(snapshot);
  return snapshot;
}
