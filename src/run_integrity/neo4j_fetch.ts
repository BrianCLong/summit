import neo4j, { Driver, Session } from 'neo4j-driver';
import { EvidenceItem } from './types';

export class Neo4jCollector {
  private driver: Driver;

  constructor(uri: string, user: string, pass: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
  }

  async fetchEvidence(runId: string): Promise<EvidenceItem[]> {
    const session = this.driver.session();
    try {
      // Assumes specific graph model: (:Run)-[:EMITS]->(:Evidence)
      const result = await session.run(
        `MATCH (r:Run {runId: $runId})-[:EMITS]->(e:Evidence)
         RETURN e`,
        { runId }
      );
      return result.records.map(record => {
        const e = record.get('e').properties;
        let payload = e.payload;
        let metadata = e.metadata;

        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch {}
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch {}
        }

        return {
          id: e.id,
          runId: runId,
          payload: payload || {},
          metadata: metadata || {},
          digest: e.digest
        };
      });
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}
