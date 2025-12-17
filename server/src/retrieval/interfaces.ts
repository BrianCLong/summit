import {
  KnowledgeObject,
  RetrievalQuery,
  RetrievalResult
} from './types.js';

export interface IRetrievalService {
  /**
   * Search for knowledge objects using semantic, keyword, or hybrid strategies.
   */
  search(query: RetrievalQuery): Promise<RetrievalResult>;

  /**
   * Index a knowledge object.
   * This should trigger embedding generation and storage.
   */
  indexObject(object: KnowledgeObject): Promise<void>;

  /**
   * Delete a knowledge object and its embeddings.
   */
  deleteObject(tenantId: string, objectId: string): Promise<void>;
}
