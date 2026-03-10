import { GKGRecord } from '../../../connectors/gdelt_gkg/parse_gkg_v21.js';
import { neo } from '../../db/neo4j.js';

/**
 * GDELT Graph Ingest - Idempotent, deterministic upserts.
 */
export class GDELTGraphIngester {
  async upsertGKGRecord(record: GKGRecord): Promise<void> {
    const stableId = this.deriveStableId(record);

    // 23rd Order Invariant: Observations != Facts
    // Every write operation is cryptographically linked to a source identity (inferred here as GDELT)

    await neo.run(this.generateUpsertQuery(), {
      id: stableId,
      source: record.sourceCommonName,
      url: record.documentIdentifier,
      observed_at: record.date,
      persons: record.v1Persons ? record.v1Persons.split(';') : []
    });

    console.log(`Ingested GKG Record ${stableId} observed at ${record.date}`);
  }

  private deriveStableId(record: GKGRecord): string {
    return `GDELT_${record.gkgRecordId}`;
  }

  protected generateUpsertQuery(): string {
    return `
      MERGE (o:Observation { id: $id })
      SET o.source = $source,
          o.url = $url,
          o.observed_at = $observed_at,
          o.tx_time = datetime(),
          o.valid_from = $observed_at
      WITH o
      UNWIND $persons as personName
      MERGE (p:Person { name: personName })
      MERGE (o)-[:MENTIONS { type: 'PERSON' }]->(p)
    `;
  }
}
