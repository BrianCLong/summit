# IO Data Contracts v1

This document defines the IO canonical schemas, identifiers, and provenance envelope. It is
intentionally constrained to deterministic, auditable processing.

## Canonical identifiers

All IO data must use stable IDs that are deterministic and tenant-scoped.

- `entity_id` (people, orgs, assets)
- `content_id` (posts, media, documents)
- `campaign_id` (coordinated activity)
- `evidence_id` (artifacts, evaluations, reports)

### Evidence ID pattern (non-negotiable)

`EVID::<tenant>::<domain>::<artifact>::<yyyy-mm-dd>::<gitsha7>::<runid8>`

Examples:

- `EVID::acme::io::cib_eval::2026-02-07::a1b2c3d::9f2a1c0b`
- `EVID::acme::io::attrib_report::2026-02-07::a1b2c3d::f0e1d2c3`

## Provenance envelope (required)

Every IO record must include the following fields:

- `source` (platform/partner/feed identifier)
- `collection_method` (API/export/partner/approved capture)
- `timestamp` (RFC3339)
- `hash` (sha256 of normalized payload)
- `license` (license/ToS reference)
- `retention_class` (policy-defined class)
- `tenant_id` (tenant scope)
- `chain_of_custody[]` (ordered list of custody events)

## Canonical schema inventory

Schemas are located in `schemas/io/`:

- `content.schema.json` (content assets)
- `account.schema.json` (accounts/actors)
- `post.schema.json` (platform posts)
- `engagement.schema.json` (engagement events)
- `campaign.schema.json` (coordination/campaign metadata)
- `provenance.schema.json` (required provenance envelope)

## Determinism requirements

- Deterministic transforms only: fixed seeds, pinned models, immutable configs.
- Schema validation is mandatory at IO boundaries (ingest, normalize, detect, export).
- `metrics.json` and `stamp.json` must be emitted for all evaluation suites and exports.

## Retention & privacy policy alignment

Retention classes and PII handling must align with:

- `policy/retention.yaml`
- `policy/collection_matrix.yaml`
- `policy/provenance.rego`

All deviations are **Governed Exceptions** and require evidence-backed approval.
