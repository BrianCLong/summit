/**
 * Innovation Simulation System
 *
 * Global Innovation Simulation Engine for modeling technology evolution,
 * adoption dynamics, and ecosystem forecasting.
 *
 * @module innovation-sim
 */

// Core Interfaces
export type {
  EvidenceType,
  EvidenceRef,
  EvidenceBundle,
} from "./interfaces/evidence.js";

export {
  isValidEvidence,
  aggregateConfidence,
  buildEvidenceBundle,
} from "./interfaces/evidence.js";

export type {
  InnovationNode,
  InnovationEdge,
  InnovationGraph,
  GraphStatistics,
  GraphDelta,
  TemporalSnapshot,
  TemporalGraphSeries,
  GraphQueryResult,
} from "./interfaces/innovation-graph.js";

// Ontology Types
export type {
  InnovationNodeType,
  NodeMaturity,
  NodeStrategicImportance,
  OrganizationType,
  MarketSegment,
  BaseNodeAttrs,
  TechnologyAttrs,
  CapabilityAttrs,
  ParadigmAttrs,
  OrganizationAttrs,
  ProductAttrs,
  PaperAttrs,
  FundingEventAttrs,
  MarketAttrs,
} from "./graph-fabric/ontology/node-types.js";

export {
  isValidNodeType,
} from "./graph-fabric/ontology/node-types.js";

export type {
  InnovationEdgeType,
  EdgeStrength,
  EdgeDirectionality,
  BaseEdgeAttrs,
  TechnologyRelationAttrs,
  AdoptionRelationAttrs,
  FundingRelationAttrs,
  CitationRelationAttrs,
  InfluenceRelationAttrs,
} from "./graph-fabric/ontology/edge-types.js";

export {
  isValidEdgeType,
  getEdgeDirectionality,
  interpretEdgeStrength,
  EDGE_DIRECTIONALITY_MAP,
} from "./graph-fabric/ontology/edge-types.js";

// Ontology Validation
export type {
  ValidationResult,
} from "./graph-fabric/ontology/innovation-ontology.js";

export {
  hasEvidence,
  edgeHasEvidence,
  hasValidEvidenceConfidence,
  isValidNode,
  isValidEdge,
  isValidGraph,
  validateNode,
  validateEdge,
  validateGraph,
  getAllNodeTypes,
  getAllEdgeTypes,
  getNodeCategory,
  getEdgeCategory,
} from "./graph-fabric/ontology/innovation-ontology.js";

/**
 * Package Version
 */
export const VERSION = "0.1.0";

/**
 * Package Name
 */
export const PACKAGE_NAME = "@summit/innovation-sim";
