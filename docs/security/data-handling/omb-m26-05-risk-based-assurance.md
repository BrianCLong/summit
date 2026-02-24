# Data Handling: OMB M-26-05 Evidence Packs

## Classification
Evidence Packs are classified as **Controlled – Vendor Deliverable**.

## Sensitive Information Guardrails
The following information **must never** be included in an evidence pack:
- Secrets (API keys, tokens, signing keys).
- Raw environment variable dumps.
- Internal infrastructure URLs or IPs.
- Customer-specific identifiers.

## Redaction
Vulnerability reports should be aggregated and summarized. Do not include raw logs that might contain sensitive paths or stack traces unless explicitly required by a specific risk profile.

## Storage and Retention
- Artifacts are stored in the CI/CD system with a standard retention of 90 days.
- Released packs are stored as release assets and retained indefinitely or per the release lifecycle policy.
