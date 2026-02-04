# Cognitive Warfare Data Model (Additive)

## Entities (Minimal)

- **CognitiveEvent**: A defensive observation about cognition-affecting activity.
- **InfluenceArtifact**: A content object (no generation or optimization).
- **ProvenanceRecord**: Hashes and source metadata for artifacts.
- **CoordinationCluster**: Accounts/entities clustered by coordination signals.
- **IWAlert**: Indicators & warnings with severity and confidence.

## Never-Log Fields

- Raw content bodies or full media payloads.
- Unique personal identifiers and biometric data.
- High-risk handles or aliases tied to individuals.

## Classification Tags

- `public`
- `restricted`
- `sensitive`

## Schema Source of Truth

See `schemas/cogwar/*.schema.json` for authoritative definitions.
