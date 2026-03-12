# Info Warfare Threat Model

This document outlines the threat landscape and corresponding mitigations for the INFOWAR situational picture.

## Threat: Liar’s Dividend
**Description:** The existence of synthetic media allows actors to claim real evidence is fake.
**Mitigation:** Enforce `EVIDENCED_BY` relationships with cryptographic hashes and provenance stamps in `stamp.json`. All claims must have an `evidence_id` linked to a verifiable artifact.

## Threat: Insider Risk / Dual-Use Leakage
**Description:** Use of defensive tooling by insiders to perform unauthorized influence operations.
**Mitigation:** Structured audit events (`INFOWAR_SITREP_VIEWED`, `INFOWAR_EVIDENCE_EXPORTED`). Access control stubs and rate limits on analytics exports.

## Threat: Multi-Platform Narrative Seeding
**Description:** Coordinated campaigns seeding a narrative across multiple platforms to create an illusion of consensus.
**Mitigation:** Multi-source ingestion and propagation graphs to identify campaign clustering and amplification patterns.

## Abuse Cases
- **Targeting Groups:** Using the narrative graph to identify and target specific populations for influence.
- **Doxxing:** Storing or exporting private PII under the guise of "OSINT".

## Controls
- **Never-Log Gate:** Scans for forbidden fields (PII, raw handles) in logs and analytical outputs.
- **Evidence Gate:** Fails if evidence IDs are missing or non-verifiable.
- **Policy Gates:** OPA rules for role-based access to sensitive INFOWAR reports.
