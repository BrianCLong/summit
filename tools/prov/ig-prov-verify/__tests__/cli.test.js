import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import MerkleTree from 'merkletreejs';
import keccak from 'keccak';

function keccakLeaf(hash) {
  return keccak('keccak256').update(Buffer.from(hash.replace(/^0x/, ''), 'hex')).digest();
}

function computeRoot(hashes) {
  const tree = new MerkleTree(hashes.map(keccakLeaf), data => keccak('keccak256').update(data).digest(), { sortPairs: true });
  return `0x${tree.getRoot().toString('hex')}`;
}

describe('ig-prov-verify', () => {
  const tmp = path.join(__dirname, 'tmp-manifest.json');
  const hashes = ['0x' + 'ab'.repeat(32), '0x' + 'cd'.repeat(32)];
  const merkleRoot = computeRoot(hashes);

  beforeAll(() => {
    fs.writeFileSync(tmp, JSON.stringify({ merkleRoot, evidenceHashes: hashes }));
  });

  afterAll(() => {
    fs.unlinkSync(tmp);
  });

  it('exits successfully when the manifest matches', () => {
    const stdout = execFileSync('node', [path.join(__dirname, '..', 'index.js'), '--manifest', tmp], { encoding: 'utf-8' });
    expect(stdout).toContain('Manifest verified');
  });

  it('verifies a bundle with embedded evidences', () => {
    const bundlePath = path.join(__dirname, 'tmp-bundle.json');
    fs.writeFileSync(bundlePath, JSON.stringify({ manifest: { merkleRoot }, evidences: hashes.map(hash => ({ hash })) }));
    const stdout = execFileSync('node', [path.join(__dirname, '..', 'index.js'), '--bundle', bundlePath], { encoding: 'utf-8' });
    expect(stdout).toContain('Manifest verified');
    fs.unlinkSync(bundlePath);
  });
});
