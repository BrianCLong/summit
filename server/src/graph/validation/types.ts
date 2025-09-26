export interface GraphNodePayload {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationshipPayload {
  id?: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, unknown>;
}

export interface GraphValidationPayload {
  tenantId: string;
  nodes: GraphNodePayload[];
  relationships: GraphRelationshipPayload[];
}

export type GraphValidationSeverity = 'ERROR' | 'WARNING';

export interface GraphValidationError {
  code: string;
  message: string;
  path: string;
  rule?: string;
  severity: GraphValidationSeverity;
  details?: Record<string, unknown>;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationError[];
  warnings: string[];
  appliedRules: string[];
}

export interface CypherQueryResult<T = any> {
  records: T[];
}

export interface CypherExecutor {
  run<T = any>(statement: string, params?: Record<string, unknown>): Promise<CypherQueryResult<T>>;
}

export interface GraphCypherRule {
  name: string;
  description: string;
  statement: string;
  errorCode: string;
  severity?: GraphValidationSeverity;
  buildError: (
    violation: Record<string, any>,
    payload: GraphValidationPayload
  ) => GraphValidationError;
}

export interface GraphValidationOptions {
  requiredNodeProperties?: string[];
  requiredRelationshipProperties?: string[];
  allowedRelationshipTypes?: string[];
  cypherRules?: GraphCypherRule[];
  cypherExecutor?: CypherExecutor;
}
