import { EsgNodeType, EsgEdgeType } from './schema.js';

/**
 * Base weights for ESG nodes and edges.
 * These weights influence the graph traversal and risk scoring.
 * Higher weight = Higher risk/importance.
 */
export const ESG_NODE_WEIGHTS: Record<EsgNodeType, number> = {
  IdentityNode: 1.0,
  AssetNode: 1.0,
  RepoNode: 1.5,      // Higher value target
  DocNode: 1.2,
  VendorNode: 0.8,
  ProgramNode: 2.0,   // "Crown Jewels" usually associated here
  ExposureNode: 1.5,  // Directly risky
  HumanContextNode: 1.0
};

export const ESG_EDGE_WEIGHTS: Record<EsgEdgeType, number> = {
  AccessEdge: 1.0,
  TrustEdge: 1.5,     // Transitive trust is key
  DataFlowEdge: 1.0,
  CommsEdge: 0.5,
  DependencyEdge: 0.8,
  EmploymentEdge: 0.5,
  OSINTLinkEdge: 0.5,
  ExposureEdge: 2.0   // High likelihood of compromise path
};
