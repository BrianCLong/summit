import pino from 'pino';
import { getNeo4jDriver, isNeo4jMockMode } from '../db/neo4j';

const logger = pino({ name: 'llm-provenance' });

export interface ProvenanceInput {
  investigationId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  promptHash: string;
  routeReason: string;
}

export async function writeProvenance(input: ProvenanceInput): Promise<string | undefined> {
  if (!input.investigationId) {
    logger.warn('Missing investigationId for provenance write');
    return undefined;
  }

  if (isNeo4jMockMode()) {
    logger.debug({ input }, 'Neo4j mock mode – provenance not persisted');
    return undefined;
  }

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.executeWrite((tx) =>
      tx.run(
        `MATCH (i:Investigation {id: $investigationId})
         MERGE (m:Model {provider: $provider, name: $model})
         CREATE (p:Provenance {
           id: randomUUID(),
           at: datetime(),
           provider: $provider,
           model: $model,
           tokensIn: $tokensIn,
           tokensOut: $tokensOut,
           costUsd: $costUsd,
           latencyMs: $latencyMs,
           promptHash: $promptHash,
           routeReason: $routeReason
         })
         MERGE (i)-[:GENERATED_BY]->(p)
         MERGE (p)-[:USED_MODEL]->(m)
         RETURN p.id AS id`,
        input
      )
    );

    const record = result.records?.[0];
    const provenanceId = record?.get('id');
    if (!provenanceId) {
      logger.warn({ input }, 'Provenance write completed without id');
    }
    return provenanceId ?? undefined;
  } catch (error) {
    logger.error({ error, input }, 'Failed to write provenance');
    return undefined;
  } finally {
    await session.close();
  }
}
