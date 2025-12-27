# @ga-graphai/prov-ledger

Quantum-safe provenance ledger utilities for Summit's graph orchestration stack.

## Features

- Hybrid Lamport + Ed25519 signatures for quantum-resistant verification.
- Schnorr-style zero-knowledge identity proofs for actor authentication without revealing secrets.
- HMAC-backed access tokens binding actors and scopes to ledger writes.
- Chained hashes across entries to preserve immutability and detect tampering.
- Evidence bundle export for downstream audit tooling.
- Control crosswalks that map SOC 2, ISO 27001, GDPR, HIPAA, PCI, and NIST controls to shared evidence so auditors do not need
  duplicate uploads.
- Auditor portal tickets that grant secure, read-only evidence access scoped to approved frameworks.

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
} from "@ga-graphai/prov-ledger";

const tokenService = new AccessTokenService(process.env.LEDGER_TOKEN_SECRET ?? "secret");
const identity = generateSchnorrKeyPair();
const ledger = new QuantumSafeLedger(tokenService, { identityPublicKey: identity.publicKey });

const fact = {
  id: "evt-1",
  category: "intel",
  actor: "alice",
  action: "publish",
  resource: "report-42",
  payload: { classification: "secret" },
};

const timestamp = new Date().toISOString();
const hash = computeLedgerHash(fact, timestamp);
const signature = signHybrid(hash, generateHybridKeyPair());
const zkProof = createSchnorrProof(identity, hash);
const token = tokenService.issue(fact.actor, fact.category).token;

ledger.append({ ...fact, timestamp }, signature, token, zkProof);
ledger.verifyChain(); // true when signatures, proofs, and tokens are intact
```

### Auditor portal and control crosswalks

```ts
import { AuditorPortal, ControlCrosswalk } from "@ga-graphai/prov-ledger";

const crosswalk = new ControlCrosswalk();
crosswalk.registerCanonical({ id: "AUTH-1", title: "Strong authentication" });
crosswalk.linkFrameworkControl("AUTH-1", {
  framework: "soc2",
  controlId: "CC1.1",
  title: "Logical access controls",
});
crosswalk.linkFrameworkControl("AUTH-1", {
  framework: "iso27001",
  controlId: "A.5.15",
  title: "Access control policy",
});
crosswalk.attachEvidence("AUTH-1", {
  id: "iam-policy",
  type: "policy",
  title: "IAM policy",
  uri: "s3://evidence/policies/iam.pdf",
  collectedAt: new Date().toISOString(),
});

const portal = new AuditorPortal();
const token = portal.issueReadOnlyToken("auditor@example.com", [
  "soc2",
  "iso27001",
  "gdpr",
  "hipaa",
]);
const bundle = portal.fetchEvidenceBundle(token, ["soc2", "iso27001"]);

console.log(bundle.coverage);
// { canonical: 1, frameworkMappings: 2, evidence: 1 }
// bundle.controls[0].evidence contains the shared policy without duplication across frameworks
```

## Tests

```bash
cd ga-graphai/packages/prov-ledger
npm test
```

All cryptographic helpers are deterministic and covered by unit tests to ensure chain verification remains stable.
