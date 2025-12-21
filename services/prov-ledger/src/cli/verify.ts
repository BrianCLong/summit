#!/usr/bin/env tsx
import axios from 'axios';
import { LedgerService } from '../services/LedgerService.js';
import { buildMerkleRoot } from '../utils/merkle.js';

async function main() {
  const claimId = process.argv[2];
  if (!claimId) {
    console.error('Usage: make verify-claim ID=<claimId>');
    process.exit(1);
  }

  const baseUrl = process.env.PROV_LEDGER_URL || 'http://localhost:4010';
  const manifestResp = await axios.get(`${baseUrl}/v1/manifest/${claimId}`);
  const manifest = manifestResp.data;

  const ledger = LedgerService.getInstance();
  const persisted = await ledger.getManifest(claimId);
  if (!persisted) {
    console.error('Claim not found in ledger');
    process.exit(1);
  }

  const recomputedRoot = buildMerkleRoot(persisted.entries.map((e) => e.hash));
  if (recomputedRoot !== manifest.merkleRoot) {
    console.error('Merkle root mismatch', { recomputedRoot, reportedRoot: manifest.merkleRoot });
    process.exit(1);
  }

  console.log(`Claim ${claimId} verified. Merkle root ${recomputedRoot}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification failed', err);
  process.exit(1);
});
