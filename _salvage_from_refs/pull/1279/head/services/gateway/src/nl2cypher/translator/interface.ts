/**
 * NL→Cypher Translator Interface
 *
 * Defines the contract for natural language to Cypher translation services.
 * Supports multiple translation backends and constraint enforcement.
 */

import { ConstraintAnalysis, QueryExplanation } from '../guardrails';

export interface TranslationRequest {
  prompt: string;
  context: {
    user_id: string;
    tenant_id: string;
    user_role?: string;
    scopes?: string[];
    schema_context?: SchemaContext;
    conversation_id?: string;
    previous_queries?: string[];
  };
  options?: {
    max_results?: number;
    timeout_ms?: number;
    explain_level?: 'basic' | 'detailed' | 'technical';
    include_explanation?: boolean;
    dry_run?: boolean;
    enforcement_mode?: 'block' | 'warn' | 'allow';
  };
}

export interface SchemaContext {
  node_labels: string[];
  relationship_types: string[];
  property_keys: Record<string, string[]>; // label -> property names
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
}

export interface IndexInfo {
  label: string;
  properties: string[];
  type: 'btree' | 'fulltext' | 'vector';
}

export interface ConstraintInfo {
  label: string;
  properties: string[];
  type: 'unique' | 'exists' | 'node_key';
}

export interface TranslationResponse {
  request_id: string;
  cypher: string;
  original_cypher?: string; // If modified by constraints
  confidence: number;
  explanation?: QueryExplanation;
  constraint_analysis: ConstraintAnalysis;
  metadata: {
    translation_time_ms: number;
    constraint_time_ms: number;
    model_version?: string;
    schema_version?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export interface ExecutionRequest {
  cypher: string;
  parameters?: Record<string, any>;
  context: {
    user_id: string;
    tenant_id: string;
    user_role?: string;
    scopes?: string[];
    request_id?: string;
  };
  options?: {
    timeout_ms?: number;
    max_results?: number;
    explain?: boolean;
    dry_run?: boolean;
  };
}

export interface ExecutionResponse {
  request_id: string;
  results: any[];
  columns: string[];
  summary: {
    result_count: number;
    execution_time_ms: number;
    consumed_units?: number;
  };
  query_plan?: QueryPlan;
  warnings: string[];
}

export interface QueryPlan {
  operators: PlanOperator[];
  estimated_rows: number;
  db_hits: number;
  page_cache_hits: number;
  page_cache_misses: number;
}

export interface PlanOperator {
  operator_type: string;
  estimated_rows: number;
  db_hits: number;
  variables: string[];
  details: Record<string, any>;
  children: PlanOperator[];
}

/**
 * Main translator interface
 */
export interface INlToCypherTranslator {
  /**
   * Translate natural language to Cypher with constraint checking
   */
  translate(request: TranslationRequest): Promise<TranslationResponse>;

  /**
   * Get translation preview without execution
   */
  preview(request: TranslationRequest): Promise<TranslationResponse>;

  /**
   * Validate Cypher query
   */
  validate(cypher: string, context: { user_id: string; tenant_id: string }): Promise<{
    is_valid: boolean;
    syntax_errors: string[];
    constraint_analysis: ConstraintAnalysis;
  }>;

  /**
   * Get available schema information
   */
  getSchema(context: { tenant_id: string }): Promise<SchemaContext>;

  /**
   * Update schema cache
   */
  refreshSchema(context: { tenant_id: string }): Promise<void>;
}

/**
 * Execution interface for Neo4j queries
 */
export interface ICypherExecutor {
  /**
   * Execute Cypher query with safety checks
   */
  execute(request: ExecutionRequest): Promise<ExecutionResponse>;

  /**
   * Execute query in read-only transaction
   */
  executeReadOnly(request: ExecutionRequest): Promise<ExecutionResponse>;

  /**
   * Get query execution plan
   */
  explain(cypher: string, parameters?: Record<string, any>): Promise<QueryPlan>;

  /**
   * Test connectivity and permissions
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    latency_ms: number;
    version: string;
    read_replicas?: number;
  }>;
}

/**
 * Schema discovery interface
 */
export interface ISchemaProvider {
  /**
   * Discover current schema
   */
  discoverSchema(tenantId: string): Promise<SchemaContext>;

  /**
   * Get schema diff since last update
   */
  getSchemaDiff(tenantId: string, since?: Date): Promise<{
    added: Partial<SchemaContext>;
    removed: Partial<SchemaContext>;
    modified: Partial<SchemaContext>;
  }>;

  /**
   * Subscribe to schema changes
   */
  subscribeToChanges(tenantId: string, callback: (diff: any) => void): void;
}

/**
 * Translation model interface
 */
export interface ITranslationModel {
  /**
   * Generate Cypher from natural language
   */
  generateCypher(
    prompt: string,
    schema: SchemaContext,
    examples?: Array<{ nl: string; cypher: string }>
  ): Promise<{
    cypher: string;
    confidence: number;
    reasoning?: string;
    alternatives?: Array<{ cypher: string; confidence: number }>;
  }>;

  /**
   * Get model information
   */
  getModelInfo(): {
    name: string;
    version: string;
    capabilities: string[];
    limits: {
      max_prompt_tokens: number;
      max_completion_tokens: number;
      max_schema_size: number;
    };
  };
}

/**
 * Error types for translation system
 */
export class TranslationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

export class ConstraintViolationError extends TranslationError {
  constructor(
    message: string,
    public violations: any[],
    public analysis: ConstraintAnalysis
  ) {
    super(message, 'CONSTRAINT_VIOLATION', { violations, analysis });
  }
}

export class SchemaError extends TranslationError {
  constructor(message: string, details?: any) {
    super(message, 'SCHEMA_ERROR', details);
  }
}

export class ExecutionError extends TranslationError {
  constructor(message: string, public queryPlan?: QueryPlan, details?: any) {
    super(message, 'EXECUTION_ERROR', details);
  }
}

/**
 * Utility types for configuration
 */
export interface TranslatorConfig {
  model: {
    provider: 'openai' | 'anthropic' | 'local';
    model_name: string;
    api_key?: string;
    base_url?: string;
    timeout_ms: number;
  };
  constraints: {
    enabled: boolean;
    enforcement_mode: 'block' | 'warn' | 'allow';
    config_path?: string;
  };
  neo4j: {
    uri: string;
    username: string;
    password: string;
    database?: string;
    max_pool_size: number;
    connection_timeout_ms: number;
    max_transaction_retry_time_ms: number;
  };
  cache: {
    enabled: boolean;
    ttl_seconds: number;
    max_entries: number;
  };
  observability: {
    traces_enabled: boolean;
    metrics_enabled: boolean;
    log_level: 'debug' | 'info' | 'warn' | 'error';
  };
}