import { Client as PgClient } from 'pg';
import { Driver as Neo4jDriver } from 'neo4j-driver';

export interface SyncConfig {
  mappings: {
    table: string;
    label: string;
    idKey: string;
    driftWindowMinutes?: number;
    relationships?: {
      fk: string;
      relType: string;
      targetLabel: string;
      targetIdKey: string;
    }[];
  }[];
  sampleSize?: number;
}

export interface ValidationMetrics {
  timestamp: string;
  status: 'PASS' | 'FAIL';
  results: {
    table: string;
    label: string;
    pgCount: number;
    neo4jCount: number;
    countMatch: boolean;
    relResults?: {
      relType: string;
      pgCount: number;
      neo4jCount: number;
      match: boolean;
    }[];
    samplingResult?: {
      sampleSize: number;
      matches: number;
      pass: boolean;
    };
  }[];
}

export class GraphSyncValidator {
  constructor(
    private pgClient: PgClient,
    private neo4jDriver: Neo4jDriver,
    private config: SyncConfig
  ) {}

  async validate(): Promise<ValidationMetrics> {
    const results: ValidationMetrics['results'] = [];
    let allPassed = true;
    const sampleSize = this.config.sampleSize || 10;

    for (const mapping of this.config.mappings) {
      // 1. Row vs Node counts with Drift Window
      const driftClause = mapping.driftWindowMinutes
        ? `WHERE updated_at < NOW() - INTERVAL '${mapping.driftWindowMinutes} minutes'`
        : '';

      const pgRes = await this.pgClient.query(`SELECT COUNT(*) FROM ${mapping.table} ${driftClause}`);
      const pgCount = parseInt(pgRes.rows[0].count);

      const session = this.neo4jDriver.session();
      // Drift handling in Neo4j assumes we store timestamps
      const neoDriftClause = mapping.driftWindowMinutes
        ? `WHERE n.updated_at < (datetime().epochMillis - ${mapping.driftWindowMinutes * 60000})`
        : '';

      const neoRes = await session.run(`MATCH (n:${mapping.label}) ${neoDriftClause} RETURN count(n) as count`);
      const neo4jCount = neoRes.records[0].get('count').toNumber();

      const countMatch = pgCount === neo4jCount;
      if (!countMatch) allPassed = false;

      // 2. FK vs Relationship counts
      const relResults: any[] = [];
      if (mapping.relationships) {
        for (const rel of mapping.relationships) {
          const pgRelRes = await this.pgClient.query(`SELECT COUNT(*) FROM ${mapping.table} WHERE ${rel.fk} IS NOT NULL`);
          const pgRelCount = parseInt(pgRelRes.rows[0].count);

          const neoRelRes = await session.run(`MATCH (:${mapping.label})-[r:${rel.relType}]->(:${rel.targetLabel}) RETURN count(r) as count`);
          const neoRelCount = neoRelRes.records[0].get('count').toNumber();

          const relMatch = pgRelCount === neoRelCount;
          if (!relMatch) allPassed = false;

          relResults.push({
            relType: rel.relType,
            pgCount: pgRelCount,
            neo4jCount: neoRelCount,
            match: relMatch
          });
        }
      }

      // 3. Sampled Joins / Data Consistency
      const sampleRes = await this.pgClient.query(`SELECT ${mapping.idKey} FROM ${mapping.table} ORDER BY RANDOM() LIMIT ${sampleSize}`);
      const sampleIds = sampleRes.rows.map(r => r[mapping.idKey]);

      let matches = 0;
      for (const id of sampleIds) {
        const neoSampleRes = await session.run(`MATCH (n:${mapping.label} {${mapping.idKey}: $id}) RETURN n`, { id });
        if (neoSampleRes.records.length > 0) {
          matches++;
        }
      }

      const samplingPass = sampleIds.length === 0 || matches === sampleIds.length;
      if (!samplingPass) allPassed = false;

      results.push({
        table: mapping.table,
        label: mapping.label,
        pgCount,
        neo4jCount,
        countMatch,
        relResults,
        samplingResult: {
          sampleSize: sampleIds.length,
          matches,
          pass: samplingPass
        }
      });

      await session.close();
    }

    return {
      timestamp: new Date().toISOString(),
      status: allPassed ? 'PASS' : 'FAIL',
      results
    };
  }
}
