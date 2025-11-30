# CompanyOS Data Spine Event Schemas (v1)

This directory contains the canonical, versioned schemas for CompanyOS Data Spine events. Every producer MUST wrap payloads in the shared envelope and use the event-specific schemas defined here.

## Envelope
- **Schema:** [`base-envelope.schema.json`](./base-envelope.schema.json)
- **Fields:** `event_id`, `event_type`, `event_version`, `occurred_at`, `recorded_at`, `tenant_id`, optional `subject_id`, `source_service`, optional `trace_id`, optional `correlation_id`, optional `region`, and a typed `data` payload.
- **Guarantees:** `event_id` is globally unique; `event_type` matches `<domain>.<name>.v<major>`; timestamps are ISO 8601 UTC.

## Event Types (v1)
- [`authz.decision.v1`](./authz.decision.v1.schema.json): ABAC/RBAC decision with resource, action, decision, policy identifiers, hashed client hints, and flag snapshots.
- [`policy.bundle_updated.v1`](./policy.bundle_updated.v1.schema.json): Publication, rollback, or deprecation of a policy bundle with checksum lineage.
- [`config.changed.v1`](./config.changed.v1.schema.json): Configuration/flag changes with redacted previous/new values and approval metadata.
- [`company.profile_changed.v1`](./company.profile_changed.v1.schema.json): CDC event for `company_profiles` (or equivalent) with redacted state and field-level classification map.

## Compatibility & Evolution Rules
- **Backward compatible (minor):** Additive `data` fields, widening enums, or new optional metadata. Producers may start emitting immediately; consumers must tolerate absence.
- **Forward compatible (patch):** Documentation or description-only updates. No structural changes.
- **Breaking (major):** Removing/renaming fields, narrowing enums, or altering semantics. Requires new `<event>.v{n+1}` schema and coordinated consumer rollout.
- **Deprecation:** Mark schema with description and add to `deprecated` list (future work) before removal; maintain at least one sprint of dual-write.

## Data Classification & Redaction
- Sensitive attributes (PII, secrets) MUST be hashed or omitted before emission. `authz.decision.v1` uses `client_ip_hash` instead of raw IP, and roles/attributes should exclude direct identifiers.
- CDC events include a `classification` map so downstream DLP hooks can enforce drop/redact rules in sinks.

## Examples
Valid sample payloads live in [`./examples`](./examples). To validate locally with `python -m jsonschema` (requires `jsonschema`):

```bash
python -m jsonschema \
  --instance examples/authz.decision.v1.example.json \
  --schema authz.decision.v1.schema.json
```

## Governance
- Schemas are the **registry of record**; changes require schema review + CI validation.
- Event producers should pin to explicit versions and emit `event_version` accordingly.
- Consumers MUST log the schema `$id` and `event_version` they processed to support lineage.
