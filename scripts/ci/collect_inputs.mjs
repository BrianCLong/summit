#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { canonicalJsonStringify } from './lib/canonical-serializer.mjs';

const DEFAULT_SBOM_PATH = 'artifacts/sbom/spdx.json';
const DEFAULT_ATTESTATION_PATH = 'artifacts/provenance/intoto.jsonl';

function resolvePath(repoRoot, filePath) {
  if (!filePath) {
    return '';
  }
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(repoRoot, filePath);
}

function sha256File(repoRoot, filePath) {
  if (!filePath) {
    return '';
  }
  const resolved = resolvePath(repoRoot, filePath);
  if (!fs.existsSync(resolved)) {
    return '';
  }
  const data = fs.readFileSync(resolved);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function parseBoolean(value) {
  return value === 'true' || value === '1';
}

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseRequiredChecks(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function parseRepository(value) {
  if (!value) {
    return { owner: '', name: '' };
  }
  const [owner = '', name = ''] = value.split('/');
  return { owner, name };
}

export function buildInputs({ env = process.env, repoRoot = process.cwd() } = {}) {
  const sbomPath = env.SBOM_PATH ?? DEFAULT_SBOM_PATH;
  const attestationPath =
    env.PROVENANCE_ATTESTATION_PATH ?? DEFAULT_ATTESTATION_PATH;

  const { owner, name } = parseRepository(env.GITHUB_REPOSITORY);
  const prNumber = parseNumber(env.GITHUB_EVENT_NUMBER, null);
  const slsaLevel = parseNumber(env.PROVENANCE_SLSA_LEVEL, 0);

  const inputs = {
    artifacts: {
      sbom: {
        path: sbomPath,
        sha256: sha256File(repoRoot, sbomPath),
      },
      image: {
        digest: env.IMAGE_DIGEST ?? '',
        signatures: {
          cosign: parseBoolean(env.COSIGN_SIGNED),
        },
      },
      provenance: {
        slsa_level: slsaLevel,
        attestation_path: attestationPath,
      },
    },
    repo: {
      owner,
      name,
      pr: prNumber,
      sha: env.GITHUB_SHA ?? '',
    },
    required_checks: parseRequiredChecks(env.REQUIRED_CHECKS),
  };

  return inputs;
}

function main() {
  const inputs = buildInputs();
  process.stdout.write(`${canonicalJsonStringify(inputs)}\n`);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
