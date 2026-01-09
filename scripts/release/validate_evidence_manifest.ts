#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { z } from 'zod';

type Args = {
  manifestPath?: string;
};

const EvidenceBundleMetaSchema = z.object({
  version: z.string(),
  release: z.string(),
  product: z.string(),
  created_at: z.string(),
  environment: z.string(),
});

const ReleaseMetadataSchema = z.object({
  git_commit: z.string(),
  build_pipeline: z.string(),
  build_timestamp: z.string(),
  approver: z.string(),
}).passthrough();

const EvidenceBundleManifestSchema = z.object({
  evidence_bundle: EvidenceBundleMetaSchema,
  release_metadata: ReleaseMetadataSchema,
  ci_quality_gates: z.array(z.object({
    name: z.string(),
    status: z.string(),
    evidence: z.string(),
  })).optional(),
  acceptance_packs: z.array(z.object({
    epic: z.string(),
    descriptor: z.string(),
  })).optional(),
  load_tests: z.object({
    tool: z.string(),
    script: z.string().optional(),
  }).optional(),
  chaos_scenarios: z.array(z.object({
    name: z.string(),
    runbook: z.string(),
  })).optional(),
  sbom: z.object({
    path: z.string(),
    format: z.string(),
    generated_with: z.string(),
  }).optional(),
});

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') args.manifestPath = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Validate evidence manifest JSON structure.

Usage:
  pnpm exec tsx scripts/release/validate_evidence_manifest.ts --manifest EVIDENCE_BUNDLE.manifest.json
`);
}

function fail(message: string): never {
  console.error(`Evidence manifest validation failed: ${message}`);
  process.exit(1);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifestPath) {
    fail('Manifest path is required.');
  }

  const manifest = JSON.parse(readFileSync(args.manifestPath, 'utf8'));
  const result = EvidenceBundleManifestSchema.safeParse(manifest);
  if (!result.success) {
    const messages = result.error.errors.map(err => `${err.path.join('.')} ${err.message}`).join('; ');
    fail(messages);
  }

  console.log('Evidence manifest validation passed.');
}

main();
