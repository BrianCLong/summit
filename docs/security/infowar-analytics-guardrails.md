# Info Warfare Analytics Guardrails

This document defines the governance and safety policies for the INFOWAR situational picture.

## No-Offensive Use Statement
The Summit platform is intended for defensive and OSINT purposes only. It MUST NOT be used for:
- Conducting influence operations or micro-targeting.
- Seeding or propagating disinformation.
- Evading legitimate platform detection mechanisms.
- Instructions on building botnets or performing espionage.

## Uncertainty Policy
All analytical outputs must include a `confidence` level (`LOW`, `MEDIUM`, `HIGH`).
- Claims with missing evidence IDs must be labeled with `LOW` confidence and marked as hypothetical.
- Uncertainty boundaries must be preserved; do not maximize inference.

## Redaction Policy
Raw PII (Personally Identifiable Information), private handles, and phone numbers must never be stored or logged in public or sensitive-classified reports. Use pseudonymization or redaction at the ingestion layer.

## Audit Export Format
All interventions or significant analytical exports must be logged with:
- `timestamp`: (ISO 8601)
- `evidence_id`: Reference to the evidence bundle.
- `actor_id`: Reference to the analyst or system making the export.
- `hash`: SHA-256 of the exported artifact.

## Enforcement
These guardrails are enforced via CI gates, policy-as-code (OPA), and the "never-log" scanner.
