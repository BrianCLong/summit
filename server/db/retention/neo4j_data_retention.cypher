// Summit Data Retention Automation for Neo4j
//
// This Cypher script archives or deletes nodes that have exceeded their
// approved retention window. Nodes must be labeled RetentionManaged and
// provide a `retentionExpiresAt` datetime property. An optional
// `retentionAction` property can override the global default of ARCHIVE.
//
// The workflow mirrors the PostgreSQL implementation:
//  * Expired nodes are streamed in deterministic batches.
//  * ARCHIVE moves the node payload into an ArchivedSnapshot node for
//    long-term storage before deleting the original node.
//  * DELETE removes the node immediately when GDPR's right-to-be-forgotten
//    obligations apply.
//  * Each execution appends metrics to a RetentionAudit node so auditors
//    can verify when retention processing occurred.

WITH datetime() AS startedAt, apoc.create.uuid() AS runId
CALL apoc.periodic.iterate(
    'MATCH (n:RetentionManaged)
     WHERE n.retentionExpiresAt <= datetime()
     RETURN n, coalesce(n.retentionAction, $defaultAction) AS action',
    'CALL apoc.do.when(
         action = "ARCHIVE",
         "MERGE (archive:ArchivedSnapshot {sourceNodeId: id(n)})\n"
         "SET archive += properties(n),\n"
         "    archive.archivedAt = datetime(),\n"
         "    archive.sourceLabels = labels(n)\n"
         "WITH archive, n\n"
         "MERGE (audit:RetentionAudit {runId: $runId})\n"
         "ON CREATE SET audit.startedAt = $startedAt\n"
         "SET audit.lastUpdated = datetime(),\n"
         "    audit.totalProcessed = coalesce(audit.totalProcessed, 0) + 1,\n"
         "    audit.archived = coalesce(audit.archived, 0) + 1\n"
         "DETACH DELETE n\n"
         "RETURN archive",
         'MERGE (audit:RetentionAudit {runId: $runId})\n'
         'ON CREATE SET audit.startedAt = $startedAt\n'
         'SET audit.lastUpdated = datetime(),\n'
         '    audit.totalProcessed = coalesce(audit.totalProcessed, 0) + 1,\n'
         '    audit.deleted = coalesce(audit.deleted, 0) + 1\n'
         'DETACH DELETE n',
         {n: n, runId: $runId, startedAt: $startedAt}
     ) YIELD value
     RETURN value',
    {
        batchSize: 500,
        parallel: false,
        params: {
            defaultAction: 'ARCHIVE',
            runId: runId,
            startedAt: startedAt
        }
    }
) YIELD batches, total, errorMessages
RETURN {
    runId: runId,
    startedAt: startedAt,
    batches: batches,
    totalProcessed: total,
    errors: errorMessages
} AS retentionSummary;
