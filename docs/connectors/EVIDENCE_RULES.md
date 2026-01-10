# Evidence Rules Engine

This module provides a mechanism to score connector outputs for evidence completeness.

## Rules

Currently defined rules in `server/src/connectors/evidence/rules.ts`:

1.  **Required Fields (`required-fields`)**: Checks for the presence of `id`, `timestamp`, and `content`.
2.  **Redaction Marker Presence (`redaction-marker-presence`)**: Checks if the content contains explicit redaction markers (e.g., `[REDACTED]`, `[PROTECTED]`). This ensures that sensitive data handling has been acknowledged, even if simply to mark it as redacted.
3.  **Source Reference (`source-reference`)**: Checks for source attribution via `url`, `metadata.source`, or `provenance`.

## Scoring

The scoring function is located in `server/src/connectors/evidence/score.ts`.
It calculates a weighted score between 0 and 1 based on the passing rules.

## Usage

```typescript
import { scoreEvidence } from 'server/src/connectors/evidence/score';

const evidence = { ... };
const score = scoreEvidence(evidence);
console.log(score.score); // 0.0 to 1.0
console.log(score.missing); // Array of failed rule IDs
```
