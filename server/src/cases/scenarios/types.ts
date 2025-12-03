export interface InvestigationScenario {
  id: string;
  investigationId: string;
  name: string;
  description?: string;
  baseStateSnapshot: {
    entities: string[]; // IDs of entities at snapshot time
    relationships: string[]; // IDs of relationships
    timeline: string[]; // IDs of timeline entries
  };
  modifications: ScenarioModification[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export type ModificationType =
  | 'ADD_ENTITY'
  | 'REMOVE_ENTITY'
  | 'UPDATE_ENTITY'
  | 'ADD_RELATIONSHIP'
  | 'REMOVE_RELATIONSHIP'
  | 'ADD_EVENT'
  | 'REMOVE_EVENT'
  | 'MODIFY_EVENT';

export interface ScenarioModification {
  id: string;
  type: ModificationType;
  targetId?: string; // ID of entity/rel/event being modified/removed (if applicable)
  data?: any; // New data for adds/updates
  appliedAt: string;
  appliedBy: string;
}

export interface ScenarioResult {
  scenarioId: string;
  finalState: {
    entities: any[];
    relationships: any[];
    timeline: any[];
  };
  metrics: {
    entityCount: number;
    relationshipCount: number;
    timelineEventCount: number;
    changesApplied: number;
  };
}
