/**
 * Type definitions for NL Graph Query Copilot
 */

export interface SchemaContext {
  /** Available node labels in the graph */
  nodeLabels?: string[];

  /** Available relationship types */
  relationshipTypes?: string[];

  /** Property keys available on nodes */
  nodeProperties?: Record<string, string[]>;

  /** Property keys available on relationships */
  relationshipProperties?: Record<string, string[]>;

  /** Policy tags for data classification */
  policyTags?: {
    label: string;
    classification: string;
    purpose?: string[];
  }[];

  /** Constraints and indexes in the graph */
  constraints?: string[];
  indexes?: string[];

  /** Tenant ID for multi-tenant filtering */
  tenantId?: string;

  /** User context for policy enforcement */
  userId?: string;

  /** Investigation context if applicable */
  investigationId?: string;
}

export interface CostEstimate {
  /** Estimated number of nodes that will be touched */
  nodesScanned: number;

  /** Estimated number of edges that will be touched */
  edgesScanned: number;

  /** Overall cost classification */
  costClass: 'low' | 'medium' | 'high' | 'very-high';

  /** Estimated execution time in milliseconds */
  estimatedTimeMs: number;

  /** Estimated memory usage in MB */
  estimatedMemoryMb: number;

  /** Explanation of cost drivers */
  costDrivers: string[];
}

export interface CompileRequest {
  /** Natural language prompt describing the desired query */
  prompt: string;

  /** Schema and policy context for query generation */
  schemaContext: SchemaContext;

  /** Optional parameters to bind in the query */
  parameters?: Record<string, any>;

  /** Whether to include verbose explanation */
  verbose?: boolean;
}

export interface CompileResponse {
  /** Generated Cypher query */
  cypher: string;

  /** Estimated cost of execution */
  estimatedCost: CostEstimate;

  /** Plain language explanation of what the query does */
  explanation: string;

  /** Query ID for tracking and caching */
  queryId: string;

  /** Warnings about potential issues */
  warnings: string[];

  /** Parameter bindings required for execution */
  requiredParameters: string[];

  /** Whether the query is safe to execute */
  isSafe: boolean;

  /** Timestamp of generation */
  timestamp: Date;
}

export interface CompileError {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Suggestions for fixing the error */
  suggestions: string[];

  /** Original prompt that caused the error */
  originalPrompt: string;
}

export interface QueryPattern {
  /** Pattern name for logging */
  name: string;

  /** Regular expression to match prompts */
  pattern: RegExp;

  /** Function to generate Cypher from matched prompt */
  generator: (
    match: RegExpMatchArray,
    context: SchemaContext,
  ) => string;

  /** Expected cost class for this pattern */
  expectedCost: CostEstimate['costClass'];

  /** Description of what this pattern does */
  description: string;
}

export interface ValidationResult {
  /** Whether the Cypher is syntactically valid */
  isValid: boolean;

  /** Syntax errors found */
  syntaxErrors: string[];

  /** Warnings about potential issues */
  warnings: string[];

  /** Security issues detected */
  securityIssues: string[];
}
