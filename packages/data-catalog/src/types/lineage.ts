/**
 * Data Lineage Types
 * Types for tracking and visualizing data lineage
 */

/**
 * Lineage Direction
 */
export enum LineageDirection {
  UPSTREAM = 'UPSTREAM',
  DOWNSTREAM = 'DOWNSTREAM',
  BOTH = 'BOTH',
}

/**
 * Lineage Level
 */
export enum LineageLevel {
  TABLE = 'TABLE',
  COLUMN = 'COLUMN',
  TRANSFORMATION = 'TRANSFORMATION',
}

/**
 * Lineage Node
 */
export interface LineageNode {
  id: string;
  assetId: string;
  name: string;
  type: string;
  level: number;
  metadata: Record<string, any>;
}

/**
 * Lineage Edge
 */
export interface LineageEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  transformationType: TransformationType;
  transformationLogic: string | null;
  metadata: Record<string, any>;
}

/**
 * Transformation Types
 */
export enum TransformationType {
  COPY = 'COPY',
  FILTER = 'FILTER',
  AGGREGATE = 'AGGREGATE',
  JOIN = 'JOIN',
  UNION = 'UNION',
  TRANSFORM = 'TRANSFORM',
  CUSTOM = 'CUSTOM',
}

/**
 * Lineage Graph
 */
export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  rootAssetId: string;
  direction: LineageDirection;
  level: LineageLevel;
  depth: number;
}

/**
 * Column Lineage
 */
export interface ColumnLineage {
  columnId: string;
  sourceColumns: ColumnLineageSource[];
  transformations: Transformation[];
}

/**
 * Column Lineage Source
 */
export interface ColumnLineageSource {
  assetId: string;
  columnName: string;
  transformationType: TransformationType;
}

/**
 * Transformation
 */
export interface Transformation {
  id: string;
  type: TransformationType;
  logic: string;
  language: string;
  inputColumns: string[];
  outputColumns: string[];
  metadata: Record<string, any>;
}

/**
 * Impact Analysis Result
 */
export interface ImpactAnalysisResult {
  assetId: string;
  impactedAssets: ImpactedAsset[];
  totalImpacted: number;
  criticalImpacts: number;
}

/**
 * Impacted Asset
 */
export interface ImpactedAsset {
  assetId: string;
  assetName: string;
  assetType: string;
  impactLevel: ImpactLevel;
  path: string[];
}

/**
 * Impact Level
 */
export enum ImpactLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Lineage Request
 */
export interface LineageRequest {
  assetId: string;
  direction: LineageDirection;
  level: LineageLevel;
  depth: number;
  includeTransformations: boolean;
}
