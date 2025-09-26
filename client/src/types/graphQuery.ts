export type QueryValue = string | number | boolean | null | string[];

export type GraphQueryNodeType = 'condition' | 'group';

export interface QueryChip {
  id: string;
  field: string;
  operator: string;
  value: string;
  type: 'filter' | 'term' | 'range' | 'exists';
}

export interface GraphQueryNode {
  id: string;
  field: string;
  operator: string;
  value: string;
  type: GraphQueryNodeType;
  description?: string;
}

export interface GraphQueryEdge {
  id: string;
  source: string;
  target: string;
  logicalOperator: 'AND' | 'OR';
}

export interface GraphQuery {
  nodes: GraphQueryNode[];
  edges: GraphQueryEdge[];
  rootId?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphQueryValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
  suggestions?: string[];
  normalized?: string;
}
