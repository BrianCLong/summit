#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { LedgerService } from '../services/LedgerService.js';
import { calculateHash } from '../utils/hash.js';

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const ledger = LedgerService.getInstance();

  switch (command) {
    case 'ingest': {
      const filePath = rest[0];
      if (!filePath) throw new Error('Usage: provctl ingest <file>');
      const content = fs.readFileSync(filePath);
      const digest = 'sha256:' + calculateHash(content.toString('base64'));
      const claimId = rest[1];
      if (!claimId) throw new Error('Provide claim id as second argument');
      const evidence = await ledger.createEvidence({ claimId, artifactDigest: digest, transformChain: [] });
      console.log(JSON.stringify(evidence, null, 2));
      break;
    }
    case 'claim': {
      const sourceUri = rest[0];
      const licenseId = rest[1] ?? 'license-default';
      if (!sourceUri) throw new Error('Usage: provctl claim <sourceUri> [licenseId]');
      const hash = 'sha256:' + calculateHash(sourceUri);
      const claim = await ledger.createClaim({
        sourceUri,
        hash,
        type: 'assertion',
        confidence: 1,
        licenseId,
      });
      console.log(JSON.stringify(claim, null, 2));
      break;
    }
    case 'export': {
      const bundleId = rest[0];
      const outFile = rest[1] ?? 'manifest.json';
      if (!bundleId) throw new Error('Usage: provctl export <claimId> [outFile]');
      const manifest = await ledger.buildManifest(bundleId);
      if (!manifest) {
        throw new Error('Bundle not found');
      }
      fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
      console.log(`Manifest written to ${path.resolve(outFile)}`);
      break;
    }
    case 'verify': {
      const manifestPath = rest[0];
      if (!manifestPath) throw new Error('Usage: provctl verify <manifestFile>');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const leafHashes: string[] = manifest.leaves.map((leaf: any) => leaf.hash);
      const expected = manifest.merkleRoot;
      const recomputed = calculateHash(leafHashes.join('|'));
      const valid = recomputed === expected || manifest.tree.root === expected;
      console.log(valid ? '✅ Manifest verified' : '❌ Manifest invalid');
      break;
    }
    default:
      console.log('Commands: ingest <file> <claimId>, claim <sourceUri> [licenseId], export <claimId> [out], verify <file>');
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

