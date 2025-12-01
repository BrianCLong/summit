export type LineageNodeType = 'DATASET' | 'JOB' | 'REPORT' | 'FIELD';
export type LineageEdgeType = 'READS' | 'WRITES' | 'DERIVED_FROM';

export interface LineageNode {
  id: string;
  name: string;
  type: LineageNodeType;
  schemaHash?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineageEdge {
  sourceId: string;
  targetId: string;
  type: LineageEdgeType;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface SchemaSnapshot {
  id: string;
  nodeId: string;
  schemaDefinition: any;
  schemaHash: string;
  capturedAt: Date;
}

export interface RetentionPolicy {
  id: string;
  targetType: string;
  retentionDays: number;
  action: 'DELETE' | 'ARCHIVE';
  isActive: boolean;
}
