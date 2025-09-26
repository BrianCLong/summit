export interface GraphStore {
  getEntities(filters: Record<string, any>): Promise<any[]>;
  getRelationships(entityId: string): Promise<any[]>;
  upsertEntity(input: Record<string, any>): Promise<any>;
}

export interface AIService {
  enrichEntity(input: Record<string, any>): Promise<Record<string, any>>;
}

export type AnonymizationTarget = 'POSTGRES' | 'NEO4J';

export interface TriggerAnonymizationOptions {
  scope: AnonymizationTarget[];
  dryRun?: boolean;
  triggeredBy?: string;
}

export interface AnonymizationRun {
  runId: string;
  status: string;
  dryRun: boolean;
  scope: AnonymizationTarget[];
  startedAt: string;
  completedAt?: string | null;
  maskedPostgres: number;
  maskedNeo4j: number;
  notes?: string | null;
}

export interface AnonymizationService {
  triggerRun(options: TriggerAnonymizationOptions): Promise<AnonymizationRun>;
}
