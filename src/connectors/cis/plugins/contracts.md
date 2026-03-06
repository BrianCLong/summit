# CIS Plugin Contracts

## IntegrityOracle
Must implement `analyze(artifactId, content)` and return `IntegritySignal`.

## NarrativeIntel
Must implement `fetchFeed(since)` and return `NarrativeItem[]`.

## Schemas
See `types.ts` for strictly typed interfaces.
