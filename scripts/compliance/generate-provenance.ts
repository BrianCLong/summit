#!/usr/bin/env npx tsx
/**
 * P29: SLSA Provenance Generator
 * Generates SLSA v1.0 provenance attestation for build artifacts
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');
const OUTPUT_DIR = join(ROOT_DIR, 'dist/provenance');

interface Subject {
  name: string;
  digest: {
    sha256: string;
  };
}

interface SLSAProvenance {
  _type: string;
  subject: Subject[];
  predicateType: string;
  predicate: {
    buildDefinition: {
      buildType: string;
      externalParameters: {
        repository: string;
        ref: string;
        commit: string;
        buildCommand: string;
        nodeVersion: string;
        pnpmVersion: string;
      };
      resolvedDependencies: Array<{
        uri: string;
        digest: {
          sha256: string;
        };
      }>;
    };
    runDetails: {
      builder: {
        id: string;
        version?: Record<string, string>;
      };
      metadata: {
        invocationId: string;
        startedOn: string;
        finishedOn: string;
      };
    };
  };
}

function sha256File(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function getGitInfo(): { commit: string; ref: string; repository: string } {
  try {
    const commit = execSync('git rev-parse HEAD', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
    const ref = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();

    let repository = 'https://github.com/BrianCLong/summit';
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
      if (remoteUrl) {
        repository = remoteUrl.replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
      }
    } catch {
      // Use default if remote URL not available
    }

    return { commit, ref, repository };
  } catch (error) {
    console.error('Error getting Git info:', error);
    throw new Error('Failed to retrieve Git information. Ensure you are in a Git repository.');
  }
}

function getNodeVersion(): string {
  return process.version.replace('v', '');
}

function getPnpmVersion(): string {
  try {
    return execSync('pnpm --version', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getLockFileHash(): string {
  const lockFilePath = join(ROOT_DIR, 'pnpm-lock.yaml');
  if (!existsSync(lockFilePath)) {
    throw new Error('pnpm-lock.yaml not found');
  }
  return sha256File(lockFilePath);
}

function collectBuildArtifacts(): Subject[] {
  const subjects: Subject[] = [];

  const artifactDirs = [
    { path: 'server/dist', name: 'server' },
    { path: 'client/dist', name: 'client' },
  ];

  for (const { path: dirPath, name } of artifactDirs) {
    const fullPath = join(ROOT_DIR, dirPath);
    if (!existsSync(fullPath)) {
      console.warn(`Warning: Artifact directory not found: ${dirPath}`);
      continue;
    }

    const files = getAllFiles(fullPath);
    for (const file of files) {
      const relativePath = relative(ROOT_DIR, file);
      const hash = sha256File(file);
      subjects.push({
        name: relativePath,
        digest: {
          sha256: hash,
        },
      });
    }
  }

  // Also include package.json and lock file as subjects
  const metadataFiles = ['package.json', 'pnpm-lock.yaml'];
  for (const file of metadataFiles) {
    const fullPath = join(ROOT_DIR, file);
    if (existsSync(fullPath)) {
      subjects.push({
        name: file,
        digest: {
          sha256: sha256File(fullPath),
        },
      });
    }
  }

  return subjects;
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    const entries = readdirSync(currentPath);
    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function generateInvocationId(): string {
  // Use build timestamp + commit hash for uniqueness
  const gitInfo = getGitInfo();
  const timestamp = new Date().toISOString();
  return createHash('sha256')
    .update(`${timestamp}-${gitInfo.commit}`)
    .digest('hex')
    .substring(0, 16);
}

function generateProvenance(): SLSAProvenance {
  const startTime = new Date().toISOString();
  const gitInfo = getGitInfo();
  const lockFileHash = getLockFileHash();
  const subjects = collectBuildArtifacts();

  if (subjects.length === 0) {
    throw new Error('No build artifacts found. Run `pnpm build` first.');
  }

  const provenance: SLSAProvenance = {
    _type: 'https://in-toto.io/Statement/v1',
    subject: subjects,
    predicateType: 'https://slsa.dev/provenance/v1',
    predicate: {
      buildDefinition: {
        buildType: 'https://github.com/BrianCLong/summit/build/v1',
        externalParameters: {
          repository: gitInfo.repository,
          ref: gitInfo.ref,
          commit: gitInfo.commit,
          buildCommand: 'pnpm build',
          nodeVersion: getNodeVersion(),
          pnpmVersion: getPnpmVersion(),
        },
        resolvedDependencies: [
          {
            uri: 'git+' + gitInfo.repository,
            digest: {
              sha256: gitInfo.commit,
            },
          },
          {
            uri: 'pkg:npm/pnpm-lock.yaml',
            digest: {
              sha256: lockFileHash,
            },
          },
        ],
      },
      runDetails: {
        builder: {
          id: process.env.GITHUB_ACTIONS
            ? 'https://github.com/actions/runner'
            : 'https://github.com/BrianCLong/summit/local-builder',
          version: {
            node: getNodeVersion(),
            pnpm: getPnpmVersion(),
          },
        },
        metadata: {
          invocationId: generateInvocationId(),
          startedOn: startTime,
          finishedOn: new Date().toISOString(),
        },
      },
    },
  };

  return provenance;
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('     SLSA PROVENANCE GENERATOR');
  console.log('========================================');
  console.log('');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const provenance = generateProvenance();

  const projectInfo = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
  const outputPath = join(OUTPUT_DIR, 'build-provenance.intoto.jsonl');

  // Write as JSON Lines format (in-toto standard)
  writeFileSync(outputPath, JSON.stringify(provenance, null, 2));

  console.log(`✅ SLSA provenance generated: ${outputPath}`);
  console.log(`📦 Subjects: ${provenance.subject.length} artifacts`);
  console.log(`🔗 Commit: ${provenance.predicate.buildDefinition.externalParameters.commit.substring(0, 8)}`);
  console.log(`🌿 Branch: ${provenance.predicate.buildDefinition.externalParameters.ref}`);
  console.log('');
  console.log('========================================');
  console.log('✅ Provenance generation complete');
  console.log('========================================');
}

main().catch((error) => {
  console.error('Provenance generation failed:', error);
  process.exit(1);
});
