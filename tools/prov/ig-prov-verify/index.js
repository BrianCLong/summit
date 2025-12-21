#!/usr/bin/env node
import fs from 'fs';
import { MerkleTree } from 'merkletreejs';
import createKeccakHash from 'keccak';

const hashLeaf = (value) => createKeccakHash('keccak256').update(value).digest();
const toHex = (buf) => '0x' + buf.toString('hex');

function verify(manifestPath){
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if(!manifest.leaves || !manifest.merkleRoot){
    throw new Error('Manifest missing leaves or merkleRoot');
  }
  const tree = new MerkleTree(manifest.leaves.map(hashLeaf), hashLeaf, { sortPairs: true });
  const root = toHex(tree.getRoot());
  const valid = root === manifest.merkleRoot;
  console.log(JSON.stringify({ valid, computedRoot: root, expectedRoot: manifest.merkleRoot }, null, 2));
  process.exit(valid ? 0 : 1);
}

const manifestPath = process.argv[2];
if(!manifestPath){
  console.error('Usage: ig-prov-verify <manifest.json>');
  process.exit(2);
}

try {
  verify(manifestPath);
} catch(err){
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
