/**
 * Defense Logistics Automation and Smart Contracting Types
 *
 * Comprehensive type system for AI-driven logistics automation including:
 * - Demand forecasting and needs prediction
 * - Procurement contract automation
 * - Delivery tracking and optimization
 * - Sustainment operations management
 * - DLA/NATO/Allied system integration
 */

import { z } from 'zod';

// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================

export const ContractStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'active',
  'completed',
  'cancelled',
  'expired',
]);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const ProcurementPrioritySchema = z.enum([
  'routine',
  'priority',
  'urgent',
  'emergency',
  'critical_defense',
]);
export type ProcurementPriority = z.infer<typeof ProcurementPrioritySchema>;

export const DeliveryStatusSchema = z.enum([
  'pending',
  'in_transit',
  'customs_hold',
  'at_staging',
  'delivered',
  'rejected',
  'returned',
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const SupplySystemSchema = z.enum([
  'DLA', // Defense Logistics Agency
  'NATO_NSPA', // NATO Support and Procurement Agency
  'FMS', // Foreign Military Sales
  'ALLIED_LOGEX', // Allied Logistics Exchange
  'GCSS_ARMY', // Global Combat Support System - Army
  'NAVSUP', // Naval Supply Systems Command
  'AFMC', // Air Force Materiel Command
]);
export type SupplySystem = z.infer<typeof SupplySystemSchema>;

export const ForecastMethodSchema = z.enum([
  'historical_trend',
  'operational_tempo',
  'mission_planning',
  'consumption_rate',
  'ml_predictive',
  'ensemble',
]);
export type ForecastMethod = z.infer<typeof ForecastMethodSchema>;

// =============================================================================
// CORE DOMAIN SCHEMAS
// =============================================================================

// ---------------------------------------------------------------------------
// Demand Forecasting
// ---------------------------------------------------------------------------

export const DemandForecastSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string(),
  nsn: z.string().optional(), // NATO Stock Number
  description: z.string(),
  forecastMethod: ForecastMethodSchema,
  forecastPeriodStart: z.string().datetime(),
  forecastPeriodEnd: z.string().datetime(),
  predictedQuantity: z.number().positive(),
  confidenceLevel: z.number().min(0).max(1),
  unitOfMeasure: z.string(),
  consumptionRate: z.number().optional(),
  safetyStockLevel: z.number().optional(),
  reorderPoint: z.number().optional(),
  leadTimeDays: z.number().positive(),
  factors: z.object({
    historicalUsage: z.number().optional(),
    operationalTempo: z.number().optional(),
    seasonality: z.number().optional(),
    plannedExercises: z.array(z.string()).optional(),
    threatLevel: z.number().min(1).max(5).optional(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DemandForecast = z.infer<typeof DemandForecastSchema>;

export const ForecastRequestSchema = z.object({
  itemIds: z.array(z.string()).optional(),
  nsns: z.array(z.string()).optional(),
  forecastHorizonDays: z.number().positive().default(90),
  method: ForecastMethodSchema.optional(),
  unitIds: z.array(z.string()).optional(),
  includeExerciseDemand: z.boolean().default(true),
});
export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;

// ---------------------------------------------------------------------------
// Smart Contracting
// ---------------------------------------------------------------------------

export const ContractLineItemSchema = z.object({
  lineNumber: z.number().int().positive(),
  itemId: z.string(),
  nsn: z.string().optional(),
  description: z.string(),
  quantity: z.number().positive(),
  unitOfMeasure: z.string(),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive(),
  deliveryDate: z.string().datetime(),
  deliveryLocation: z.string(),
  dodaac: z.string().optional(), // DoD Activity Address Code
});
export type ContractLineItem = z.infer<typeof ContractLineItemSchema>;

export const ContractTermsSchema = z.object({
  paymentTerms: z.string(),
  warrantyPeriodMonths: z.number().optional(),
  penaltyClause: z.string().optional(),
  qualityRequirements: z.array(z.string()),
  complianceRequirements: z.array(z.string()),
  securityClassification: z.enum(['unclassified', 'cui', 'secret', 'top_secret']),
  exportControlled: z.boolean(),
  farClauses: z.array(z.string()), // Federal Acquisition Regulation clauses
  dfarsClauses: z.array(z.string()), // Defense FAR Supplement clauses
});
export type ContractTerms = z.infer<typeof ContractTermsSchema>;

export const ProcurementContractSchema = z.object({
  id: z.string().uuid(),
  contractNumber: z.string(),
  title: z.string(),
  status: ContractStatusSchema,
  priority: ProcurementPrioritySchema,
  vendorId: z.string(),
  vendorName: z.string(),
  vendorCage: z.string().optional(), // Commercial and Government Entity code
  contractType: z.enum([
    'firm_fixed_price',
    'cost_plus_fixed_fee',
    'time_and_materials',
    'indefinite_delivery',
    'blanket_purchase',
  ]),
  totalValue: z.number().positive(),
  currency: z.string().default('USD'),
  lineItems: z.array(ContractLineItemSchema),
  terms: ContractTermsSchema,
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime(),
  autoGenerated: z.boolean().default(false),
  sourceForecastIds: z.array(z.string().uuid()).optional(),
  sourceSystem: SupplySystemSchema.optional(),
  approvals: z.array(
    z.object({
      approverId: z.string(),
      approverName: z.string(),
      approvedAt: z.string().datetime(),
      level: z.number().int().positive(),
    }),
  ),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ProcurementContract = z.infer<typeof ProcurementContractSchema>;

export const ContractGenerationRequestSchema = z.object({
  forecastIds: z.array(z.string().uuid()),
  preferredVendorIds: z.array(z.string()).optional(),
  priority: ProcurementPrioritySchema.default('routine'),
  consolidateItems: z.boolean().default(true),
  maxContractValue: z.number().positive().optional(),
  requiredDeliveryDate: z.string().datetime().optional(),
});
export type ContractGenerationRequest = z.infer<typeof ContractGenerationRequestSchema>;

// ---------------------------------------------------------------------------
// Delivery Tracking
// ---------------------------------------------------------------------------

export const DeliveryMilestoneSchema = z.object({
  milestone: z.string(),
  location: z.string(),
  timestamp: z.string().datetime(),
  status: z.enum(['completed', 'current', 'pending']),
  notes: z.string().optional(),
});
export type DeliveryMilestone = z.infer<typeof DeliveryMilestoneSchema>;

export const DeliverySchema = z.object({
  id: z.string().uuid(),
  contractId: z.string().uuid(),
  contractLineNumber: z.number().int().positive(),
  trackingNumber: z.string(),
  status: DeliveryStatusSchema,
  carrier: z.string(),
  originLocation: z.string(),
  destinationDodaac: z.string(),
  destinationAddress: z.string(),
  estimatedDeliveryDate: z.string().datetime(),
  actualDeliveryDate: z.string().datetime().optional(),
  quantity: z.number().positive(),
  weight: z.number().positive().optional(),
  weightUnit: z.enum(['kg', 'lb']).optional(),
  milestones: z.array(DeliveryMilestoneSchema),
  customsStatus: z.enum(['not_applicable', 'pending', 'cleared', 'held']).optional(),
  hazmatClass: z.string().optional(),
  temperatureControlled: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Delivery = z.infer<typeof DeliverySchema>;

// ---------------------------------------------------------------------------
// Sustainment Operations
// ---------------------------------------------------------------------------

export const SustainmentMetricsSchema = z.object({
  itemId: z.string(),
  nsn: z.string().optional(),
  currentInventory: z.number(),
  onOrder: z.number(),
  inTransit: z.number(),
  availableToPromise: z.number(),
  daysOfSupply: z.number(),
  stockoutRisk: z.number().min(0).max(1),
  turnoverRate: z.number(),
  fillRate: z.number().min(0).max(1),
  backorderCount: z.number(),
  lastReplenishmentDate: z.string().datetime().optional(),
  nextReplenishmentDate: z.string().datetime().optional(),
});
export type SustainmentMetrics = z.infer<typeof SustainmentMetricsSchema>;

export const ReplenishmentRecommendationSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string(),
  nsn: z.string().optional(),
  recommendedQuantity: z.number().positive(),
  urgency: ProcurementPrioritySchema,
  reason: z.enum([
    'below_safety_stock',
    'forecast_demand',
    'exercise_requirement',
    'operational_surge',
    'shelf_life_expiration',
  ]),
  estimatedCost: z.number().positive(),
  suggestedVendorIds: z.array(z.string()),
  autoCreateContract: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ReplenishmentRecommendation = z.infer<typeof ReplenishmentRecommendationSchema>;

// ---------------------------------------------------------------------------
// External System Integration
// ---------------------------------------------------------------------------

export const ExternalSystemCredentialSchema = z.object({
  system: SupplySystemSchema,
  endpoint: z.string().url(),
  apiKeyRef: z.string(), // Reference to secret store
  certificateRef: z.string().optional(),
  enabled: z.boolean(),
  lastSyncAt: z.string().datetime().optional(),
  syncIntervalMinutes: z.number().positive().default(60),
});
export type ExternalSystemCredential = z.infer<typeof ExternalSystemCredentialSchema>;

export const DataExchangeRecordSchema = z.object({
  id: z.string().uuid(),
  sourceSystem: SupplySystemSchema,
  targetSystem: SupplySystemSchema.optional(),
  direction: z.enum(['inbound', 'outbound']),
  recordType: z.enum(['forecast', 'contract', 'delivery', 'inventory', 'requisition']),
  recordId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  errorMessage: z.string().optional(),
  payload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type DataExchangeRecord = z.infer<typeof DataExchangeRecordSchema>;

// ---------------------------------------------------------------------------
// NATO/Allied Interoperability
// ---------------------------------------------------------------------------

export const NatoLogisticsMessageSchema = z.object({
  messageId: z.string(),
  messageType: z.enum([
    'LOGASSESSREP', // Logistics Assessment Report
    'LOGREQ', // Logistics Request
    'LOGSITREP', // Logistics Situation Report
    'MOVREQ', // Movement Request
    'SUPPLY_STATUS',
  ]),
  originatingNation: z.string().length(3), // ISO 3166-1 alpha-3
  destinationNation: z.string().length(3).optional(),
  classification: z.enum(['NATO_UNCLASSIFIED', 'NATO_RESTRICTED', 'NATO_CONFIDENTIAL', 'NATO_SECRET']),
  content: z.record(z.unknown()),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});
export type NatoLogisticsMessage = z.infer<typeof NatoLogisticsMessageSchema>;

// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      totalItems: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
  });

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
