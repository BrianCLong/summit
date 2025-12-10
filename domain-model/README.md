# IntelGraph Canonical Domain Model

This package defines the versioned, contract-first schemas for IntelGraph entities and relationships. Service teams and ingest pipelines should validate against these definitions before writing to shared stores to minimize churn and ensure interoperability.

## Versioning

- Schemas live under `v{n}/`. The current canonical release is **v1**.
- Every payload includes `schemaVersion` with the version string (e.g., `"v1"`).
- Additive-only: introduce new fields as optional with clear defaults; do not delete or rename existing fields within a major version.
- To ship breaking changes, clone the prior directory (e.g., `v1` -> `v2`) and update contracts there; keep v1 fixtures validating until downstream teams declare readiness.

## Canonical entity types (v1)

| Type | Mandatory fields | Recommended fields | Optional fields |
| --- | --- | --- | --- |
| Person | `id`, `schemaVersion`, `entityType`, `name` | `givenName`, `familyName`, `roles`, `employerId` | `dateOfBirth`, `nationalities`, `contact`, `metadata`, `external` |
| Organization | `id`, `schemaVersion`, `entityType`, `name` | `legalName`, `industry`, `hqLocationId` | `registration`, `parentOrganizationId`, `metadata`, `external` |
| Asset | `id`, `schemaVersion`, `entityType`, `name`, `assetType` | `ownerId`, `locationId`, `value`, `currency` | `metadata`, `external` |
| Event | `id`, `schemaVersion`, `entityType`, `name` | `category`, `occurredAt`, `locationId` | `timeRange`, `metadata`, `external` |
| Location | `id`, `schemaVersion`, `entityType`, `name` | `country`, `geo` | `address`, `metadata`, `external` |
| Case | `id`, `schemaVersion`, `entityType`, `title`, `status`, `createdAt` | `priority`, `ownerId`, `description` | `updatedAt`, `metadata` |
| Evidence | `id`, `schemaVersion`, `entityType`, `title`, `artifactType` | `caseId`, `uri`, `hash`, `collectedAt` | `description`, `metadata`, `external` |
| Claim | `id`, `schemaVersion`, `entityType`, `statement`, `support` | `subjectId`, `evidenceIds`, `confidence`, `issuedAt` | `metadata` |
| License | `id`, `schemaVersion`, `entityType`, `name` | `holderId`, `issuedBy`, `validFor` | `scope`, `metadata` |
| PolicyTag | `id`, `schemaVersion`, `entityType`, `label` | `description`, `appliesTo` | `metadata` |

## Canonical relationship types (v1)

Relationships conform to `v1/relationships/relationship.schema.json` with `relationshipType` enumerations:

- `associatedWith`, `controls`, `attended`, `locatedIn`, `derivedFrom`, `supports`, `contradicts`, `owns`, `governedBy`, `licensedBy`
- Mandatory fields: `id`, `schemaVersion`, `relationshipType`, `sourceId`, `targetId`
- Recommended: `sourceType`, `targetType`, `validDuring`, `evidenceIds`, `metadata`

## Mapping & ingestion guidance

1. Normalize identifiers to the `Identifier` pattern (3–128 characters; ULID/UUID preferred).
2. Always set `schemaVersion` to the canonical version you target; reject writes that mix versions in the same batch.
3. Use RFC3339 UTC timestamps for all temporal fields. Use `validDuring` for ranges instead of bespoke start/end fields.
4. Store external provenance in `external` references rather than bespoke notes; governance tags should be expressed as `PolicyTag` entities and connected via relationships.
5. Downstream services should rely on `entityType` to route to specialized logic and maintain backward compatibility as versions evolve.

## Validation

- Sample payloads for each entity and relationship live in `samples/v1/` and are exercised by `domain-model/tests/validate_samples.py`.
- To validate your own payloads:

```bash
python domain-model/tests/validate_samples.py --sample path/to/payload.json
```

Add new fixtures alongside the versioned schema folder and extend the validator test to include them.

## Migration semantics

- Additive fields must default to safe, non-breaking values.
- When introducing a new relationship or entity type, include a sample payload and list affected teams in `SCHEMA_CHANGELOG.md`.
- For breaking changes, create a new version directory, copy forward schemas, and clearly mark EOL dates for the previous version.
