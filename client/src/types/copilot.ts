/**
 * TypeScript Types for AI Copilot MVP
 *
 * Shared types between frontend and GraphQL API
 */

// ============================================================================
// Query Types
// ============================================================================

export interface NLQueryInput {
  query: string;
  investigationId: string;
  userId?: string;
  dryRun?: boolean;
}

export interface CypherPreview {
  cypher: string;
  explanation: string;
  estimatedRows: number;
  estimatedCost: number;
  complexity: 'low' | 'medium' | 'high';
  warnings?: string[];
  allowed: boolean;
  blockReason?: string;
  auditId?: string;
}

export interface ExecutionSummary {
  recordCount: number;
  executionTime: number;
}

export interface CypherExecutionResult {
  records: Record<string, any>[];
  summary: ExecutionSummary;
  citations: string[];
  auditId?: string;
}

// ============================================================================
// Hypothesis Types
// ============================================================================

export interface Evidence {
  id: string;
  type: string;
  description: string;
  strength: number;
  sourceIds: string[];
}

export interface Hypothesis {
  id: string;
  statement: string;
  confidence: number;
  supportingEvidence: Evidence[];
  involvedEntities: string[];
  suggestedSteps: string[];
}

export interface HypothesisInput {
  investigationId: string;
  focusEntityIds?: string[];
  count?: number;
}

// ============================================================================
// Narrative Types
// ============================================================================

export type NarrativeStyle =
  | 'ANALYTICAL'
  | 'CHRONOLOGICAL'
  | 'NETWORK_FOCUSED'
  | 'THREAT_ASSESSMENT';

export interface NarrativeInput {
  investigationId: string;
  theme?: string;
  keyEntityIds?: string[];
  style?: NarrativeStyle;
}

export interface WhyPath {
  from: string;
  to: string;
  relId: string;
  type: string;
  supportScore?: number;
  score_breakdown?: {
    length: number;
    edgeType: number;
    centrality: number;
  };
}

export interface Narrative {
  id: string;
  investigationId: string;
  title: string;
  content: string;
  keyFindings: string[];
  citations: string[];
  supportingPaths: WhyPath[];
  confidence: number;
  createdAt: string;
  auditId?: string;
}

// ============================================================================
// Query History Types
// ============================================================================

export interface QueryHistoryEntry {
  id: string;
  query: string;
  cypher: string;
  timestamp: string;
  recordCount: number;
  executionTime: number;
  success: boolean;
  auditId?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  category?: string;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

// ============================================================================
// Query Template Types
// ============================================================================

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: string;
  variables?: TemplateVariable[];
  examples?: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'entityType';
  description: string;
  required: boolean;
  defaultValue?: any;
}

// ============================================================================
// Copilot State Types
// ============================================================================

export interface CopilotState {
  // Current query
  currentQuery: string;
  preview: CypherPreview | null;
  results: CypherExecutionResult | null;

  // Loading states
  isPreviewing: boolean;
  isExecuting: boolean;
  isGeneratingHypotheses: boolean;
  isGeneratingNarrative: boolean;

  // Active tab
  activeTab: 'query' | 'hypotheses' | 'narrative' | 'history';

  // Generated content
  hypotheses: Hypothesis[];
  narrative: Narrative | null;

  // History
  queryHistory: QueryHistoryEntry[];
  savedQueries: SavedQuery[];

  // UI state
  showCypher: boolean;
  selectedTemplate: QueryTemplate | null;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface CopilotMetrics {
  totalQueries: number;
  successfulQueries: number;
  blockedQueries: number;
  averageExecutionTime: number;
  totalCost: number;
  queriesByComplexity: {
    low: number;
    medium: number;
    high: number;
  };
  topBlockReasons: Array<{
    reason: string;
    count: number;
  }>;
}

// ============================================================================
// Event Types for Analytics
// ============================================================================

export type CopilotEvent =
  | { type: 'query_submitted'; query: string; investigationId: string }
  | { type: 'preview_generated'; complexity: string; estimatedCost: number }
  | { type: 'query_executed'; recordCount: number; executionTime: number }
  | { type: 'query_blocked'; blockReason: string }
  | { type: 'hypothesis_generated'; count: number }
  | { type: 'narrative_generated'; confidence: number }
  | { type: 'citation_clicked'; entityId: string }
  | { type: 'template_used'; templateId: string };

// ============================================================================
// Error Types
// ============================================================================

export interface CopilotError {
  code: string;
  message: string;
  details?: Record<string, any>;
  auditId?: string;
}

export class QueryBlockedError extends Error {
  public readonly blockReason: string;
  public readonly auditId?: string;

  constructor(blockReason: string, auditId?: string) {
    super(`Query blocked: ${blockReason}`);
    this.name = 'QueryBlockedError';
    this.blockReason = blockReason;
    this.auditId = auditId;
  }
}

export class QueryGenerationError extends Error {
  public readonly originalQuery: string;
  public readonly auditId?: string;

  constructor(message: string, originalQuery: string, auditId?: string) {
    super(message);
    this.name = 'QueryGenerationError';
    this.originalQuery = originalQuery;
    this.auditId = auditId;
  }
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseCopilotReturn {
  // State
  state: CopilotState;

  // Actions
  previewQuery: (query: string) => Promise<void>;
  executeQuery: () => Promise<void>;
  generateHypotheses: (input?: Partial<HypothesisInput>) => Promise<void>;
  generateNarrative: (input?: Partial<NarrativeInput>) => Promise<void>;

  // History
  saveQuery: (name: string, description?: string) => Promise<void>;
  loadQuery: (queryId: string) => void;
  clearHistory: () => void;

  // UI actions
  setQuery: (query: string) => void;
  setActiveTab: (tab: CopilotState['activeTab']) => void;
  toggleCypherView: () => void;
  applyTemplate: (template: QueryTemplate, variables?: Record<string, any>) => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface CopilotConfig {
  // Feature flags
  enableHypotheses: boolean;
  enableNarrative: boolean;
  enableQueryHistory: boolean;
  enableTemplates: boolean;

  // Limits
  maxQueryLength: number;
  maxHistoryEntries: number;
  maxSavedQueries: number;

  // Cost thresholds
  costWarningThreshold: number;
  costBlockThreshold: number;

  // Complexity thresholds
  complexityWarningRows: number;
  complexityBlockRows: number;

  // UI preferences
  defaultShowCypher: boolean;
  defaultTab: CopilotState['activeTab'];
  autoExecuteOnLowCost: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
