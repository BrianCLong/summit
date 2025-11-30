/**
 * Summit Query Language (SummitQL) Type Definitions
 *
 * A declarative, GraphQL-inspired query language for intelligence analysis
 */

// ===== Core Query Types =====

export interface Query {
  type: 'query';
  resource: string;
  fields?: FieldSelection[];
  filters?: FilterExpression[];
  sort?: SortClause[];
  limit?: number;
  offset?: number;
  temporal?: TemporalClause;
  geospatial?: GeospatialClause;
  aggregations?: AggregationClause[];
  joins?: JoinClause[];
  fragments?: FragmentDefinition[];
  options?: QueryOptions;
}

export interface QueryOptions {
  explain?: boolean;
  cache?: boolean;
  cacheTTL?: number;
  stream?: boolean;
  realtime?: boolean;
  consistency?: 'eventual' | 'strong' | 'bounded';
  timeout?: number;
}

// ===== Field Selection =====

export interface FieldSelection {
  name: string;
  alias?: string;
  nested?: FieldSelection[];
  arguments?: Record<string, any>;
}

// ===== Filter Expressions =====

export type FilterExpression =
  | ComparisonFilter
  | LogicalFilter
  | FullTextFilter
  | GeoFilter
  | TemporalFilter
  | ArrayFilter
  | ExistsFilter;

export interface ComparisonFilter {
  type: 'comparison';
  field: string;
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH';
  value: any;
}

export interface LogicalFilter {
  type: 'logical';
  operator: 'AND' | 'OR' | 'NOT';
  expressions: FilterExpression[];
}

export interface FullTextFilter {
  type: 'fulltext';
  fields: string[];
  query: string;
  options?: {
    mode?: 'natural' | 'boolean' | 'phrase';
    minScore?: number;
    boost?: Record<string, number>;
    fuzzy?: boolean;
    stemming?: boolean;
  };
}

export interface GeoFilter {
  type: 'geo';
  field: string;
  operator: 'within' | 'intersects' | 'near' | 'contains';
  geometry: GeoJSON.Geometry;
  options?: {
    maxDistance?: number;
    unit?: 'meters' | 'kilometers' | 'miles';
  };
}

export interface TemporalFilter {
  type: 'temporal';
  field: string;
  operator: 'before' | 'after' | 'between' | 'within_last' | 'within_next';
  value: Date | [Date, Date] | string;
}

export interface ArrayFilter {
  type: 'array';
  field: string;
  operator: 'ANY' | 'ALL' | 'SIZE' | 'OVERLAP';
  value: any;
}

export interface ExistsFilter {
  type: 'exists';
  field: string;
  exists: boolean;
}

// ===== Sorting =====

export interface SortClause {
  field: string;
  direction: 'ASC' | 'DESC';
  nulls?: 'FIRST' | 'LAST';
}

// ===== Temporal Queries =====

export interface TemporalClause {
  type: 'point_in_time' | 'time_range' | 'time_travel';
  timestamp?: Date;
  start?: Date;
  end?: Date;
  version?: string;
}

// ===== Geospatial Queries =====

export interface GeospatialClause {
  type: 'bbox' | 'radius' | 'polygon';
  coordinates: number[] | number[][];
  options?: {
    crs?: string;
    buffer?: number;
  };
}

// ===== Aggregations =====

export type AggregationClause =
  | CountAggregation
  | SumAggregation
  | AvgAggregation
  | MinAggregation
  | MaxAggregation
  | GroupByAggregation
  | HistogramAggregation
  | PercentilesAggregation;

export interface BaseAggregation {
  name: string;
  alias?: string;
}

export interface CountAggregation extends BaseAggregation {
  type: 'count';
  field?: string;
  distinct?: boolean;
}

export interface SumAggregation extends BaseAggregation {
  type: 'sum';
  field: string;
}

export interface AvgAggregation extends BaseAggregation {
  type: 'avg';
  field: string;
}

export interface MinAggregation extends BaseAggregation {
  type: 'min';
  field: string;
}

export interface MaxAggregation extends BaseAggregation {
  type: 'max';
  field: string;
}

export interface GroupByAggregation extends BaseAggregation {
  type: 'group_by';
  fields: string[];
  aggregations: AggregationClause[];
}

export interface HistogramAggregation extends BaseAggregation {
  type: 'histogram';
  field: string;
  interval: number | string;
  minDocCount?: number;
}

export interface PercentilesAggregation extends BaseAggregation {
  type: 'percentiles';
  field: string;
  percentiles: number[];
}

// ===== Joins =====

export interface JoinClause {
  type: 'inner' | 'left' | 'right' | 'full';
  resource: string;
  alias?: string;
  on: JoinCondition;
  fields?: FieldSelection[];
}

export interface JoinCondition {
  left: string;
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=';
  right: string;
}

// ===== Fragments =====

export interface FragmentDefinition {
  name: string;
  resource: string;
  fields: FieldSelection[];
}

// ===== Abstract Syntax Tree (AST) =====

export type ASTNode =
  | QueryNode
  | FieldNode
  | FilterNode
  | SortNode
  | AggregationNode
  | JoinNode
  | FragmentNode;

export interface BaseASTNode {
  type: string;
  location?: SourceLocation;
}

export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface QueryNode extends BaseASTNode {
  type: 'Query';
  resource: string;
  children: ASTNode[];
}

export interface FieldNode extends BaseASTNode {
  type: 'Field';
  name: string;
  alias?: string;
  children?: ASTNode[];
}

export interface FilterNode extends BaseASTNode {
  type: 'Filter';
  expression: FilterExpression;
}

export interface SortNode extends BaseASTNode {
  type: 'Sort';
  clauses: SortClause[];
}

export interface AggregationNode extends BaseASTNode {
  type: 'Aggregation';
  aggregations: AggregationClause[];
}

export interface JoinNode extends BaseASTNode {
  type: 'Join';
  join: JoinClause;
}

export interface FragmentNode extends BaseASTNode {
  type: 'Fragment';
  fragment: FragmentDefinition;
}

// ===== Execution Plan =====

export interface ExecutionPlan {
  type: 'physical' | 'logical';
  steps: ExecutionStep[];
  estimatedCost: number;
  estimatedRows: number;
}

export interface ExecutionStep {
  id: string;
  operator: string;
  description: string;
  cost: number;
  rows: number;
  children?: ExecutionStep[];
  metadata?: Record<string, any>;
}

// ===== Query Result =====

export interface QueryResult<T = any> {
  data: T[];
  metadata: QueryMetadata;
  errors?: QueryError[];
}

export interface QueryMetadata {
  executionTime: number;
  totalCount?: number;
  hasMore?: boolean;
  cursor?: string;
  cached?: boolean;
  version?: string;
}

export interface QueryError {
  message: string;
  code: string;
  path?: string[];
  extensions?: Record<string, any>;
}

// ===== Streaming Results =====

export interface StreamingQueryResult<T = any> {
  type: 'data' | 'error' | 'complete';
  data?: T;
  error?: QueryError;
  metadata?: Partial<QueryMetadata>;
}

// ===== Query Validation =====

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  message: string;
  code: string;
  location?: SourceLocation;
  severity: 'error';
}

export interface ValidationWarning {
  message: string;
  code: string;
  location?: SourceLocation;
  severity: 'warning';
}

// ===== Type System =====

export interface TypeDefinition {
  name: string;
  kind: 'scalar' | 'object' | 'enum' | 'interface' | 'union';
  fields?: FieldDefinition[];
  values?: string[];
}

export interface FieldDefinition {
  name: string;
  type: string;
  array?: boolean;
  required?: boolean;
  description?: string;
}

// ===== Query Cache =====

export interface CacheOptions {
  key: string;
  ttl: number;
  tags?: string[];
  invalidateOn?: string[];
}

// ===== GeoJSON namespace for geospatial support =====
declare namespace GeoJSON {
  interface Geometry {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  }

  interface Point extends Geometry {
    type: 'Point';
    coordinates: number[];
  }

  interface Polygon extends Geometry {
    type: 'Polygon';
    coordinates: number[][][];
  }

  interface LineString extends Geometry {
    type: 'LineString';
    coordinates: number[][];
  }
}

export { GeoJSON };
