#!/usr/bin/env node
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const cacheFile = process.argv[2] || 'dist/.provenance-cache.json';
const artifactPath = process.argv[3] || 'dist/index.js';
const attestationPath = process.argv[4] || `${artifactPath}.attestation.json`;
const inputs = process.argv.slice(5).filter(Boolean);
const defaultInputs = ['package.json', 'package-lock.json', 'tsconfig.json', 'src'];
const ignore = new Set(['node_modules', '.git', 'dist', '.turbo']);

async function main() {
  const inputsToHash = inputs.length ? inputs : defaultInputs;
  const currentState = {
    inputsFingerprint: await fingerprint(inputsToHash),
    artifactDigest: await digestFile(artifactPath),
    attestationDigest: await digestFile(attestationPath),
  };

  const previous = await readCache(cacheFile);
  const cacheHit =
    !!previous &&
    previous.inputsFingerprint === currentState.inputsFingerprint &&
    previous.artifactDigest === currentState.artifactDigest &&
    previous.attestationDigest === currentState.attestationDigest;

  await fs.mkdir(path.dirname(cacheFile), { recursive: true });
  await fs.writeFile(
    cacheFile,
    JSON.stringify(
      {
        ...currentState,
        cacheHit,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  if (cacheHit) {
    const marker = path.join(path.dirname(cacheFile), '.provenance-cache.hit');
    await fs.writeFile(marker, 'hit');
    console.log('♻️  Provenance cache hit – existing artifacts are valid');
  } else {
    console.log('ℹ️  Provenance cache miss – continuing pipeline');
  }
}

async function fingerprint(targets) {
  const hasher = createHash('sha256');
  for (const target of targets) {
    await hashTarget(target, hasher);
  }
  return hasher.digest('hex');
}

async function hashTarget(target, hasher) {
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      const entries = (await fs.readdir(target)).sort();
      for (const entry of entries) {
        if (ignore.has(entry)) continue;
        await hashTarget(path.join(target, entry), hasher);
      }
    } else if (stat.isFile()) {
      hasher.update(target);
      hasher.update(await fs.readFile(target));
    }
  } catch {
    // Missing inputs are ignored in the fingerprint
  }
}

async function digestFile(target) {
  try {
    const content = await fs.readFile(target);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return undefined;
  }
}

async function readCache(file) {
  try {
    const content = await fs.readFile(file, 'utf8');
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

main().catch((error) => {
  console.error('Provenance cache validation failed', error);
  process.exit(1);
});
