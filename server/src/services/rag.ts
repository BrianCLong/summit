import { RetrievalService } from './RetrievalService';
import { Entity, Chunk } from '../data-model/types';

export class RagContextBuilder {

  async buildContext(
    query: string,
    retrievalResult: { chunks: Chunk[]; entities: Entity[] }
  ): Promise<string> {
    const { chunks, entities } = retrievalResult;

    let context = `Context for Query: "${query}"\n\n`;

    if (entities.length > 0) {
      context += `Related Entities:\n`;
      for (const e of entities) {
        context += `- ${e.kind.toUpperCase()}: ${e.properties.name || e.id} (${(e.labels||[]).join(', ')})\n`;
      }
      context += `\n`;
    }

    if (chunks.length > 0) {
      context += `Relevant Document Snippets:\n`;
      for (const c of chunks) {
        context += `--- Source: ${c.metadata?.source || c.documentId} ---\n`;
        context += `${c.text}\n\n`;
      }
    }

    if (chunks.length === 0 && entities.length === 0) {
      context += `No relevant information found.\n`;
    }

    return context;
  }
}

// Wrapper for existing consumers
export async function getRagContext(query: string, tenantId: string, embedding?: number[]) {
  const retrieval = new RetrievalService();
  const results = await retrieval.retrieve(query, tenantId, { embedding });
  const builder = new RagContextBuilder();
  return builder.buildContext(query, results);
}
