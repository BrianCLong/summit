import { z } from 'zod';

// =============================================================================
// Core Digital Twin Types
// =============================================================================

export const TwinStateSchema = z.enum([
  'INITIALIZING',
  'SYNCING',
  'ACTIVE',
  'SIMULATING',
  'DEGRADED',
  'OFFLINE',
]);
export type TwinState = z.infer<typeof TwinStateSchema>;

export const TwinTypeSchema = z.enum([
  'ENTITY',
  'SYSTEM',
  'PROCESS',
  'NETWORK',
  'ORGANIZATION',
  'INFRASTRUCTURE',
  'COMPOSITE',
]);
export type TwinType = z.infer<typeof TwinTypeSchema>;

export const DataSourceTypeSchema = z.enum([
  'KAFKA_STREAM',
  'REST_API',
  'GRAPHQL',
  'NEO4J',
  'POSTGRES',
  'IOT_SENSOR',
  'FILE_IMPORT',
  'MANUAL',
]);
export type DataSourceType = z.infer<typeof DataSourceTypeSchema>;

// =============================================================================
// Twin Definition Schema
// =============================================================================

export const TwinMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: TwinTypeSchema,
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  tags: z.array(z.string()).default([]),
  classification: z.string().optional(),
});
export type TwinMetadata = z.infer<typeof TwinMetadataSchema>;

export const TwinStateVectorSchema = z.object({
  timestamp: z.date(),
  confidence: z.number().min(0).max(1),
  source: z.string(),
  properties: z.record(z.unknown()),
  derived: z.record(z.unknown()).optional(),
});
export type TwinStateVector = z.infer<typeof TwinStateVectorSchema>;

export const DataBindingSchema = z.object({
  id: z.string().uuid(),
  sourceType: DataSourceTypeSchema,
  sourceId: z.string(),
  targetProperty: z.string(),
  transform: z.string().optional(),
  refreshInterval: z.number().optional(),
  lastSync: z.date().optional(),
});
export type DataBinding = z.infer<typeof DataBindingSchema>;

export const SimulationConfigSchema = z.object({
  engine: z.enum(['MONTE_CARLO', 'AGENT_BASED', 'SYSTEM_DYNAMICS', 'HYBRID']),
  timeHorizon: z.number(),
  timeStep: z.number(),
  iterations: z.number().default(1000),
  parameters: z.record(z.unknown()),
});
export type SimulationConfig = z.infer<typeof SimulationConfigSchema>;

export const DigitalTwinSchema = z.object({
  metadata: TwinMetadataSchema,
  state: TwinStateSchema,
  currentStateVector: TwinStateVectorSchema,
  stateHistory: z.array(TwinStateVectorSchema).default([]),
  dataBindings: z.array(DataBindingSchema).default([]),
  simulationConfig: SimulationConfigSchema.optional(),
  relationships: z.array(z.object({
    targetTwinId: z.string().uuid(),
    type: z.string(),
    properties: z.record(z.unknown()).optional(),
  })).default([]),
  neo4jNodeId: z.string().optional(),
  provenanceChain: z.array(z.string()).default([]),
});
export type DigitalTwin = z.infer<typeof DigitalTwinSchema>;

// =============================================================================
// Event Types
// =============================================================================

export interface TwinEvent {
  id: string;
  twinId: string;
  type: 'STATE_CHANGE' | 'DATA_SYNC' | 'SIMULATION_RUN' | 'ALERT' | 'PREDICTION';
  timestamp: Date;
  payload: unknown;
  source: string;
  correlationId?: string;
}

export interface SimulationResult {
  id: string;
  twinId: string;
  config: SimulationConfig;
  startTime: Date;
  endTime: Date;
  outcomes: Array<{
    scenario: string;
    probability: number;
    stateVector: TwinStateVector;
    metrics: Record<string, number>;
  }>;
  insights: string[];
  recommendations: string[];
}

// =============================================================================
// API Types
// =============================================================================

export interface CreateTwinRequest {
  name: string;
  type: TwinType;
  description?: string;
  initialState?: Record<string, unknown>;
  dataBindings?: Omit<DataBinding, 'id'>[];
  tags?: string[];
}

export interface UpdateTwinStateRequest {
  twinId: string;
  properties: Record<string, unknown>;
  source: string;
  confidence?: number;
}

export interface RunSimulationRequest {
  twinId: string;
  config: SimulationConfig;
  scenarios?: Array<{
    name: string;
    overrides: Record<string, unknown>;
  }>;
}
