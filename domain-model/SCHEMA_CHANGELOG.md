# Canonical Schema Changelog

## 2025-02-01 — Initial v1 drop

- Added base type definitions for identifiers, timestamps, provenance, and time ranges.
- Published v1 entity schemas: Person, Organization, Asset, Event, Location, Case, Evidence, Claim, License, PolicyTag.
- Added v1 relationship schema covering `associatedWith`, `controls`, `attended`, `locatedIn`, `derivedFrom`, `supports`, `contradicts`, `owns`, `governedBy`, `licensedBy`.
- Shipped validation samples and test harness (`domain-model/tests/validate_samples.py`).

### Impacted teams
- **Ingest**: map source payloads to canonical IDs, timestamps, and `schemaVersion` before persisting.
- **Graph/XAI**: rely on `entityType` and relationship enumerations for traversal and explanations.
- **Governance**: enforce `PolicyTag` attachment via relationships; ensure warrants/licenses reference `validFor` ranges.
- **Case/Report**: consume `Case`, `Evidence`, and `Claim` schemas for report generation and auditability.
