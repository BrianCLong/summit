# @ga-graphai/prov-ledger

Quantum-safe provenance ledger utilities for Summit's graph orchestration stack.

## Features

- Hybrid Lamport + Ed25519 signatures for quantum-resistant verification.
- Schnorr-style zero-knowledge identity proofs for actor authentication without revealing secrets.
- HMAC-backed access tokens binding actors and scopes to ledger writes.
- Chained hashes across entries to preserve immutability and detect tampering.
- Evidence bundle export for downstream audit tooling.

## Usage

```ts
import {
  AccessTokenService,
  QuantumSafeLedger,
  createSchnorrProof,
  generateHybridKeyPair,
  generateSchnorrKeyPair,
  signHybrid,
  computeLedgerHash,
} from '@ga-graphai/prov-ledger';

const tokenService = new AccessTokenService(process.env.LEDGER_TOKEN_SECRET ?? 'secret');
const identity = generateSchnorrKeyPair();
const ledger = new QuantumSafeLedger(tokenService, { identityPublicKey: identity.publicKey });

const fact = {
  id: 'evt-1',
  category: 'intel',
  actor: 'alice',
  action: 'publish',
  resource: 'report-42',
  payload: { classification: 'secret' },
};

const timestamp = new Date().toISOString();
const hash = computeLedgerHash(fact, timestamp);
const signature = signHybrid(hash, generateHybridKeyPair());
const zkProof = createSchnorrProof(identity, hash);
const token = tokenService.issue(fact.actor, fact.category).token;

ledger.append({ ...fact, timestamp }, signature, token, zkProof);
ledger.verifyChain(); // true when signatures, proofs, and tokens are intact
```

## Tests

```bash
cd ga-graphai/packages/prov-ledger
npm test
```

All cryptographic helpers are deterministic and covered by unit tests to ensure chain verification remains stable.
