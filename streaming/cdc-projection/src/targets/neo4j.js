/**
 * Idempotent Neo4j Target Adapter
 *
 * This uses parameterized Cypher queries to ensure safety and performance.
 */
export async function mergeToNeo4j(event) {
  const { source_id, op_type, after, evidence_id, schema_version, ts_source } = event;

  if (op_type === 'd') {
    // Handle delete: DETACH DELETE
    const cypher = `MATCH (n {id: $source_id}) DETACH DELETE n`;
    return;
  }

  // Example MERGE using parameters
  const cypher = `
    MERGE (n:Entity {id: $source_id})
    SET n += $properties,
        n._evidence_id = $evidence_id,
        n._schema_version = $schema_version,
        n.updated_at = datetime($ts_source)
  `;
}
