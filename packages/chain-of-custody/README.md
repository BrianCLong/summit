# @intelgraph/chain-of-custody

Chain of custody tracking for evidence management and legal compliance.

## Features

- **Evidence Collection**: Capture evidence with metadata and cryptographic hash
- **Sealing**: Make evidence immutable on blockchain
- **Custody Transfer**: Track transfers with signatures and witnesses
- **Legal Hold**: Prevent destruction during litigation
- **Integrity Verification**: Detect tampering via hash comparison
- **Court Reports**: Generate admissible evidence documentation
- **Gap Detection**: Identify breaks in custody chain

## Installation

```bash
pnpm add @intelgraph/chain-of-custody
```

## Usage

### Collect Evidence

```typescript
import { CustodyTracker } from '@intelgraph/chain-of-custody';
import pino from 'pino';

const tracker = new CustodyTracker(pino());

const evidence = await tracker.collectEvidence({
  type: 'digital',
  hash: '0xabc123...',
  description: 'Email correspondence for Case #12345',
  collectedBy: 'investigator-456',
  collectedAt: Date.now(),
  location: 'Evidence Server A',
  metadata: {
    caseNumber: '12345',
    originalSource: 'user@company.com',
    collectionMethod: 'forensic_imaging'
  }
});
```

### Seal Evidence

```typescript
await tracker.sealEvidence(evidence.id, 'investigator-456');
```

### Transfer Custody

```typescript
const transfer = await tracker.transferCustody(
  evidence.id,
  'investigator-456',
  'forensics-lab-789',
  'Forensic analysis required',
  'Lab Building B, Room 101',
  ['witness-1', 'witness-2']
);
```

### Place Legal Hold

```typescript
const hold = await tracker.placeLegalHold(
  [evidence.id],
  'Case-2024-CV-12345',
  'legal-counsel-123',
  'Pending litigation',
  ['no_deletion', 'no_modification', 'restricted_access']
);
```

### Generate Court Report

```typescript
const report = await tracker.generateCourtReport(evidence.id);

console.log('Evidence:', report.evidence);
console.log('Custody chain:', report.chain);
console.log('Gaps detected:', report.gaps);
console.log('Timeline:', report.timeline);
console.log('Verified:', report.verified);
```

### Verify Integrity

```typescript
const currentHash = computeHash(evidenceData);
const isValid = await tracker.verifyIntegrity(evidence.id, currentHash);

if (!isValid) {
  console.error('Evidence integrity compromised!');
}
```

## License

MIT
