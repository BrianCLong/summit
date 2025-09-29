import { v4 as uuid } from 'uuid';
import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';

import { getPostgresPool } from '../db/postgres';
import { getNeo4jDriver } from '../db/neo4j';

export interface RealEntity {
  id: string;
  name: string;
  behaviors: string[];
}

export interface CognitiveTwin {
  id: string;
  entityId: string;
  name: string;
  behaviors: string[];
}

export class CognitiveTwinService {
  private pg: Pool;
  private neo4j: Driver;

  constructor(pg: Pool, neo4j: Driver) {
    this.pg = pg;
    this.neo4j = neo4j;
  }

  async generateTwin(entity: RealEntity): Promise<CognitiveTwin> {
    const twin: CognitiveTwin = {
      id: uuid(),
      entityId: entity.id,
      name: `${entity.name}-twin`,
      behaviors: entity.behaviors,
    };

    await this.persistTwin(twin);

    return twin;
  }

  async deployTwin(twin: CognitiveTwin, environment: string): Promise<void> {
    // Placeholder for integration with simulation environments.
    // eslint-disable-next-line no-console
    console.log(`Deploying twin ${twin.id} to ${environment}`);
  }

  async simulate(entities: RealEntity[]): Promise<CognitiveTwin[]> {
    const twins: CognitiveTwin[] = [];
    for (const entity of entities) {
      twins.push(await this.generateTwin(entity));
    }
    return twins;
  }

  private async persistTwin(twin: CognitiveTwin): Promise<void> {
    await Promise.all([this.persistToPostgres(twin), this.persistToNeo4j(twin)]);
  }

  private async persistToPostgres(twin: CognitiveTwin): Promise<void> {
    await this.pg.query(
      `CREATE TABLE IF NOT EXISTS cognitive_twins (
        id TEXT PRIMARY KEY,
        entity_id TEXT,
        name TEXT,
        behaviors JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    );

    await this.pg.query(
      `INSERT INTO cognitive_twins (id, entity_id, name, behaviors)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [twin.id, twin.entityId, twin.name, JSON.stringify(twin.behaviors)]
    );
  }

  private async persistToNeo4j(twin: CognitiveTwin): Promise<void> {
    const session = this.neo4j.session();
    try {
      await session.run(
        `MERGE (t:CognitiveTwin {id: $id})
         SET t.entityId = $entityId,
             t.name = $name,
             t.behaviors = $behaviors,
             t.createdAt = datetime()`,
        {
          id: twin.id,
          entityId: twin.entityId,
          name: twin.name,
          behaviors: twin.behaviors,
        }
      );
    } finally {
      await session.close();
    }
  }
}

export async function simulateCognitiveTwins(
  entities: RealEntity[],
  environment = 'default'
): Promise<CognitiveTwin[]> {
  const pg = getPostgresPool();
  const neo4j = getNeo4jDriver();
  const service = new CognitiveTwinService(pg, neo4j);
  const twins = await service.simulate(entities);
  await Promise.all(twins.map(twin => service.deployTwin(twin, environment)));
  return twins;
}

