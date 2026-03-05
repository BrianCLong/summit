export interface Chunk {
  id: string;
  text: string;
  metadata?: any;
}

export interface Metadata {
  source: string;
  timestamp: string;
  contentType: string;
}

export interface RagPipelineOutput {
  chunks: Chunk[];
  metadata: Metadata[];
  embeddings: number[][];
}
