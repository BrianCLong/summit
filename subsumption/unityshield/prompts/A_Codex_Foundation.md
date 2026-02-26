# Sub-Agent Prompt A: Codex (Foundation Engineering)

**Role**: Codex (Engineer)
**Context**: UnityShield Subsumption (Phase 1)
**Task**: Implement the UnityShield ingestion adapter skeleton.

## Constraints
- Directory: `src/connectors/unityshield/`
- Tech: TypeScript / Node.js
- No new dependencies. Use existing Kafka/PostgreSQL clients.

## Requirements
- FR1.1: Support structured/unstructured ingestion.
- FR1.4: Implement data validation for UnityShield signatures.
- Output: Standardized event envelope for Summit ingestion bus.

## Evidence
- Produce Evidence ID: `EVD-UNITYSHIELD-FND-001`
- Add unit tests for validation logic.
