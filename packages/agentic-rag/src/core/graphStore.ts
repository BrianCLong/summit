import type { Driver } from 'neo4j-driver';
import { z } from 'zod';
import type { DocumentChunk, GraphStore, Metadata, RetrievedChunk } from './types.js';

export interface GraphStoreConfig {
  driver: Driver;
}

const chunkSchema = z.array(
  z.object({
    id: z.string(),
    documentId: z.string(),
    content: z.string(),
    metadata: z.record(z.any()).optional(),
  })
);

export class Neo4jGraphStore implements GraphStore {
  private readonly driver: Driver;

  constructor(config: GraphStoreConfig) {
    this.driver = config.driver;
  }

  async upsertEntities(chunks: DocumentChunk[], workspaceId: string): Promise<void> {
    const parsed = chunkSchema.parse(chunks);
    const session = this.driver.session();
    try {
      for (const chunk of parsed) {
        const entities = this.extractEntities(chunk.content);
        for (const entity of entities) {
          await session.run(
            `MERGE (e:RagEntity { id: $id })
             ON CREATE SET e.name = $name, e.type = $type, e.workspaceId = $workspaceId
             MERGE (s:RagSource { id: $sourceId }) SET s.workspaceId = $workspaceId
             MERGE (s)-[:MENTIONS]->(e)`,
            {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              sourceId: chunk.documentId,
              workspaceId,
            }
          );
        }
      }
    } finally {
      await session.close();
    }
  }

  async expandRelated(metadata: Metadata = {}, limit: number, workspaceId?: string): Promise<RetrievedChunk[]> {
    const session = this.driver.session();
    const entityName = metadata.entity as string | undefined;
    if (!entityName) {
      await session.close();
      return [];
    }

    try {
      const result = await session.run(
        `MATCH (e:RagEntity {name: $name})-[:RELATED*0..2]-(n:RagEntity)
         OPTIONAL MATCH (s:RagSource)-[:MENTIONS]->(n)
         WHERE ($workspaceId IS NULL OR e.workspaceId = $workspaceId)
         RETURN s.id as sourceId, n.name as name LIMIT $limit`,
        { name: entityName, limit, workspaceId: workspaceId ?? null }
      );

      return result.records.map((record, idx) => ({
        id: `${record.get('sourceId') || 'unknown'}-${idx}`,
        documentId: record.get('sourceId') ?? 'unknown',
        content: record.get('name'),
        position: idx,
        startOffset: 0,
        endOffset: record.get('name')?.length ?? 0,
        metadata: {},
        score: 0.5,
        sourceId: record.get('sourceId') ?? undefined,
      }));
    } finally {
      await session.close();
    }
  }

  private extractEntities(text: string): { id: string; name: string; type: string }[] {
    const words = text.split(/\W+/).filter((w) => w.length > 5);
    return words.slice(0, 3).map((word, idx) => ({
      id: `${word}-${idx}`,
      name: word,
      type: 'TERM',
    }));
  }
}
