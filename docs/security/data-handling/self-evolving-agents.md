# Data Handling: Self-Evolving Agents

## Data Classification (ITEM:CLAIM-03)
- **Evolution Patches**: Classified as System Configuration (Public-Internal).
- **Meta-Cognition Traces**: Classified as Operational Telemetry (Internal).
- **Feedback Signals**: Classified as Performance Metrics (Internal).

## Never-Log List
- Raw customer prompts.
- Credentials or API keys.
- Tokens (unless hashed/redacted).
- PII/PHI fields.
- Proprietary code blobs.

## Redaction Policy
All evidence artifacts must pass through the `summit_harness.redaction` hooks before being written to disk.
Deterministic hashing should be used for stable identifiers within a run.

## Retention
- Artifacts TTL: 14 days.
- Opt-out available via `SUMMIT_SELF_EVOLVE_OPT_OUT` environment variable.
