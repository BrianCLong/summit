
export type CoordinationRole = 'COORDINATOR' | 'WORKER' | 'REVIEWER';

export interface CoordinationSchema {
  version: string;
  name: string;
  roles: CoordinationRole[];
  // Defines allowed flows, e.g., Coordinator -> Worker
  allowedTransitions: {
    from: CoordinationRole;
    to: CoordinationRole;
  }[];
}

export interface SharedBudget {
  totalSteps: number;
  totalTokens: number;
  wallClockTimeMs: number; // Duration in ms
}

export interface CoordinationContext {
  coordinationId: string;
  schema: CoordinationSchema;
  schemaVersion: string;
  initiatorAgentId: string;
  roles: Record<string, CoordinationRole>; // agentId -> role
  budget: SharedBudget;
  budgetConsumed: SharedBudget;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'TERMINATED';
  startTime: Date;
  endTime?: Date;
  terminationReason?: string;
  // Track children contexts if any
  children?: string[];
  parent?: string;
}
