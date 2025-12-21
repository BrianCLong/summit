import fs from 'node:fs';
import path from 'node:path';
import type { GateResult, PolicyGateConfig } from './types.ts';

type PolicyInput = {
  iamRoles?: Array<{
    name: string;
    statements: Array<{ action: string; resource: string; effect?: 'allow' | 'deny' }>;
  }>;
  exposures?: {
    publicEndpoints?: string[];
  };
};

export async function enforcePolicyGate(rootDir: string, config: PolicyGateConfig): Promise<GateResult> {
  const inputPath = path.resolve(rootDir, config.inputPath);
  if (!fs.existsSync(inputPath)) {
    return { gate: 'policy', ok: false, details: [`policy input missing at ${config.inputPath}`] };
  }

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as PolicyInput;
  const denies: string[] = [];

  if (config.denyWildcardIam) {
    denies.push(...detectWildcardIam(input));
  }

  if (!config.allowPublicEndpoints) {
    denies.push(...detectPublicExposure(input));
  }

  return {
    gate: 'policy',
    ok: denies.length === 0,
    details: denies.length ? denies : ['Policy bundle denies are clear']
  };
}

function detectWildcardIam(input: PolicyInput): string[] {
  const issues: string[] = [];
  input.iamRoles?.forEach((role) => {
    role.statements.forEach((statement) => {
      if (statement.action === '*' || statement.resource === '*') {
        issues.push(`Role ${role.name} contains wildcard action/resource`);
      }
    });
  });
  return issues;
}

function detectPublicExposure(input: PolicyInput): string[] {
  const issues: string[] = [];
  const publicEndpoints = input.exposures?.publicEndpoints ?? [];
  if (publicEndpoints.length) {
    issues.push(`Public endpoints not allowed: ${publicEndpoints.join(', ')}`);
  }
  return issues;
}
