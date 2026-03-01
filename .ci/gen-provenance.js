#!/usr/bin/env node
// Generate a SLSA-compatible provenance attestation for the current build.
// Outputs JSON to stdout.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sha = process.env.GITHUB_SHA
  ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

const repoUrl = process.env.GITHUB_REPOSITORY
  ?? execSync('git remote get-url origin', { encoding: 'utf8' }).trim();

const pkgRaw = readFileSync('package.json', 'utf8');
const pkgDigest = createHash('sha256').update(pkgRaw).digest('hex');

const provenance = {
  _type: 'https://in-toto.io/Statement/v0.1',
  predicateType: 'https://slsa.dev/provenance/v0.2',
  subject: [
    {
      name: 'package.json',
      digest: { sha256: pkgDigest },
    },
  ],
  predicate: {
    builder: { id: 'summit-ci' },
    buildType: 'https://summit.dev/build/v1',
    invocation: {
      configSource: {
        uri: repoUrl,
        digest: { sha1: sha },
        entryPoint: 'Makefile:provenance',
      },
    },
    metadata: {
      buildStartedOn: new Date().toISOString(),
      completeness: {
        parameters: true,
        environment: false,
        materials: true,
      },
    },
    materials: [
      {
        uri: `git+${repoUrl}@refs/heads/main`,
        digest: { sha1: sha },
      },
    ],
  },
};

process.stdout.write(JSON.stringify(provenance, null, 2) + '\n');
