/**
 * Core types for the simulation harness
 */

export type EntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'EVENT'
  | 'DOCUMENT'
  | 'ASSET'
  | 'ACCOUNT';

export type RelationshipType =
  | 'AFFILIATED_WITH'
  | 'TRANSACTED_WITH'
  | 'LOCATED_IN'
  | 'REPRESENTS'
  | 'OPERATES_IN'
  | 'EMPLOYED_BY'
  | 'OWNS'
  | 'CONTROLS'
  | 'COMMUNICATES_WITH'
  | 'RELATED_TO';

export type InvestigationType =
  | 'INTELLIGENCE_ANALYSIS'
  | 'THREAT_ANALYSIS'
  | 'FRAUD_INVESTIGATION'
  | 'CORRUPTION_INVESTIGATION'
  | 'NETWORK_ANALYSIS';

export type ScenarioType =
  | 'fraud-ring'
  | 'terror-cell'
  | 'corruption-network'
  | 'supply-chain'
  | 'money-laundering'
  | 'custom';

export type GraphSize = 'small' | 'medium' | 'large' | 'xlarge';

export type WorkflowStrategy =
  | 'systematic'
  | 'exploratory'
  | 'targeted'
  | 'random';

export interface Entity {
  type: EntityType;
  name: string;
  properties: Record<string, any>;
}

export interface Relationship {
  type: RelationshipType;
  from: number; // Index into entities array
  to: number;
  properties: Record<string, any>;
}

export interface Investigation {
  name: string;
  description: string;
  type: InvestigationType;
}

export interface ScenarioData {
  investigation: Investigation;
  entities: Entity[];
  relationships: Relationship[];
  copilotGoal?: string;
  metadata?: {
    seed?: number;
    generatedAt: string;
    parameters: ScenarioParameters;
  };
}

export interface ScenarioParameters {
  type: ScenarioType;
  size: GraphSize;
  noiseLevel: number; // 0-1
  missingDataRate: number; // 0-1
  conflictingEvidenceRate: number; // 0-1
  temporalSpan?: {
    start: string;
    end: string;
  };
  seed?: number;
  customParams?: Record<string, any>;
}

export interface GraphSizeConfig {
  entities: number;
  relationshipDensity: number; // 0-1
  clusterCount: number;
}

export const GRAPH_SIZE_CONFIGS: Record<GraphSize, GraphSizeConfig> = {
  small: { entities: 20, relationshipDensity: 0.2, clusterCount: 2 },
  medium: { entities: 50, relationshipDensity: 0.3, clusterCount: 3 },
  large: { entities: 100, relationshipDensity: 0.25, clusterCount: 5 },
  xlarge: { entities: 200, relationshipDensity: 0.2, clusterCount: 8 },
};

export interface WorkflowStep {
  type:
    | 'CREATE_INVESTIGATION'
    | 'ADD_ENTITY'
    | 'ADD_RELATIONSHIP'
    | 'QUERY_ENTITIES'
    | 'QUERY_RELATIONSHIPS'
    | 'EXPAND_NETWORK'
    | 'RUN_COPILOT'
    | 'SEARCH'
    | 'ANALYZE_PATH'
    | 'EXPORT_DATA'
    | 'WAIT';
  params: Record<string, any>;
  expectedResult?: any;
  timeout?: number;
}

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  strategy: WorkflowStrategy;
}

export interface SessionMetrics {
  sessionId: string;
  scenarioType: ScenarioType;
  startTime: string;
  endTime?: string;
  duration?: number;

  // Task success metrics
  tasksCompleted: number;
  tasksFailed: number;
  successRate: number;

  // Performance metrics
  timeToFirstInsight?: number;
  timeToKeyFindings?: number;
  totalQueries: number;
  averageQueryTime: number;

  // Coverage metrics
  entitiesExplored: number;
  entitiesTotal: number;
  coverageRate: number;
  relationshipsExplored: number;
  relationshipsTotal: number;

  // Quality metrics
  keyEntitiesFound: number;
  keyEntitiesExpected: number;
  precision?: number;
  recall?: number;
  f1Score?: number;

  // Copilot metrics
  copilotQueriesCount: number;
  copilotSuccessRate: number;
  copilotAverageResponseTime: number;

  // Error tracking
  errors: Array<{
    timestamp: string;
    type: string;
    message: string;
    step?: string;
  }>;
}

export interface ComparisonReport {
  generatedAt: string;
  baseline: {
    version: string;
    metrics: SessionMetrics[];
    aggregated: AggregatedMetrics;
  };
  candidate: {
    version: string;
    metrics: SessionMetrics[];
    aggregated: AggregatedMetrics;
  };
  comparison: {
    successRateDelta: number;
    performanceDelta: number;
    qualityDelta: number;
    regressions: string[];
    improvements: string[];
  };
}

export interface AggregatedMetrics {
  totalSessions: number;
  averageSuccessRate: number;
  averageDuration: number;
  averageCoverageRate: number;
  averagePrecision: number;
  averageRecall: number;
  averageF1Score: number;
  averageQueriesPerSession: number;
  errorRate: number;
}

export interface HarnessConfig {
  api: {
    baseUrl: string;
    graphqlUrl: string;
    timeout: number;
    retries: number;
    headers?: Record<string, string>;
  };
  scenarios: {
    defaultSize: GraphSize;
    defaultNoise: number;
    deterministic: boolean;
    seed?: number;
  };
  ghostAnalyst: {
    maxSteps: number;
    thinkTime: number; // ms to wait between steps
    strategy: WorkflowStrategy;
    enableAI?: boolean;
    aiModel?: string;
  };
  metrics: {
    enabled: boolean;
    detailed: boolean;
    exportFormat: 'json' | 'csv' | 'both';
  };
  reporting: {
    outputDir: string;
    format: 'html' | 'json' | 'markdown';
    includeCharts: boolean;
  };
  safety: {
    nonProdOnly: boolean;
    maxConcurrentSessions: number;
    requireConfirmation: boolean;
  };
}

export interface GhostAnalystSession {
  id: string;
  scenarioData: ScenarioData;
  workflow: Workflow;
  config: HarnessConfig;
  metrics: SessionMetrics;
  state: {
    investigationId?: string;
    entityIds: string[];
    relationshipIds: string[];
    currentStep: number;
    completed: boolean;
    failed: boolean;
  };
}
