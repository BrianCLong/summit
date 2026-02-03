export type Sha256 = string;

export interface MerkleNode {
  path_token: string;       // must be relative; may be obfuscated
  hash: Sha256;             // content hash for files; subtree hash for dirs
  children?: MerkleNode[];
}

export interface ChunkRef {
  doc_id: string;           // stable id (e.g., file-hash + span)
  start_line: number;
  end_line: number;
  content_hash: Sha256;
  path_token: string;
}

export interface Embedder {
  embed(text: string): Promise<number[]>;
}

export interface EmbeddingStore {
  put(vector_id: string, vector: number[], meta: Record<string, unknown>): Promise<void>;
  query(q: number[], k: number, filter?: Record<string, unknown>): Promise<Array<{vector_id:string; score:number; meta:Record<string,unknown>}>>;
}
