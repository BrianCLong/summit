# Graph Data Anonymization Playbook

The Summit platform now provides a repeatable workflow for converting production graph data into a privacy-safe fixture that can be shared with partners or loaded into lower environments. The workflow combines a Python anonymization utility with a GraphQL mutation so that security teams can trigger the process on demand without shell access to the cluster.

## Capabilities

- **Neo4j property pseudonymization** – deterministically hashes sensitive node attributes such as `name`, `ssn`, or `externalId` while preserving graph structure.
- **PostgreSQL column pseudonymization** – updates relational tables containing graph metadata so references remain in sync.
- **Tenant-aware scoping** – optional `tenantId` input restricts updates to a single tenant to avoid cross-environment contamination.
- **Dry-run safety** – set `dryRun: true` to review counts without modifying databases; PostgreSQL transactions are rolled back and Neo4j writes are skipped.
- **Auditable telemetry** – every execution emits OpenTelemetry spans (`neo4j.anonymize`, `postgres.anonymize`) that include counts of processed records for compliance evidence.

## Triggering from GraphQL

Use the `anonymizeGraphData` mutation to launch the workflow. The example below replaces people names and relationship notes for tenant `tenant-123`. The mutation writes a temporary configuration file, executes the Python anonymizer, and returns a structured summary.

```graphql
mutation AnonymizeGraph {
  anonymizeGraphData(
    input: {
      tenantId: "tenant-123"
      dryRun: false
      nodeProperties: [
        { label: "Person", properties: ["name", "nationalId"] }
        { label: "Organization", properties: ["displayName"] }
      ]
      tableColumns: [
        { table: "entities", columns: ["name"], primaryKey: "id" }
        { table: "relationships", columns: ["notes"], primaryKey: "id" }
      ]
    }
  ) {
    dryRun
    tenantId
    nodeSummary { label nodesProcessed }
    tableSummary { table rowsProcessed }
    startedAt
    completedAt
  }
}
```

**Authorization:** the resolver enforces the `graph_anonymization` policy and executes an additional `graph:anonymize` OPA scope check. Only service accounts with explicit approval should call this mutation.

## Python Utility

The script lives at `server/python/anonymization/anonymize_graph.py`. It can be executed independently for local testing:

```bash
python3 server/python/anonymization/anonymize_graph.py \
  --config /path/to/config.json
```

Required environment variables:

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- `POSTGRES_DSN` (or `DATABASE_URL`)
- Optional: `GRAPH_ANONYMIZATION_SALT` to override the default pseudonymization salt

A sample config file:

```json
{
  "tenant_id": "tenant-123",
  "dry_run": true,
  "node_properties": [
    { "label": "Person", "properties": ["name", "email"] }
  ],
  "table_columns": [
    { "table": "entities", "columns": ["name"], "primary_key": "id" }
  ]
}
```

## Telemetry & Auditing

Each run emits span events with counts of affected nodes and rows. Connect your OpenTelemetry collector to receive these spans and archive them in the compliance data lake. Because pseudonymization is deterministic, repeating the operation with the same salt yields consistent outputs, simplifying diff-based verifications.

## Operational Guidance

1. Perform a `dryRun` first to confirm the volume of changes.
2. Capture the OpenTelemetry trace ID and attach it to the change ticket.
3. Switch `dryRun` to `false` once approvers sign off.
4. Validate the sanitized dataset in the target environment before sharing externally.

Following this playbook ensures that shared graph datasets stay aligned with Summit’s privacy and compliance commitments.
