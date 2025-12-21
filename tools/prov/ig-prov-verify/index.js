#!/usr/bin/env node
import fs from 'fs';
import { MerkleTree } from 'merkletreejs';
import keccak from 'keccak';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: ig-prov-verify --bundle <path>')
  .option('bundle', { type: 'string', demandOption: true, describe: 'Path to manifest bundle JSON' })
  .strict()
  .help().argv;

const bundlePath = argv.bundle;
if (!fs.existsSync(bundlePath)) {
  console.error(`Bundle not found at ${bundlePath}`);
  process.exit(1);
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
if (!bundle.manifest || !bundle.evidences) {
  console.error('Bundle must contain manifest and evidences');
  process.exit(1);
}

const tree = new MerkleTree(
  bundle.evidences.map((e) => keccak('keccak256').update(e.hash).digest()),
  (data) => keccak('keccak256').update(data).digest(),
  { sortPairs: true }
);
const computedRoot = tree.getHexRoot();
const isValid = computedRoot === bundle.manifest.merkleRoot;
console.log(JSON.stringify({ valid: isValid, computedRoot }, null, 2));
process.exit(isValid ? 0 : 2);
