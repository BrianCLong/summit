import { z } from 'zod';

// ============================================================================
// Core Supply Chain Entity Types
// ============================================================================

export const SupplyChainNodeTypeSchema = z.enum([
  'supplier',
  'manufacturer',
  'distributor',
  'logistics-provider',
  'retailer',
  'raw-material-provider',
  'component-manufacturer',
  'warehouse',
  'port',
  'customs',
]);

export type SupplyChainNodeType = z.infer<typeof SupplyChainNodeTypeSchema>;

export const GeographicLocationSchema = z.object({
  country: z.string(),
  region: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
});

export type GeographicLocation = z.infer<typeof GeographicLocationSchema>;

export const SupplyChainNodeSchema = z.object({
  id: z.string().uuid(),
  type: SupplyChainNodeTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  location: GeographicLocationSchema.optional(),
  tier: z.number().int().min(1), // Tier 1 = direct suppliers, Tier 2+= sub-suppliers
  status: z.enum(['active', 'inactive', 'under-review', 'suspended']),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SupplyChainNode = z.infer<typeof SupplyChainNodeSchema>;

export const SupplyChainRelationshipSchema = z.object({
  id: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  relationshipType: z.enum([
    'supplies',
    'manufactures',
    'distributes',
    'transports',
    'warehouses',
    'processes',
  ]),
  materialFlow: z.array(z.string()).optional(), // Materials/components flowing
  strength: z.number().min(0).max(1), // Relationship strength score
  volume: z.number().optional(), // Transaction volume
  leadTimeDays: z.number().optional(),
  cost: z.number().optional(),
  currency: z.string().optional(),
  isActive: z.boolean(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SupplyChainRelationship = z.infer<typeof SupplyChainRelationshipSchema>;

// ============================================================================
// Risk Assessment Types
// ============================================================================

export const RiskCategorySchema = z.enum([
  'financial',
  'cybersecurity',
  'geopolitical',
  'regulatory',
  'esg',
  'operational',
  'quality',
  'delivery',
  'capacity',
  'concentration',
]);

export type RiskCategory = z.infer<typeof RiskCategorySchema>;

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RiskAssessmentSchema = z.object({
  id: z.string().uuid(),
  nodeId: z.string().uuid(),
  category: RiskCategorySchema,
  level: RiskLevelSchema,
  score: z.number().min(0).max(100),
  indicators: z.array(z.object({
    name: z.string(),
    value: z.any(),
    impact: z.enum(['positive', 'negative', 'neutral']),
  })),
  mitigations: z.array(z.string()).optional(),
  assessedAt: z.date(),
  assessedBy: z.string().optional(),
  validUntil: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

export const FinancialHealthMetricsSchema = z.object({
  nodeId: z.string().uuid(),
  revenue: z.number().optional(),
  profitMargin: z.number().optional(),
  debtToEquity: z.number().optional(),
  currentRatio: z.number().optional(),
  creditRating: z.string().optional(),
  cashFlow: z.number().optional(),
  bankruptcyRisk: z.number().min(0).max(1).optional(),
  assessedAt: z.date(),
});

export type FinancialHealthMetrics = z.infer<typeof FinancialHealthMetricsSchema>;

export const CybersecurityPostureSchema = z.object({
  nodeId: z.string().uuid(),
  securityScore: z.number().min(0).max(100),
  certifications: z.array(z.string()),
  vulnerabilities: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  incidentHistory: z.array(z.object({
    date: z.date(),
    type: z.string(),
    severity: RiskLevelSchema,
    resolved: z.boolean(),
  })),
  lastAssessed: z.date(),
});

export type CybersecurityPosture = z.infer<typeof CybersecurityPostureSchema>;

export const ESGScoreSchema = z.object({
  nodeId: z.string().uuid(),
  overallScore: z.number().min(0).max(100),
  environmentalScore: z.number().min(0).max(100),
  socialScore: z.number().min(0).max(100),
  governanceScore: z.number().min(0).max(100),
  certifications: z.array(z.string()),
  violations: z.array(z.object({
    category: z.string(),
    description: z.string(),
    date: z.date(),
    severity: RiskLevelSchema,
  })),
  lastAssessed: z.date(),
});

export type ESGScore = z.infer<typeof ESGScoreSchema>;

// ============================================================================
// Component and Material Tracking
// ============================================================================

export const ComponentSchema = z.object({
  id: z.string().uuid(),
  partNumber: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  manufacturer: z.string().optional(),
  suppliers: z.array(z.string().uuid()),
  specifications: z.record(z.any()).optional(),
  isCritical: z.boolean(),
  isControlled: z.boolean(), // Export controlled
  isConflictMineral: z.boolean(),
  leadTimeDays: z.number().optional(),
  minimumOrderQuantity: z.number().optional(),
  unitCost: z.number().optional(),
  currency: z.string().optional(),
  alternativeComponents: z.array(z.string().uuid()).optional(),
  obsolescenceRisk: z.enum(['low', 'medium', 'high']),
  certifications: z.array(z.string()).optional(),
  serialized: z.boolean(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Component = z.infer<typeof ComponentSchema>;

export const BillOfMaterialsSchema = z.object({
  id: z.string().uuid(),
  productId: z.string(),
  productName: z.string(),
  version: z.string(),
  items: z.array(z.object({
    componentId: z.string().uuid(),
    quantity: z.number(),
    unit: z.string(),
    isOptional: z.boolean(),
    alternatives: z.array(z.string().uuid()).optional(),
  })),
  totalCost: z.number().optional(),
  currency: z.string().optional(),
  validFrom: z.date(),
  validUntil: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export type BillOfMaterials = z.infer<typeof BillOfMaterialsSchema>;

export const ComponentInventorySchema = z.object({
  id: z.string().uuid(),
  componentId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number(),
  unit: z.string(),
  reorderPoint: z.number().optional(),
  maxStock: z.number().optional(),
  lastRestocked: z.date().optional(),
  expirationDate: z.date().optional(),
  batchNumber: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  status: z.enum(['available', 'reserved', 'in-transit', 'quarantined', 'expired']),
  metadata: z.record(z.any()).optional(),
  updatedAt: z.date(),
});

export type ComponentInventory = z.infer<typeof ComponentInventorySchema>;

// ============================================================================
// Logistics and Transportation
// ============================================================================

export const ShipmentStatusSchema = z.enum([
  'pending',
  'picked-up',
  'in-transit',
  'at-port',
  'customs-clearance',
  'out-for-delivery',
  'delivered',
  'delayed',
  'lost',
  'damaged',
  'returned',
]);

export type ShipmentStatus = z.infer<typeof ShipmentStatusSchema>;

export const ShipmentSchema = z.object({
  id: z.string().uuid(),
  trackingNumber: z.string(),
  orderReference: z.string().optional(),
  origin: GeographicLocationSchema,
  destination: GeographicLocationSchema,
  carrier: z.string(),
  transportMode: z.enum(['air', 'sea', 'rail', 'road', 'multimodal']),
  status: ShipmentStatusSchema,
  currentLocation: GeographicLocationSchema.optional(),
  contents: z.array(z.object({
    componentId: z.string().uuid().optional(),
    description: z.string(),
    quantity: z.number(),
    value: z.number().optional(),
  })),
  estimatedDeparture: z.date().optional(),
  actualDeparture: z.date().optional(),
  estimatedArrival: z.date(),
  actualArrival: z.date().optional(),
  milestones: z.array(z.object({
    timestamp: z.date(),
    location: GeographicLocationSchema,
    event: z.string(),
    status: ShipmentStatusSchema,
  })),
  temperature: z.object({
    min: z.number(),
    max: z.number(),
    current: z.number().optional(),
    unit: z.string(),
  }).optional(),
  alerts: z.array(z.object({
    timestamp: z.date(),
    type: z.string(),
    severity: RiskLevelSchema,
    message: z.string(),
  })).optional(),
  insurance: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    coverage: z.number(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Shipment = z.infer<typeof ShipmentSchema>;

export const CarrierPerformanceSchema = z.object({
  carrierId: z.string(),
  carrierName: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  metrics: z.object({
    onTimeDeliveryRate: z.number().min(0).max(1),
    damageRate: z.number().min(0).max(1),
    lossRate: z.number().min(0).max(1),
    averageDelayDays: z.number(),
    totalShipments: z.number(),
    successfulDeliveries: z.number(),
  }),
  score: z.number().min(0).max(100),
  lastUpdated: z.date(),
});

export type CarrierPerformance = z.infer<typeof CarrierPerformanceSchema>;

// ============================================================================
// Compliance and Regulatory
// ============================================================================

export const ComplianceRequirementSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  category: z.enum([
    'export-control',
    'sanctions',
    'conflict-minerals',
    'environmental',
    'labor',
    'product-safety',
    'trade',
    'industry-specific',
  ]),
  jurisdiction: z.string(),
  description: z.string(),
  requirementText: z.string().optional(),
  applicableNodeTypes: z.array(SupplyChainNodeTypeSchema),
  effectiveDate: z.date(),
  expirationDate: z.date().optional(),
  mandatoryCertifications: z.array(z.string()).optional(),
  penalties: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ComplianceRequirement = z.infer<typeof ComplianceRequirementSchema>;

export const ComplianceStatusSchema = z.object({
  id: z.string().uuid(),
  nodeId: z.string().uuid(),
  requirementId: z.string().uuid(),
  status: z.enum(['compliant', 'non-compliant', 'under-review', 'exempted', 'not-applicable']),
  lastAssessedAt: z.date(),
  assessedBy: z.string().optional(),
  evidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    documentUrl: z.string().optional(),
    uploadedAt: z.date(),
  })).optional(),
  findings: z.array(z.object({
    severity: RiskLevelSchema,
    description: z.string(),
    remediation: z.string().optional(),
  })).optional(),
  nextAssessmentDue: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

export const CertificationSchema = z.object({
  id: z.string().uuid(),
  nodeId: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  issuingAuthority: z.string(),
  certificateNumber: z.string(),
  issuedDate: z.date(),
  expirationDate: z.date().optional(),
  scope: z.string().optional(),
  documentUrl: z.string().optional(),
  status: z.enum(['valid', 'expired', 'suspended', 'revoked']),
  metadata: z.record(z.any()).optional(),
});

export type Certification = z.infer<typeof CertificationSchema>;

// ============================================================================
// Incident and Event Management
// ============================================================================

export const IncidentTypeSchema = z.enum([
  'disruption',
  'quality-issue',
  'delivery-delay',
  'security-breach',
  'natural-disaster',
  'geopolitical-event',
  'regulatory-violation',
  'financial-distress',
  'labor-dispute',
  'contamination',
  'recall',
  'fraud',
  'other',
]);

export type IncidentType = z.infer<typeof IncidentTypeSchema>;

export const IncidentSchema = z.object({
  id: z.string().uuid(),
  type: IncidentTypeSchema,
  title: z.string(),
  description: z.string(),
  severity: RiskLevelSchema,
  status: z.enum(['open', 'investigating', 'mitigating', 'resolved', 'closed']),
  affectedNodes: z.array(z.string().uuid()),
  affectedComponents: z.array(z.string().uuid()).optional(),
  affectedShipments: z.array(z.string().uuid()).optional(),
  impact: z.object({
    financial: z.number().optional(),
    operational: z.string().optional(),
    reputational: z.string().optional(),
    estimatedRecoveryDays: z.number().optional(),
  }),
  detectedAt: z.date(),
  reportedAt: z.date(),
  reportedBy: z.string().optional(),
  resolvedAt: z.date().optional(),
  rootCause: z.string().optional(),
  mitigationActions: z.array(z.object({
    action: z.string(),
    assignedTo: z.string().optional(),
    status: z.enum(['pending', 'in-progress', 'completed']),
    completedAt: z.date().optional(),
  })),
  lessonsLearned: z.string().optional(),
  preventiveMeasures: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Incident = z.infer<typeof IncidentSchema>;

export const AlertSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  severity: RiskLevelSchema,
  title: z.string(),
  message: z.string(),
  source: z.string(),
  affectedEntities: z.array(z.string().uuid()),
  triggeredAt: z.date(),
  acknowledgedAt: z.date().optional(),
  acknowledgedBy: z.string().optional(),
  resolvedAt: z.date().optional(),
  actionRequired: z.boolean(),
  recommendedActions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

// ============================================================================
// Analytics and Forecasting
// ============================================================================

export const DisruptionPredictionSchema = z.object({
  id: z.string().uuid(),
  nodeId: z.string().uuid().optional(),
  componentId: z.string().uuid().optional(),
  predictionType: z.enum(['supply-shortage', 'quality-issue', 'delay', 'price-spike', 'capacity-constraint']),
  probability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  expectedImpact: RiskLevelSchema,
  timeframe: z.object({
    start: z.date(),
    end: z.date(),
  }),
  factors: z.array(z.object({
    factor: z.string(),
    contribution: z.number(),
  })),
  recommendations: z.array(z.string()),
  generatedAt: z.date(),
  modelVersion: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type DisruptionPrediction = z.infer<typeof DisruptionPredictionSchema>;

export const SupplyChainMetricsSchema = z.object({
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  metrics: z.object({
    totalNodes: z.number(),
    totalRelationships: z.number(),
    averageTier: z.number(),
    criticalNodes: z.number(),
    highRiskNodes: z.number(),
    averageRiskScore: z.number().min(0).max(100),
    onTimeDeliveryRate: z.number().min(0).max(1),
    qualityIncidentRate: z.number(),
    averageLeadTime: z.number(),
    supplyChainResilience: z.number().min(0).max(100),
    diversificationScore: z.number().min(0).max(100),
    complianceRate: z.number().min(0).max(1),
    totalIncidents: z.number(),
    resolvedIncidents: z.number(),
  }),
  trends: z.object({
    riskTrend: z.enum(['improving', 'stable', 'deteriorating']),
    costTrend: z.enum(['increasing', 'stable', 'decreasing']),
    performanceTrend: z.enum(['improving', 'stable', 'deteriorating']),
  }).optional(),
  generatedAt: z.date(),
});

export type SupplyChainMetrics = z.infer<typeof SupplyChainMetricsSchema>;

// ============================================================================
// Third-Party and Vendor Management
// ============================================================================

export const VendorAssessmentSchema = z.object({
  id: z.string().uuid(),
  vendorId: z.string().uuid(),
  assessmentType: z.enum(['initial-onboarding', 'periodic-review', 'incident-triggered', 'contract-renewal']),
  overallScore: z.number().min(0).max(100),
  categories: z.object({
    financial: z.number().min(0).max(100),
    cybersecurity: z.number().min(0).max(100),
    operational: z.number().min(0).max(100),
    compliance: z.number().min(0).max(100),
    esg: z.number().min(0).max(100),
  }),
  recommendation: z.enum(['approve', 'approve-with-conditions', 'reject', 'monitor', 'terminate']),
  conditions: z.array(z.string()).optional(),
  assessor: z.string().optional(),
  assessmentDate: z.date(),
  nextAssessmentDue: z.date().optional(),
  findings: z.array(z.object({
    category: z.string(),
    finding: z.string(),
    severity: RiskLevelSchema,
    recommendation: z.string().optional(),
  })),
  metadata: z.record(z.any()).optional(),
});

export type VendorAssessment = z.infer<typeof VendorAssessmentSchema>;

export const ContractSchema = z.object({
  id: z.string().uuid(),
  vendorId: z.string().uuid(),
  contractNumber: z.string(),
  type: z.enum(['supply', 'service', 'logistics', 'manufacturing']),
  status: z.enum(['draft', 'active', 'expired', 'terminated', 'renewed']),
  effectiveDate: z.date(),
  expirationDate: z.date().optional(),
  autoRenewal: z.boolean(),
  value: z.number().optional(),
  currency: z.string().optional(),
  sla: z.object({
    deliveryTimeDays: z.number().optional(),
    qualityTargets: z.record(z.number()).optional(),
    performanceMetrics: z.record(z.number()).optional(),
    penalties: z.array(z.object({
      breach: z.string(),
      penalty: z.string(),
    })).optional(),
  }).optional(),
  terminationClauses: z.array(z.string()).optional(),
  complianceRequirements: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Contract = z.infer<typeof ContractSchema>;
