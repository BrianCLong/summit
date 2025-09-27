# Summit Intelligence Graph — Entity Catalog

This catalog defines the canonical graph entities, relationships, and supporting metadata for Workstream 3. Each section lists the governing semantics, mandatory fields, and deduplication/idempotency guidance referenced by the ingestion specifications.

## Node Entities

| Label | Business Semantics | Key Properties | Uniqueness Key | Notes |
| --- | --- | --- | --- | --- |
| `Person` | Human actor whose attributes may include PII. | `person_id` (UUID), `full_name`, `email`, `role`, `last_seen_at`, `purpose_tags`, `pii_level`, `provenance_ref` | `person_id` | `email` treated as secondary key for merge; `purpose_tags` required for purpose limitation enforcement. |
| `Organization` | Legal entity or team responsible for assets and accounts. | `org_id`, `name`, `category`, `jurisdiction`, `residency_zone`, `purpose_tags`, `provenance_ref` | `org_id` | `jurisdiction` drives residency controls. |
| `Account` | Logical account or credential used by a `Person`. | `account_id`, `platform`, `status`, `created_at`, `last_auth_at`, `risk_score`, `pii_level`, `purpose_tags`, `provenance_ref` | `account_id` | `pii_level` inherits from linked `Person`. |
| `Event` | Operational event emitted by connectors or downstream analytics. | `event_id`, `event_type`, `severity`, `occurred_at`, `processed_at`, `ingest_source`, `payload_hash`, `purpose_tags`, `provenance_ref` | `event_id` | `payload_hash` is SHA-256 of raw payload for idempotency. |
| `DataAsset` | Dataset, file, or service node. | `asset_id`, `name`, `classification`, `storage_type`, `residency_zone`, `purpose_tags`, `provenance_ref` | `asset_id` | `classification` aligns to internal data taxonomy. |
| `Location` | Physical or logical geography. | `location_id`, `name`, `region`, `country`, `latitude`, `longitude` | `location_id` | Used to enforce residency obligations. |
| `SourceSystem` | Upstream system/connector emitting data. | `source_system_id`, `name`, `connector_type`, `version`, `provenance_ref` | `source_system_id` | `version` mapped to connector release for troubleshooting. |

## Relationship Definitions

| Type | Direction | Description | Key Properties | Uniqueness Key |
| --- | --- | --- | --- | --- |
| `(:Person)-[:MEMBER_OF]->(:Organization)` | Outbound from `Person` | Membership or employment relationship. | `assigned_at`, `role`, `purpose_tags`, `provenance_ref`, `person_id`, `org_id` | `(person_id, org_id, assigned_at)` |
| `(:Person)-[:USES]->(:Account)` | Outbound from `Person` | Active use of an `Account`. | `person_id`, `account_id`, `connected_at`, `last_verified_at`, `purpose_tags`, `provenance_ref` | `(person_id, account_id)` |
| `(:Account)-[:ACCOUNT_OF]->(:Organization)` | Outbound from `Account` | Ownership of account by `Organization`. | `account_id`, `org_id`, `purpose_tags`, `provenance_ref` | `(account_id, org_id)` |
| `(:Organization)-[:OWNS]->(:DataAsset)` | Outbound from `Organization` | Custodial ownership of asset. | `org_id`, `asset_id`, `ownership_type`, `purpose_tags`, `provenance_ref` | `(org_id, asset_id)` |
| `(:DataAsset)-[:HOSTED_BY]->(:Organization)` | Outbound from `DataAsset` | Hosting/compute provider. | `asset_id`, `org_id`, `hosting_model`, `purpose_tags`, `provenance_ref` | `(asset_id, org_id)` |
| `(:Event)-[:OCCURRED_AT]->(:Location)` | Outbound from `Event` | Geospatial resolution of event. | `event_id`, `location_id`, `confidence`, `purpose_tags`, `provenance_ref` | `(event_id, location_id)` |
| `(:Event)-[:OBSERVED_ON]->(:DataAsset)` | Outbound from `Event` | Data asset where event manifested. | `event_id`, `asset_id`, `purpose_tags`, `provenance_ref` | `(event_id, asset_id)` |
| `(:Event)-[:TRIGGERED]->(:Person|:Account|:Organization)` | Outbound from `Event` | Impacted entity (person/account/org). | `event_id`, `target_id`, `target_label`, `impact`, `purpose_tags`, `provenance_ref` | `(event_id, target_id, target_label)` |
| `(:SourceSystem)-[:EMITTED_EVENT]->(:Event)` | Outbound from `SourceSystem` | Provenance of ingested event. | `source_system_id`, `event_id`, `ingested_at`, `ingest_job_id`, `purpose_tags`, `provenance_ref` | `(source_system_id, event_id)` |

## Deduplication & Idempotency Rules

- **Node merges:** Merge operations use the uniqueness key. CSV ingestion should `MERGE` on the ID and update mutable attributes using `SET`. The HTTP streaming spec relies on `payload_hash` to skip duplicates pre-write.
- **Relationship merges:** Relationship operations `MERGE` on the uniqueness tuple while setting latest metadata (`last_verified_at`, `ingested_at`).
- **Idempotent re-ingest:** On repeated runs, record-level `payload_hash` and `provenance_ref` must match. Rows with unchanged `payload_hash` are no-ops; mismatched payloads trigger `Event` upserts plus `Event` lineage update.
- **Golden dataset coverage:** CSV fixtures in `datasets/golden` cover at least one example of each node and relationship. A repeated `Event` JSON message demonstrates dedupe logic (identical `payload_hash`).

## Purpose & Lineage Metadata

- `purpose_tags` enumerations: `operations`, `security-monitoring`, `compliance`, `analytics`.
- `provenance_ref` contains a deterministic `<connector>/<dataset>/<timestamp>` token and links to the ingestion job manifest.
- All relationship payloads must embed the upstream `provenance_ref` from the corresponding node record for traceability.

## Residency Considerations

- `residency_zone` values: `us-east`, `eu-central`, `ap-southeast`. Enforcement is orchestrated via `policy/retention.yaml` and ingestion validation.
- `Location.country` must align with ISO 3166-1 alpha-2 codes to enable deterministic routing.
