#!/usr/bin/env npx tsx
/**
 * Go-Live Provenance Attestation Generator
 *
 * Generates SLSA-style provenance attestation for go-live releases.
 * Creates an in-toto attestation linking the build to source.
 *
 * Usage:
 *   npx tsx scripts/release/generate-go-live-provenance.ts [evidence-dir]
 *   pnpm release:go-live:provenance
 *
 * Environment variables:
 *   EVIDENCE_DIR     Path to evidence directory
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

interface GoLiveEvidence {
  version: string;
  generatedAt: string;
  git: {
    sha: string;
    branch: string;
    dirty: boolean;
    author?: string;
    message?: string;
  };
  toolchain: {
    node: string;
    pnpm: string;
    platform: string;
    arch: string;
  };
  checks: Record<string, { status: string; durationMs: number }>;
  summary: {
    passed: boolean;
  };
  metadata?: {
    ci: boolean;
    ciProvider?: string;
    runId?: string;
    runUrl?: string;
  };
}

interface SLSAProvenance {
  _type: string;
  subject: Array<{
    name: string;
    digest: { sha256: string };
  }>;
  predicateType: string;
  predicate: {
    buildType: string;
    builder: {
      id: string;
    };
    invocation: {
      configSource: {
        uri: string;
        digest: { sha1: string };
        entryPoint: string;
      };
      parameters: Record<string, unknown>;
      environment: Record<string, string>;
    };
    buildConfig: {
      steps: Array<{
        command: string[];
        env: Record<string, string>;
      }>;
    };
    metadata: {
      buildInvocationId: string;
      buildStartedOn: string;
      buildFinishedOn: string;
      completeness: {
        parameters: boolean;
        environment: boolean;
        materials: boolean;
      };
      reproducible: boolean;
    };
    materials: Array<{
      uri: string;
      digest: { sha256?: string; sha1?: string };
    }>;
  };
}

function getDefaultEvidenceDir(): string {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const sha = result.stdout?.trim() || 'unknown';
  return path.join('artifacts', 'evidence', 'go-live', sha);
}

function getGitRemoteUrl(): string {
  const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.stdout?.trim() || 'unknown';
}

function getFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function main(): void {
  console.log('========================================');
  console.log('  Go-Live Provenance Generator');
  console.log('========================================\n');

  // Get evidence directory
  const evidenceDir = process.argv[2] || process.env.EVIDENCE_DIR || getDefaultEvidenceDir();
  console.log(`[provenance] Evidence directory: ${evidenceDir}`);

  // Load evidence
  const evidencePath = path.join(evidenceDir, 'evidence.json');
  if (!fs.existsSync(evidencePath)) {
    console.error(`\n❌ Evidence not found: ${evidencePath}`);
    console.error('   Run "pnpm evidence:go-live:gen" first.');
    process.exit(1);
  }

  const evidence: GoLiveEvidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  console.log(`[provenance] Loaded evidence for commit ${evidence.git.sha}`);

  // Get repository info
  const repoUrl = getGitRemoteUrl();
  const buildInvocationId = evidence.metadata?.runId || crypto.randomUUID();

  // Collect subjects (files we're attesting to)
  const subjects: SLSAProvenance['subject'] = [];

  for (const filename of ['evidence.json', 'evidence.md', 'sbom.cdx.json']) {
    const filePath = path.join(evidenceDir, filename);
    if (fs.existsSync(filePath)) {
      subjects.push({
        name: filename,
        digest: { sha256: getFileHash(filePath) },
      });
    }
  }

  // Build SLSA provenance attestation
  const provenance: SLSAProvenance = {
    _type: 'https://in-toto.io/Statement/v0.1',
    subject: subjects,
    predicateType: 'https://slsa.dev/provenance/v0.2',
    predicate: {
      buildType: 'https://summit.io/go-live-evidence/v1',
      builder: {
        id: evidence.metadata?.ci
          ? `https://github.com/${process.env.GITHUB_REPOSITORY || 'unknown'}/actions`
          : 'local',
      },
      invocation: {
        configSource: {
          uri: repoUrl,
          digest: { sha1: evidence.git.sha },
          entryPoint: 'scripts/evidence/generate-go-live-evidence.ts',
        },
        parameters: {
          evidenceSchemaVersion: evidence.version,
          branch: evidence.git.branch,
        },
        environment: {
          NODE_VERSION: evidence.toolchain.node,
          PNPM_VERSION: evidence.toolchain.pnpm,
          PLATFORM: evidence.toolchain.platform,
          ARCH: evidence.toolchain.arch,
        },
      },
      buildConfig: {
        steps: [
          {
            command: ['pnpm', 'lint'],
            env: {},
          },
          {
            command: ['pnpm', 'build'],
            env: {},
          },
          {
            command: ['pnpm', '--filter', 'intelgraph-server', 'test:unit'],
            env: { GA_VERIFY_MODE: 'true' },
          },
          {
            command: ['scripts/go-live/smoke-prod.sh'],
            env: {},
          },
        ],
      },
      metadata: {
        buildInvocationId,
        buildStartedOn: evidence.generatedAt,
        buildFinishedOn: evidence.generatedAt,
        completeness: {
          parameters: true,
          environment: true,
          materials: true,
        },
        reproducible: !evidence.git.dirty,
      },
      materials: [
        {
          uri: `git+${repoUrl}@refs/heads/${evidence.git.branch}`,
          digest: { sha1: evidence.git.sha },
        },
        {
          uri: 'https://registry.npmjs.org',
          digest: {},
        },
      ],
    },
  };

  // Write provenance
  const outputPath = path.join(evidenceDir, 'provenance.json');
  fs.writeFileSync(outputPath, JSON.stringify(provenance, null, 2));
  console.log(`[provenance] Wrote ${outputPath}`);

  // Update checksums
  const checksumPath = path.join(evidenceDir, 'checksums.txt');
  const provenanceHash = getFileHash(outputPath);

  let checksums = '';
  if (fs.existsSync(checksumPath)) {
    checksums = fs.readFileSync(checksumPath, 'utf8');
    checksums = checksums
      .split('\n')
      .filter((line) => !line.includes('provenance.json'))
      .join('\n');
  }
  checksums = checksums.trim() + `\n${provenanceHash}  provenance.json\n`;
  fs.writeFileSync(checksumPath, checksums);

  console.log('[provenance] Updated checksums.txt');

  // Summary
  console.log('\n========================================');
  console.log('  ✅ Provenance Attestation Generated');
  console.log(`  Subjects: ${subjects.length} files`);
  console.log(`  Builder: ${provenance.predicate.builder.id}`);
  console.log('========================================\n');
}

main();
