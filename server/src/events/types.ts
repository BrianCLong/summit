
export enum EventType {
  NODE_CREATED = 'NODE_CREATED',
  NODE_UPDATED = 'NODE_UPDATED',
  NODE_DELETED = 'NODE_DELETED',
  EDGE_CREATED = 'EDGE_CREATED',
  EDGE_UPDATED = 'EDGE_UPDATED',
  EDGE_DELETED = 'EDGE_DELETED',
}

export interface GraphEvent {
  id: string;
  type: EventType;
  tenantId: string;
  actorId: string;
  timestamp: Date;
  entityId: string; // The ID of the node or edge
  entityType: string; // 'node' or 'edge'
  before?: any; // Snapshot before mutation (null for create)
  after?: any; // Snapshot after mutation (null for delete)
  previousHash?: string; // For integrity chain
  hash?: string; // Current hash
}
