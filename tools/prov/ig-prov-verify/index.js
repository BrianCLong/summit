#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import MerkleTree from 'merkletreejs';
import keccak from 'keccak';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

function keccakLeaf(hash) {
  return keccak('keccak256').update(Buffer.from(hash.replace(/^0x/, ''), 'hex')).digest();
}

function computeRoot(hashes) {
  const tree = new MerkleTree(hashes.map(keccakLeaf), data => keccak('keccak256').update(data).digest(), { sortPairs: true });
  return `0x${tree.getRoot().toString('hex')}`;
}

function normalizeHashes(hashes) {
  return hashes.map(h => (typeof h === 'string' && h.startsWith('0x') ? h : `0x${h}`));
}

function verifyManifestFile(manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const evidenceHashes = parsed.evidenceHashes || parsed.evidences?.map(e => e.hash) || [];
  if (!Array.isArray(evidenceHashes) || evidenceHashes.length === 0) {
    throw new Error('No evidence hashes provided in manifest file');
  }
  const normalized = normalizeHashes(evidenceHashes);
  const recomputedRoot = computeRoot(normalized);
  const valid = recomputedRoot === parsed.merkleRoot;
  return { valid, expectedRoot: recomputedRoot, manifestRoot: parsed.merkleRoot };
}

function verifyBundleFile(bundlePath) {
  const raw = fs.readFileSync(bundlePath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed.manifest || !Array.isArray(parsed.evidences)) {
    throw new Error('Bundle must include manifest and evidences[]');
  }
  const evidenceHashes = parsed.evidences.map(ev => ev.hash);
  const normalized = normalizeHashes(evidenceHashes);
  const recomputedRoot = computeRoot(normalized);
  const valid = recomputedRoot === parsed.manifest.merkleRoot;
  return { valid, expectedRoot: recomputedRoot, manifestRoot: parsed.manifest.merkleRoot };
}

const argv = yargs(hideBin(process.argv))
  .usage('$0 --manifest <path> | --bundle <path>')
  .option('manifest', { alias: 'm', type: 'string', describe: 'Path to manifest JSON file' })
  .option('bundle', { alias: 'b', type: 'string', describe: 'Path to exported manifest bundle JSON file' })
  .help()
  .version(version).argv;

if (!argv.manifest && !argv.bundle) {
  console.error('Either --manifest or --bundle must be provided');
  process.exit(1);
}

const manifestPath = argv.manifest ? path.resolve(argv.manifest) : null;
const bundlePath = argv.bundle ? path.resolve(argv.bundle) : null;
try {
  const result = bundlePath ? verifyBundleFile(bundlePath) : verifyManifestFile(manifestPath);
  if (result.valid) {
    console.log(`Manifest verified. Merkle root ${result.manifestRoot}`);
    process.exit(0);
  } else {
    console.error(`Manifest tampered. Expected ${result.expectedRoot} but found ${result.manifestRoot}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Verification failed: ${(err && err.message) || err}`);
  process.exit(1);
}
