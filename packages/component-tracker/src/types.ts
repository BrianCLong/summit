import { z } from 'zod';

/**
 * Component and Material Definitions
 */
export const ComponentTypeSchema = z.enum([
  'raw_material',
  'sub_component',
  'assembly',
  'finished_good',
  'packaging',
  'consumable',
]);

export const ComponentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  // Identification
  partNumber: z.string(),
  manufacturerPartNumber: z.string().optional(),
  description: z.string(),
  type: ComponentTypeSchema,

  // Classification
  category: z.string(),
  subcategory: z.string().optional(),
  commodityCode: z.string().optional(), // HS Code, HTS Code, etc.

  // Manufacturing
  manufacturer: z.object({
    supplierId: z.string(),
    name: z.string(),
    country: z.string(),
  }),

  // Specifications
  specifications: z.object({
    dimensions: z.string().optional(),
    weight: z.number().optional(),
    material: z.string().optional(),
    customAttributes: z.record(z.string(), z.any()).optional(),
  }).optional(),

  // Compliance and certifications
  certifications: z.array(z.string()).optional(),
  complianceRequirements: z.array(z.string()).optional(),

  // Lifecycle
  lifecycleStatus: z.enum([
    'active',
    'pending_approval',
    'obsolete',
    'end_of_life',
    'discontinued',
  ]),

  obsolescenceDate: z.string().datetime().optional(),
  replacementPartNumber: z.string().optional(),

  // Cost and sourcing
  unitCost: z.object({
    currency: z.string(),
    amount: z.number(),
    effectiveDate: z.string().datetime(),
  }).optional(),

  leadTimeDays: z.number(),
  minimumOrderQuantity: z.number().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Component = z.infer<typeof ComponentSchema>;
export type ComponentType = z.infer<typeof ComponentTypeSchema>;

/**
 * Bill of Materials (BOM)
 */
export const BOMItemSchema = z.object({
  componentId: z.string(),
  partNumber: z.string(),
  quantity: z.number(),
  unit: z.string(), // e.g., "EA", "KG", "M"

  // Sourcing
  preferredSupplier: z.string().optional(),
  alternativeSuppliers: z.array(z.string()).optional(),

  // Properties
  isCritical: z.boolean(),
  isCustom: z.boolean(),
  referenceDesignators: z.array(z.string()).optional(),

  // Notes
  notes: z.string().optional(),
});

export const BillOfMaterialsSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  // Product information
  productId: z.string(),
  productName: z.string(),
  version: z.string(),

  // BOM structure
  items: z.array(BOMItemSchema),

  // Metadata
  bomType: z.enum(['engineering', 'manufacturing', 'service', 'sales']),
  status: z.enum(['draft', 'released', 'obsolete']),

  // Cost analysis
  totalMaterialCost: z.number().optional(),
  totalLeadTime: z.number().optional(),

  // Validation
  validatedBy: z.string().optional(),
  validationDate: z.string().datetime().optional(),

  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BOMItem = z.infer<typeof BOMItemSchema>;
export type BillOfMaterials = z.infer<typeof BillOfMaterialsSchema>;

/**
 * Component Sourcing and Availability
 */
export const SourceSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  preferenceRank: z.number(), // 1 = preferred, 2 = alternative, etc.

  // Pricing
  unitPrice: z.object({
    currency: z.string(),
    amount: z.number(),
    effectiveDate: z.string().datetime(),
    minimumQuantity: z.number().optional(),
  }),

  // Lead time
  leadTimeDays: z.number(),
  leadTimeReliability: z.number().min(0).max(100).optional(),

  // Quality
  qualityRating: z.number().min(0).max(100).optional(),
  defectRate: z.number().optional(), // PPM

  // Availability
  stockAvailability: z.enum(['in_stock', 'limited', 'out_of_stock', 'unknown']),
  estimatedStock: z.number().optional(),

  // Contract
  hasContract: z.boolean(),
  contractId: z.string().optional(),

  lastUpdated: z.string().datetime(),
});

export const ComponentSourcingSchema = z.object({
  componentId: z.string(),
  partNumber: z.string(),
  tenantId: z.string(),

  sources: z.array(SourceSchema),

  // Market intelligence
  marketAvailability: z.enum(['abundant', 'normal', 'limited', 'scarce']),
  priceVolatility: z.enum(['stable', 'moderate', 'high', 'extreme']),
  pricetrend: z.enum(['increasing', 'stable', 'decreasing']),

  // Risk factors
  singleSourceRisk: z.boolean(),
  geographicConcentrationRisk: z.boolean(),

  // Recommendations
  recommendedAction: z.string().optional(),

  updatedAt: z.string().datetime(),
});

export type Source = z.infer<typeof SourceSchema>;
export type ComponentSourcing = z.infer<typeof ComponentSourcingSchema>;

/**
 * Inventory and Stock Levels
 */
export const InventoryRecordSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  tenantId: z.string(),

  // Location
  warehouse: z.object({
    id: z.string(),
    name: z.string(),
    location: z.string(),
  }),

  // Quantity
  quantityOnHand: z.number(),
  quantityReserved: z.number(),
  quantityAvailable: z.number(),

  // Reorder parameters
  reorderPoint: z.number(),
  reorderQuantity: z.number(),
  safetyStock: z.number(),

  // Lot tracking
  lotNumbers: z.array(z.object({
    lotNumber: z.string(),
    quantity: z.number(),
    expirationDate: z.string().datetime().optional(),
  })).optional(),

  // Status
  status: z.enum(['normal', 'low_stock', 'critical', 'excess']),

  lastCountDate: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
});

export type InventoryRecord = z.infer<typeof InventoryRecordSchema>;

/**
 * Component Quality and Compliance
 */
export const QualityCertificationSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  tenantId: z.string(),

  certificationType: z.string(), // e.g., "ISO9001", "RoHS", "REACH"
  certificationBody: z.string(),
  certificateNumber: z.string(),

  issueDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),

  status: z.enum(['valid', 'expired', 'revoked', 'pending_renewal']),

  documentId: z.string().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ComplianceCheckSchema = z.object({
  regulation: z.string(), // e.g., "RoHS", "REACH", "Conflict Minerals"
  compliant: z.boolean(),
  complianceDate: z.string().datetime(),
  evidenceDocuments: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const ComponentComplianceSchema = z.object({
  componentId: z.string(),
  partNumber: z.string(),
  tenantId: z.string(),

  complianceChecks: z.array(ComplianceCheckSchema),

  // Conflict minerals
  conflictMineralsFree: z.boolean().optional(),
  conflictMineralsDeclaration: z.string().optional(), // Document ID

  // Restricted substances
  roHSCompliant: z.boolean().optional(),
  reachCompliant: z.boolean().optional(),

  // Country of origin
  countryOfOrigin: z.string(),
  countryOfOriginCertificate: z.string().optional(),

  // Overall compliance
  overallComplianceStatus: z.enum(['compliant', 'non_compliant', 'partial', 'unknown']),

  lastVerified: z.string().datetime(),
});

export type QualityCertification = z.infer<typeof QualityCertificationSchema>;
export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;
export type ComponentCompliance = z.infer<typeof ComponentComplianceSchema>;

/**
 * Counterfeit Detection and Authentication
 */
export const AuthenticationMethodSchema = z.enum([
  'serial_number',
  'hologram',
  'rfid',
  'dna_marking',
  'microprint',
  'chemical_signature',
  'visual_inspection',
  'electrical_testing',
]);

export const CounterfeitIndicatorSchema = z.object({
  indicator: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
});

export const AuthenticationResultSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  partNumber: z.string(),
  tenantId: z.string(),

  // Inspection details
  inspectionDate: z.string().datetime(),
  inspectedBy: z.string(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),

  // Methods used
  authenticationMethods: z.array(AuthenticationMethodSchema),

  // Results
  authenticityScore: z.number().min(0).max(100),
  verdict: z.enum(['authentic', 'counterfeit', 'suspect', 'inconclusive']),

  // Indicators
  counterfeitIndicators: z.array(CounterfeitIndicatorSchema).optional(),

  // Supplier validation
  supplierVerified: z.boolean(),
  sourceTraceability: z.enum(['full', 'partial', 'none']),

  // Actions
  actionTaken: z.enum([
    'accepted',
    'rejected',
    'quarantined',
    'further_testing',
    'supplier_notification',
  ]),

  notes: z.string().optional(),

  createdAt: z.string().datetime(),
});

export type AuthenticationMethod = z.infer<typeof AuthenticationMethodSchema>;
export type CounterfeitIndicator = z.infer<typeof CounterfeitIndicatorSchema>;
export type AuthenticationResult = z.infer<typeof AuthenticationResultSchema>;

/**
 * Component Lifecycle and Obsolescence
 */
export const ObsolescenceRiskSchema = z.object({
  componentId: z.string(),
  partNumber: z.string(),
  tenantId: z.string(),

  // Risk assessment
  obsolescenceRisk: z.enum(['low', 'medium', 'high', 'critical', 'obsolete']),
  riskScore: z.number().min(0).max(100),

  // Risk factors
  riskFactors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
  })),

  // Lifecycle information
  productLifecyclePhase: z.enum([
    'introduction',
    'growth',
    'maturity',
    'decline',
    'phase_out',
  ]),

  estimatedEndOfLife: z.string().datetime().optional(),
  manufacturerAnnouncement: z.string().optional(),

  // Mitigation
  lastTimeBuyDate: z.string().datetime().optional(),
  lastTimeBuyQuantity: z.number().optional(),
  alternativeComponents: z.array(z.object({
    componentId: z.string(),
    partNumber: z.string(),
    compatibility: z.enum(['drop_in', 'requires_redesign', 'form_fit_function']),
    qualificationStatus: z.enum(['qualified', 'in_progress', 'not_qualified']),
  })).optional(),

  // Recommendations
  recommendedAction: z.string(),
  mitigationStrategy: z.string().optional(),

  lastAssessed: z.string().datetime(),
  nextReviewDate: z.string().datetime(),
});

export type ObsolescenceRisk = z.infer<typeof ObsolescenceRiskSchema>;

/**
 * Serialization and Track-and-Trace
 */
export const SerializedItemSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  partNumber: z.string(),
  tenantId: z.string(),

  // Serialization
  serialNumber: z.string(),
  lotNumber: z.string(),
  batchNumber: z.string().optional(),

  // Manufacturing
  manufactureDate: z.string().datetime(),
  manufacturerLocation: z.string(),
  productionLine: z.string().optional(),

  // Quality control
  inspectionPassed: z.boolean(),
  inspectionDate: z.string().datetime().optional(),
  qualityGrade: z.string().optional(),

  // Chain of custody
  chainOfCustody: z.array(z.object({
    timestamp: z.string().datetime(),
    location: z.string(),
    custodian: z.string(),
    activity: z.string(),
    signature: z.string().optional(),
  })),

  // Current status
  currentLocation: z.string(),
  currentCustodian: z.string(),
  status: z.enum(['in_transit', 'in_stock', 'in_use', 'returned', 'disposed']),

  // End use
  installedIn: z.string().optional(), // Product/assembly ID
  installationDate: z.string().datetime().optional(),
  warrantyExpiration: z.string().datetime().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SerializedItem = z.infer<typeof SerializedItemSchema>;

/**
 * Price Volatility and Market Analysis
 */
export const PriceHistorySchema = z.object({
  componentId: z.string(),
  partNumber: z.string(),
  tenantId: z.string(),

  pricePoints: z.array(z.object({
    date: z.string().datetime(),
    price: z.number(),
    currency: z.string(),
    supplierId: z.string(),
    volume: z.number().optional(),
  })),

  // Analysis
  currentPrice: z.number(),
  averagePrice: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),

  volatility: z.enum(['low', 'medium', 'high', 'extreme']),
  volatilityScore: z.number().min(0).max(100),

  trend: z.enum(['increasing', 'stable', 'decreasing']),
  trendPercentage: z.number(), // % change

  // Forecast
  forecastedPrice: z.number().optional(),
  forecastConfidence: z.number().min(0).max(100).optional(),

  // Market factors
  marketFactors: z.array(z.string()).optional(),

  analysisDate: z.string().datetime(),
});

export type PriceHistory = z.infer<typeof PriceHistorySchema>;
