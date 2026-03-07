# Data Handling: Architecture Map

## Data Classes
- **Public**: Architecture documentation, diagram outputs
- **Internal**: Repo structure metadata
- **Generated**: Artifact metadata, metrics
- **Security**: Test fixtures, policy regression outputs

## Never Log
- Raw user prompts from future creative/simulation workloads
- Raw uploaded media
- Voice samples
- Unredacted provider secrets
- Unsafe scenario payloads beyond test fixtures

## Retention
- **Blueprint CI Logs**: 14 days
- **Metrics Artifacts**: 90 days
- **Deterministic Blueprint Artifacts**: Retained in Git or release artifacts as policy allows
