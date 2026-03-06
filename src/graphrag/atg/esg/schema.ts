/**
 * Espionage Surface Graph (ESG) Schema
 *
 * Defines the nodes, edges, and snapshot structure for the overlay graph.
 */

export type EsgNodeType =
  | 'IdentityNode'
  | 'AssetNode'
  | 'RepoNode'
  | 'DocNode'
  | 'VendorNode'
  | 'ProgramNode'
  | 'ExposureNode'
  | 'HumanContextNode';

export type EsgEdgeType =
  | 'AccessEdge'
  | 'TrustEdge'
  | 'DataFlowEdge'
  | 'CommsEdge'
  | 'DependencyEdge'
  | 'EmploymentEdge'
  | 'OSINTLinkEdge'
  | 'ExposureEdge';

export interface BaseNode {
  tenant_id: string;
  id: string;
  type: EsgNodeType;
  weight: number;
  attrs: Record<string, any>;
  evidence_ids: string[];
  /** First seen timestamp (ISO 8601) */
  t_first: string;
  /** Last seen timestamp (ISO 8601) */
  t_last: string;
}

export interface BaseEdge {
  tenant_id: string;
  id: string;
  source: string;
  target: string;
  type: EsgEdgeType;
  weight: number;
  attrs: Record<string, any>;
  evidence_ids: string[];
  /** First seen timestamp (ISO 8601) */
  t_first: string;
  /** Last seen timestamp (ISO 8601) */
  t_last: string;
}

// Specific Node Interfaces
export interface IdentityNode extends BaseNode { type: 'IdentityNode'; }
export interface AssetNode extends BaseNode { type: 'AssetNode'; }
export interface RepoNode extends BaseNode { type: 'RepoNode'; }
export interface DocNode extends BaseNode { type: 'DocNode'; }
export interface VendorNode extends BaseNode { type: 'VendorNode'; }
export interface ProgramNode extends BaseNode { type: 'ProgramNode'; }
export interface ExposureNode extends BaseNode { type: 'ExposureNode'; }
/** Policy-capsuled human context node. Sensitive attributes should be abstract. */
export interface HumanContextNode extends BaseNode { type: 'HumanContextNode'; }

export type EsgNode =
  | IdentityNode
  | AssetNode
  | RepoNode
  | DocNode
  | VendorNode
  | ProgramNode
  | ExposureNode
  | HumanContextNode;

// Specific Edge Interfaces
export interface AccessEdge extends BaseEdge { type: 'AccessEdge'; }
export interface TrustEdge extends BaseEdge { type: 'TrustEdge'; }
export interface DataFlowEdge extends BaseEdge { type: 'DataFlowEdge'; }
export interface CommsEdge extends BaseEdge { type: 'CommsEdge'; }
export interface DependencyEdge extends BaseEdge { type: 'DependencyEdge'; }
export interface EmploymentEdge extends BaseEdge { type: 'EmploymentEdge'; }
export interface OSINTLinkEdge extends BaseEdge { type: 'OSINTLinkEdge'; }
export interface ExposureEdge extends BaseEdge { type: 'ExposureEdge'; }

export type EsgEdge =
  | AccessEdge
  | TrustEdge
  | DataFlowEdge
  | CommsEdge
  | DependencyEdge
  | EmploymentEdge
  | OSINTLinkEdge
  | ExposureEdge;

export interface EsgSnapshot {
  tenant_id: string;
  /** ISO 8601 timestamp of snapshot creation */
  generated_at: string;
  /** Valid from time window */
  valid_from: string;
  /** Valid to time window */
  valid_to: string;
  nodes: EsgNode[];
  edges: EsgEdge[];
}
