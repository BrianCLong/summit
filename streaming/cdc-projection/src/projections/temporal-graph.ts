import { Neo4jClient } from '@intelgraph/graph';
import { createHash } from 'crypto';

interface CanonicalChange {
  operation: string;
  table: string;
  data: any;
  ts_source: string;
  commit_lsn: string;
}

interface ProjectionHandler {
  name: string;
  handle(change: CanonicalChange): Promise<void>;
}

// Mock utils
function createVersionId(id: string, ts: string) { return `${id}:${ts}`; }
function createEvidenceId(change: any) { return 'evid-' + Date.now(); }
function sha256(data: string) { return createHash('sha256').update(data).digest('hex'); }
async function writeScopedEvidence(evidence: any) {}

export class TemporalGraphProjection implements ProjectionHandler {
  name = 'temporal-graph';

  constructor(private neo4j: Neo4jClient) {}

  async handle(change: CanonicalChange): Promise<void> {
    const { operation, table, data, ts_source, commit_lsn } = change;

    if (operation === 'INSERT' || operation === 'UPDATE') {
      // Create temporal node with validity period
      await this.neo4j.run(`
        MERGE (e:Entity {id: $entityId})
        CREATE (v:EntityVersion {
          id: $versionId,
          valid_from: datetime($validFrom),
          valid_to: datetime('9999-12-31T23:59:59Z'),
          data: $data,
          source_commit: $commitLsn,
          evidence_id: $evidenceId
        })
        CREATE (e)-[:HAS_VERSION]->(v)

        // Close previous version's validity
        WITH e
        MATCH (e)-[:HAS_VERSION]->(prev:EntityVersion)
        WHERE prev.valid_to = datetime('9999-12-31T23:59:59Z')
          AND prev.id <> $versionId
        SET prev.valid_to = datetime($validFrom)
      `, {
        entityId: data.id,
        versionId: createVersionId(data.id, ts_source),
        validFrom: ts_source,
        data: JSON.stringify(data),
        commitLsn: commit_lsn,
        evidenceId: createEvidenceId(change),
      });
    }

    // Emit evidence
    await writeScopedEvidence({
      operation: 'projection.temporal-graph.apply',
      inputs_digest: sha256(JSON.stringify(change)),
      outputs_digest: sha256(JSON.stringify({ entityId: data.id })),
    });
  }
}
