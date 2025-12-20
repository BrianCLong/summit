#!/usr/bin/env ts-node
/**
 * Governance bundle CLI
 *
 * Generates a tarball containing:
 * - Audit events slice
 * - Policy decision logs
 * - SBOM references
 * - Provenance references
 *
 * Example:
 *   pnpm ts-node tools/generate-governance-bundle.ts \\
 *     --tenant t0 \\
 *     --start 2025-08-01T00:00:00Z \\
 *     --end 2025-08-02T00:00:00Z
 */

import path from 'node:path';
import process from 'node:process';
import { generateGovernanceBundle } from '../server/src/governance/governance-bundle.js';

interface CliArgs {
  tenant: string;
  start: string;
  end: string;
  output?: string;
  auditPaths?: string[];
  policyPaths?: string[];
  sbomPaths?: string[];
  provenancePaths?: string[];
}

function parseList(flag: string): string[] | undefined {
  const value = readFlag(flag);
  if (!value) return undefined;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item));
}

function readFlag(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function parseArgs(): CliArgs {
  const tenant = readFlag('--tenant');
  const start = readFlag('--start') ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const end = readFlag('--end') ?? new Date().toISOString();

  if (!tenant) {
    throw new Error('Missing required flag --tenant');
  }

  return {
    tenant,
    start,
    end,
    output: readFlag('--output'),
    auditPaths: parseList('--audit-paths'),
    policyPaths: parseList('--policy-paths'),
    sbomPaths: parseList('--sbom-paths'),
    provenancePaths: parseList('--provenance-paths'),
  };
}

async function main() {
  try {
    const args = parseArgs();
    const result = await generateGovernanceBundle({
      tenantId: args.tenant,
      startTime: args.start,
      endTime: args.end,
      outputRoot: args.output,
      auditLogPaths: args.auditPaths,
      policyLogPaths: args.policyPaths,
      sbomPaths: args.sbomPaths,
      provenancePaths: args.provenancePaths,
    });

    console.log('✅ Governance bundle created');
    console.log(`   ID:        ${result.id}`);
    console.log(`   Tenant:    ${args.tenant}`);
    console.log(`   Window:    ${args.start} -> ${args.end}`);
    console.log(`   Tarball:   ${result.tarPath}`);
    console.log(`   SHA256:    ${result.sha256}`);
    console.log(`   Checksums: ${result.checksumsPath}`);
    console.log(`   Manifest:  ${result.manifestPath}`);
    console.log(
      `   Counts:    audit=${result.counts.auditEvents}, policy=${result.counts.policyDecisions}, sbom=${result.counts.sbomRefs}, provenance=${result.counts.provenanceRefs}`,
    );
    if (result.warnings.length) {
      console.log(`   Warnings:  ${result.warnings.join(', ')}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to generate governance bundle:', error?.message || error);
    process.exitCode = 1;
  }
}

main();
