---
title: Data handling – sitrep-2026-02-06-io-espionage
summary: Public OSINT handling, redaction, retention, and logging policy for sitrep pipeline.
owner: intelgraph
version: v1
lastUpdated: 2026-02-06
---

# Data handling – sitrep-2026-02-06-io-espionage

## Classification
- Inputs: Public OSINT (Reuters, RSF).
- Outputs: Derived analytical artifacts; treat as controlled internal.

## Never-log policy
Redact before logging:
- Email addresses
- Phone numbers
- Device identifiers (MAC, IMEI, serials)
- Personal addresses (street-level)

## Retention & storage
- Raw HTML/text stored only in evidence bundles.
- No raw content in application logs.
- Derived claims and graph nodes stored in standard data stores.

## Sanitization
- Strip scripts and unsafe tags from HTML.
- Allowlist content types for ingestion.
- Reject inline scripts and event handlers.

## Attribution safety
- Use “source reports” or “analysis reports” phrasing.
- No unverified attribution beyond source statements.

## Governance alignment
- Policy-as-code required for any regulatory logic.
- Decision reversibility enforced through evidence bundles and hashes.

## Compliance evidence
- Evidence artifacts: `report.json`, `metrics.json`, `stamp.json`.
- Hash chain and determinism gate required for CI.
