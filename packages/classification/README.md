# @summit/classification

Classification marking, validation, and handling system for intelligence products with proper security markings, caveats, and dissemination controls.

## Features

- Classification level marking (U through TS/SCI)
- Security caveats and controls
- Dissemination markings (NOFORN, RELTO, etc.)
- SCI control compartments
- Derivative classification
- Declassification instructions
- Validation and compliance checks

## Usage

```typescript
import { ClassificationMarker } from '@summit/classification';

const marker = new ClassificationMarker();

const marking = {
  level: 'SECRET',
  caveats: ['NOFORN'],
  derivedFrom: 'Multiple Sources',
  declassifyOn: '20450101'
};

const banner = marker.generateBanner(marking);
console.log(banner); // "SECRET//NOFORN"

const validation = marker.validateMarking(marking);
console.log(validation.valid); // true
```
