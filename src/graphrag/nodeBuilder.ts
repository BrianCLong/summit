import { Metadata } from '../data-pipeline/rag-data-pipeline/pipeline';

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export class NodeBuilder {
  buildDocumentNode(sourceId: string, metadata: Metadata, ingestedAt: string = "1970-01-01T00:00:00Z"): GraphNode {
    return {
      id: sourceId,
      labels: ['Document'],
      properties: {
        ...metadata,
        ingestedAt
      }
    };
  }

  buildChunkNode(chunkId: string, documentId: string, text: string): GraphNode {
    return {
      id: chunkId,
      labels: ['Chunk'],
      properties: {
        text,
        documentId,
        length: text.length
      }
    };
  }
}
