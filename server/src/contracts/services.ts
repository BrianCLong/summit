// Service Contracts

// Graph Service Contract
export interface GraphService {
  getEntity(tenantId: string, id: string): Promise<any | null>;
  findEntities(tenantId: string, query: any): Promise<any[]>;
  getEdges(tenantId: string, query: any): Promise<any[]>;
  upsertEntity(tenantId: string, entity: any): Promise<any>;
  upsertEdge(tenantId: string, edge: any): Promise<any>;
  deleteEntity(tenantId: string, id: string): Promise<boolean>;
  deleteEdge(tenantId: string, id: string): Promise<boolean>;
}

// Provenance Service Contract
export interface ProvenanceService {
  appendEntry(entry: {
    tenantId: string;
    actionType: string;
    resourceType: string;
    resourceId: string;
    actorId: string;
    actorType: 'user' | 'system' | 'api' | 'job';
    payload: Record<string, any>;
    metadata?: any;
  }): Promise<any>;
}

// Ingestion Service Contract
export interface IngestionService {
    addJob(file: { path: string; tenantId: string; flags?: Record<string, boolean> }): Promise<void>;
}
