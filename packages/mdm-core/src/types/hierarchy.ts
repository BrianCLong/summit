/**
 * Hierarchical Data Management Types
 */

export interface Hierarchy {
  id: string;
  name: string;
  description: string;
  domain: string;
  hierarchyType: HierarchyType;
  rootNodeId: string;
  depth: number;
  totalNodes: number;
  validFrom?: Date;
  validTo?: Date;
  status: HierarchyStatus;
  metadata: HierarchyMetadata;
}

export type HierarchyType =
  | 'organizational'
  | 'product_taxonomy'
  | 'location_tree'
  | 'chart_of_accounts'
  | 'classification'
  | 'time_based'
  | 'custom';

export type HierarchyStatus = 'active' | 'draft' | 'deprecated' | 'archived';

export interface HierarchyNode {
  id: string;
  hierarchyId: string;
  parentId?: string;
  level: number;
  path: string;
  name: string;
  code?: string;
  masterRecordId: string;
  children: string[];
  attributes: Record<string, unknown>;
  validFrom?: Date;
  validTo?: Date;
  sortOrder: number;
  isLeaf: boolean;
}

export interface HierarchyRelationship {
  parentId: string;
  childId: string;
  relationshipType: RelationshipType;
  weight?: number;
  validFrom?: Date;
  validTo?: Date;
  metadata: Record<string, unknown>;
}

export type RelationshipType =
  | 'parent_child'
  | 'reports_to'
  | 'belongs_to'
  | 'part_of'
  | 'categorized_as'
  | 'custom';

export interface HierarchyMetadata {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
  tags: string[];
  customAttributes: Record<string, unknown>;
}

export interface HierarchyValidationRule {
  id: string;
  hierarchyId: string;
  ruleType: HierarchyValidationType;
  maxDepth?: number;
  maxChildren?: number;
  allowCycles: boolean;
  allowMultipleParents: boolean;
  requiredAttributes: string[];
  customValidation?: string;
}

export type HierarchyValidationType =
  | 'max_depth'
  | 'max_children'
  | 'no_cycles'
  | 'single_parent'
  | 'attribute_inheritance'
  | 'temporal_consistency'
  | 'custom';

export interface HierarchyAggregation {
  id: string;
  hierarchyId: string;
  name: string;
  aggregationType: AggregationType;
  sourceField: string;
  targetField: string;
  rollupDirection: 'bottom_up' | 'top_down';
  aggregationFunction: AggregationFunction;
}

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'custom';

export type AggregationFunction = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'concat' | 'custom';

export interface NodeMove {
  nodeId: string;
  oldParentId?: string;
  newParentId?: string;
  timestamp: Date;
  movedBy: string;
  reason?: string;
  approved: boolean;
}

export interface HierarchyVersion {
  versionId: string;
  hierarchyId: string;
  versionNumber: number;
  validFrom: Date;
  validTo?: Date;
  changes: HierarchyChange[];
  createdBy: string;
  createdAt: Date;
  snapshot?: Hierarchy;
}

export interface HierarchyChange {
  changeType: 'add_node' | 'remove_node' | 'move_node' | 'update_node' | 'restructure';
  nodeId: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: Date;
}

export interface HierarchyVisualization {
  hierarchyId: string;
  visualizationType: 'tree' | 'sunburst' | 'treemap' | 'network';
  layout: LayoutConfig;
  styling: StyleConfig;
  interactivity: InteractivityConfig;
}

export interface LayoutConfig {
  orientation: 'vertical' | 'horizontal' | 'radial';
  spacing: number;
  nodeSize: number;
  collapseDepth?: number;
}

export interface StyleConfig {
  colorScheme: string;
  nodeShape: 'circle' | 'rectangle' | 'custom';
  edgeStyle: 'straight' | 'curved' | 'stepped';
  labels: boolean;
}

export interface InteractivityConfig {
  expandCollapse: boolean;
  zoom: boolean;
  pan: boolean;
  tooltip: boolean;
  search: boolean;
  filter: boolean;
}

export interface TemporalHierarchy {
  hierarchyId: string;
  temporalType: 'valid_time' | 'transaction_time' | 'bitemporal';
  versions: HierarchyVersion[];
  currentVersionId: string;
}
