export interface GraphStore {
  getEntities(filters: Record<string, any>): Promise<any[]>;
  getRelationships(entityId: string): Promise<any[]>;
  upsertEntity(input: Record<string, any>): Promise<any>;
}

export interface AIService {
  enrichEntity(input: Record<string, any>): Promise<Record<string, any>>;
}
