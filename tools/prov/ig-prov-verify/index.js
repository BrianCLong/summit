#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import stringify from 'fast-json-stable-stringify';
import { MerkleTree } from 'merkletreejs';
import keccak from 'keccak';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = yargs(hideBin(process.argv))
  .option('manifest', { type: 'string', demandOption: true, describe: 'Path to manifest JSON' })
  .option('evidence', { type: 'string', demandOption: true, describe: 'Path to evidence JSON array' })
  .help()
  .parseSync();

function readJson(filePath) {
  const resolved = path.resolve(__dirname, filePath);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function evidenceHash(evidence) {
  const payload = stringify({ id: evidence.id, hash: evidence.hash, metadata: evidence.metadata ?? null });
  return keccak('keccak256').update(payload).digest();
}

function buildRoot(claimId, evidence) {
  if (!evidence.length) {
    throw new Error('Manifest requires evidence');
  }
  const leaves = evidence.map(evidenceHash);
  const tree = new MerkleTree(leaves, (data) => keccak('keccak256').update(data).digest(), {
    sortLeaves: true,
    sortPairs: true,
  });
  const root = tree.getRoot();
  const digest = keccak('keccak256')
    .update(Buffer.concat([Buffer.from(claimId), root]))
    .digest('hex');
  return `0x${digest}`;
}

const manifest = readJson(argv.manifest);
const evidenceEntries = readJson(argv.evidence);
const normalizedEvidence = evidenceEntries.map((payload, idx) => ({
  id: payload.id ?? `e${idx + 1}`,
  hash: payload.hash ?? payload,
  metadata: payload.metadata ?? null,
}));

const calculated = buildRoot(manifest.claimId ?? manifest.id, normalizedEvidence);
if (calculated !== manifest.merkleRoot) {
  console.error('Manifest verification FAILED');
  process.exit(1);
}
console.log('Manifest verification PASS');
