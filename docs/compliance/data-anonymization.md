# Summit Data Anonymization Compliance Guide

This guide explains how Summit masks personally identifiable information (PII) in both PostgreSQL and Neo4j to support GDPR requests such as the right to erasure and data minimization.

## Overview

The anonymization workflow consists of four coordinated components:

1. **Database schema extensions** to track anonymization runs and annotate masked records.
2. **A Python anonymizer** (`server/scripts/data_anonymizer.py`) that rewrites sensitive values using the [`faker`](https://faker.readthedocs.io/) library.
3. **GraphQL orchestration** via the `triggerAnonymization` mutation for on-demand execution.
4. **Audit artefacts** persisted in PostgreSQL (`anonymization_runs` table) and Neo4j (`AnonymizationRun` nodes and run metadata on `Person` nodes).

The run metadata captures scope, timestamps, dry-run flags, row/node counts, and user attribution so compliance teams can prove when masking occurred.

## Database Changes

### PostgreSQL

* New table `anonymization_runs` stores run metadata (`id`, `triggered_by`, `scope`, `status`, counters, timestamps, notes).
* `users` and `entities` tables now include `anonymized_at` and `anonymization_run_id` columns to tag affected records.
* Indices on `anonymization_runs.started_at` and `completed_at` support chronological reporting.

### Neo4j

* Constraint `anonymization_run_id_unique` enforces unique run identifiers on `AnonymizationRun` nodes.
* Indexes on `Person.anonymizationRunId` and `Person.anonymized` accelerate lookup of masked data for attestations.

These schema updates should be deployed through the existing migration pipeline (`npm run db:migrate`).

## Running the Python Anonymizer

The script can be run standalone or triggered via GraphQL.

```bash
# Install dependencies (once)
pip install -r server/requirements.txt

# Execute against both databases
python3 server/scripts/data_anonymizer.py --postgres --neo4j --triggered-by <user-id>

# Preview changes without committing
python3 server/scripts/data_anonymizer.py --postgres --neo4j --dry-run
```

Environment variables determine connectivity:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` *or* (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE`) | PostgreSQL connection info | `localhost:5432` (Summit) |
| `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE` | Neo4j connection info | `bolt://localhost:7687` |

The script logs operational details to `stderr` and prints a JSON summary to `stdout`:

```json
{
  "run_id": "cc1df2b7-...",
  "status": "COMPLETED",
  "dry_run": false,
  "scope": ["POSTGRES", "NEO4J"],
  "started_at": "2025-09-30T17:15:20Z",
  "completed_at": "2025-09-30T17:15:55Z",
  "masked_postgres": 42,
  "masked_neo4j": 16,
  "notes": "Anonymized 42 PostgreSQL records and 16 Neo4j nodes."
}
```

## GraphQL Trigger

The `triggerAnonymization` mutation executes the Python script from the server tier. Example request:

```graphql
mutation RunAnonymizer {
  triggerAnonymization(
    input: {
      targets: [POSTGRES, NEO4J]
      dryRun: false
      requestedBy: "user-1234"
    }
  ) {
    runId
    status
    dryRun
    scope
    startedAt
    completedAt
    maskedPostgres
    maskedNeo4j
    notes
  }
}
```

Responses mirror the JSON payload shown above. The server resolves `requestedBy` automatically from the authenticated context if omitted.

## Operational Checklist

1. **Schedule maintenance**: anonymization rewrites PII in place; run during low-traffic windows or via dry-run first.
2. **Document approvals**: record change tickets referencing the run identifier.
3. **Verify results**: query `anonymization_runs` for the latest status and compare before/after row counts.
4. **Retain artefacts**: export run summaries and attach to GDPR case files.
5. **Repeat as needed**: rerun for additional tenants or data sets; subsequent runs overwrite PII with new masked values.

## Compliance Considerations

* **Data Minimization**: anonymized fields no longer contain live PII but maintain referential integrity for analytics.
* **Auditability**: run metadata and indexes provide traceability for regulators.
* **Access Control**: restrict GraphQL mutation execution to privileged compliance roles.
* **Incident Response**: in the event of failure, the script records a `FAILED` status with diagnostic notes for rapid remediation.

For further automation, integrate the mutation into GDPR case workflows so case managers can trigger masking directly from the Summit UI.
