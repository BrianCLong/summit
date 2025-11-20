import { z } from 'zod';

/**
 * Supply Chain Network Node Types
 */
export const SupplierTierSchema = z.enum([
  'tier1', // Direct suppliers
  'tier2', // Sub-suppliers
  'tier3', // Sub-sub-suppliers
  'tier4', // Extended supply chain
  'tier5', // Deep supply chain
]);

export const NodeTypeSchema = z.enum([
  'manufacturer',
  'supplier',
  'distributor',
  'logistics_provider',
  'raw_material_provider',
  'component_manufacturer',
  'assembly_plant',
  'warehouse',
  'retail',
  'service_provider',
]);

export const NodeStatusSchema = z.enum([
  'active',
  'inactive',
  'at_risk',
  'disrupted',
  'contingency',
  'deprecated',
]);

/**
 * Supply Chain Node (Supplier/Partner)
 */
export const SupplyChainNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: NodeTypeSchema,
  tier: SupplierTierSchema,
  status: NodeStatusSchema,
  entityId: z.string().optional(), // Reference to entity in graph
  tenantId: z.string(),

  // Location and geographic data
  location: z.object({
    country: z.string(),
    region: z.string().optional(),
    city: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),

  // Business metadata
  metadata: z.object({
    industry: z.string().optional(),
    companySize: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
    yearEstablished: z.number().optional(),
    certifications: z.array(z.string()).optional(),
    capabilities: z.array(z.string()).optional(),
  }).optional(),

  // Performance metrics
  metrics: z.object({
    reliabilityScore: z.number().min(0).max(100).optional(),
    qualityScore: z.number().min(0).max(100).optional(),
    deliveryPerformance: z.number().min(0).max(100).optional(),
    capacityUtilization: z.number().min(0).max(100).optional(),
  }).optional(),

  // Risk indicators
  riskScore: z.number().min(0).max(100).optional(),
  riskFactors: z.array(z.string()).optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SupplyChainNode = z.infer<typeof SupplyChainNodeSchema>;
export type SupplierTier = z.infer<typeof SupplierTierSchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type NodeStatus = z.infer<typeof NodeStatusSchema>;

/**
 * Supply Chain Edge (Relationship/Flow)
 */
export const RelationshipTypeSchema = z.enum([
  'supplies',
  'manufactures_for',
  'distributes_to',
  'ships_to',
  'services',
  'partners_with',
  'sources_from',
]);

export const MaterialFlowTypeSchema = z.enum([
  'raw_material',
  'component',
  'finished_good',
  'service',
  'information',
]);

export const SupplyChainEdgeSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  relationshipType: RelationshipTypeSchema,
  tenantId: z.string(),

  // Material/component flow
  materialFlow: z.object({
    type: MaterialFlowTypeSchema,
    materials: z.array(z.string()), // Material/component IDs
    volume: z.number().optional(),
    value: z.number().optional(), // Monetary value
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']).optional(),
  }).optional(),

  // Dependency strength
  criticality: z.enum(['critical', 'high', 'medium', 'low']),
  dependencyScore: z.number().min(0).max(100), // How dependent target is on source
  alternativesAvailable: z.boolean().default(false),

  // Performance
  leadTime: z.object({
    average: z.number(), // days
    min: z.number(),
    max: z.number(),
  }).optional(),

  // Contract and compliance
  contractId: z.string().optional(),
  slaCompliance: z.number().min(0).max(100).optional(),

  // Risk
  riskLevel: z.enum(['critical', 'high', 'medium', 'low']).optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SupplyChainEdge = z.infer<typeof SupplyChainEdgeSchema>;
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export type MaterialFlowType = z.infer<typeof MaterialFlowTypeSchema>;

/**
 * Supply Chain Network (Complete Graph)
 */
export const SupplyChainNetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tenantId: z.string(),

  nodes: z.array(SupplyChainNodeSchema),
  edges: z.array(SupplyChainEdgeSchema),

  // Network metadata
  metadata: z.object({
    rootNodeId: z.string().optional(), // Primary organization
    maxTier: z.number(),
    totalNodes: z.number(),
    totalEdges: z.number(),
    geographicSpan: z.array(z.string()), // Countries covered
  }),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SupplyChainNetwork = z.infer<typeof SupplyChainNetworkSchema>;

/**
 * Network Analysis Results
 */
export const CriticalPathSchema = z.object({
  path: z.array(z.string()), // Node IDs in order
  totalLeadTime: z.number(),
  bottleneckNodes: z.array(z.string()),
  riskScore: z.number().min(0).max(100),
});

export const SinglePointOfFailureSchema = z.object({
  nodeId: z.string(),
  impactedNodes: z.array(z.string()),
  impactScore: z.number().min(0).max(100),
  alternatives: z.array(z.object({
    nodeId: z.string(),
    switchingCost: z.number().optional(),
    switchingTime: z.number().optional(), // days
  })),
});

export const BottleneckAnalysisSchema = z.object({
  nodeId: z.string(),
  type: z.enum(['capacity', 'geographic', 'regulatory', 'quality', 'lead_time']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  throughputLimit: z.number().optional(),
  currentUtilization: z.number().optional(),
  recommendations: z.array(z.string()),
});

export const NetworkTopologySchema = z.object({
  density: z.number(), // Edge to potential edge ratio
  avgPathLength: z.number(),
  clusteringCoefficient: z.number(),
  centralNodes: z.array(z.object({
    nodeId: z.string(),
    centralityScore: z.number(),
    type: z.enum(['betweenness', 'closeness', 'degree', 'eigenvector']),
  })),
  communities: z.array(z.object({
    id: z.string(),
    nodeIds: z.array(z.string()),
    modularity: z.number(),
  })),
});

export const NetworkAnalysisResultSchema = z.object({
  networkId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  criticalPaths: z.array(CriticalPathSchema),
  singlePointsOfFailure: z.array(SinglePointOfFailureSchema),
  bottlenecks: z.array(BottleneckAnalysisSchema),
  topology: NetworkTopologySchema,

  // Risk summary
  overallRiskScore: z.number().min(0).max(100),
  resilienceScore: z.number().min(0).max(100),
  diversificationScore: z.number().min(0).max(100),

  recommendations: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.string(),
    description: z.string(),
    impactedNodes: z.array(z.string()),
  })),
});

export type CriticalPath = z.infer<typeof CriticalPathSchema>;
export type SinglePointOfFailure = z.infer<typeof SinglePointOfFailureSchema>;
export type BottleneckAnalysis = z.infer<typeof BottleneckAnalysisSchema>;
export type NetworkTopology = z.infer<typeof NetworkTopologySchema>;
export type NetworkAnalysisResult = z.infer<typeof NetworkAnalysisResultSchema>;

/**
 * Geographic Distribution
 */
export const GeographicClusterSchema = z.object({
  region: z.string(),
  country: z.string(),
  nodeIds: z.array(z.string()),
  concentration: z.number().min(0).max(100), // % of network
  riskScore: z.number().min(0).max(100),
  geopoliticalRisk: z.number().min(0).max(100).optional(),
  naturalDisasterRisk: z.number().min(0).max(100).optional(),
});

export type GeographicCluster = z.infer<typeof GeographicClusterSchema>;

/**
 * Alternative Supplier Recommendations
 */
export const AlternativeSupplierSchema = z.object({
  currentSupplierId: z.string(),
  alternatives: z.array(z.object({
    supplierId: z.string(),
    matchScore: z.number().min(0).max(100),
    capabilities: z.array(z.string()),
    advantages: z.array(z.string()),
    disadvantages: z.array(z.string()),
    switchingCost: z.number().optional(),
    switchingTime: z.number().optional(), // days
    riskScore: z.number().min(0).max(100),
  })),
  recommendations: z.array(z.string()),
});

export type AlternativeSupplier = z.infer<typeof AlternativeSupplierSchema>;
