# Data Handling Standard: Agentic Verification (80% Problem)

## Purpose
Define data classification, retention, and never-log requirements for the agentic verification
workflow. This standard is enforcement-aligned with governance and evidence-first policy.

## Never Log / Never Persist
The following content must never be written to evidence artifacts, logs, or CI output:
- Prompts or model transcripts
- API keys, tokens, secrets, or credential material
- Customer data or PII/PHI
- Full file contents outside the repository

## Evidence Artifact Rules
- Evidence artifacts must be deterministic and contain only minimal metadata required for
  verification.
- Redaction must be applied to any strings matching configured secret patterns.
- `stamp.json` may include only content hash and rules version; no timestamps or system metadata.

## Retention
- Evidence artifacts are stored only as CI artifacts for the build unless explicitly required for
  compliance or audit.
- If committed, evidence artifacts must be validated as non-sensitive and required by policy.

## Enforcement
- CI secret scanning must block merges when evidence/log output matches secret patterns.
- Any evidence artifact that violates this standard is treated as a build-blocking defect.

## MAESTRO Alignment
- **MAESTRO Layers**: Data, Observability, Security.
- **Threats Considered**: data leakage via logs, prompt exfiltration, artifact tampering.
- **Mitigations**: never-log list, redaction, deterministic artifacts, CI secret scanning.

## Authority
This standard is governed by the Summit governance framework and the Summit Readiness Assertion.
