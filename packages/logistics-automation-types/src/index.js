"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiErrorSchema = exports.PaginatedResponseSchema = exports.NatoLogisticsMessageSchema = exports.DataExchangeRecordSchema = exports.ExternalSystemCredentialSchema = exports.ReplenishmentRecommendationSchema = exports.SustainmentMetricsSchema = exports.DeliverySchema = exports.DeliveryMilestoneSchema = exports.ContractGenerationRequestSchema = exports.ProcurementContractSchema = exports.ContractTermsSchema = exports.ContractLineItemSchema = exports.ForecastRequestSchema = exports.DemandForecastSchema = exports.ForecastMethodSchema = exports.SupplySystemSchema = exports.DeliveryStatusSchema = exports.ProcurementPrioritySchema = exports.ContractStatusSchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================
exports.ContractStatusSchema = zod_1.z.enum([
    'draft',
    'pending_approval',
    'approved',
    'active',
    'completed',
    'cancelled',
    'expired',
]);
exports.ProcurementPrioritySchema = zod_1.z.enum([
    'routine',
    'priority',
    'urgent',
    'emergency',
    'critical_defense',
]);
exports.DeliveryStatusSchema = zod_1.z.enum([
    'pending',
    'in_transit',
    'customs_hold',
    'at_staging',
    'delivered',
    'rejected',
    'returned',
]);
exports.SupplySystemSchema = zod_1.z.enum([
    'DLA', // Defense Logistics Agency
    'NATO_NSPA', // NATO Support and Procurement Agency
    'FMS', // Foreign Military Sales
    'ALLIED_LOGEX', // Allied Logistics Exchange
    'GCSS_ARMY', // Global Combat Support System - Army
    'NAVSUP', // Naval Supply Systems Command
    'AFMC', // Air Force Materiel Command
]);
exports.ForecastMethodSchema = zod_1.z.enum([
    'historical_trend',
    'operational_tempo',
    'mission_planning',
    'consumption_rate',
    'ml_predictive',
    'ensemble',
]);
// =============================================================================
// CORE DOMAIN SCHEMAS
// =============================================================================
// ---------------------------------------------------------------------------
// Demand Forecasting
// ---------------------------------------------------------------------------
exports.DemandForecastSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    itemId: zod_1.z.string(),
    nsn: zod_1.z.string().optional(), // NATO Stock Number
    description: zod_1.z.string(),
    forecastMethod: exports.ForecastMethodSchema,
    forecastPeriodStart: zod_1.z.string().datetime(),
    forecastPeriodEnd: zod_1.z.string().datetime(),
    predictedQuantity: zod_1.z.number().positive(),
    confidenceLevel: zod_1.z.number().min(0).max(1),
    unitOfMeasure: zod_1.z.string(),
    consumptionRate: zod_1.z.number().optional(),
    safetyStockLevel: zod_1.z.number().optional(),
    reorderPoint: zod_1.z.number().optional(),
    leadTimeDays: zod_1.z.number().positive(),
    factors: zod_1.z.object({
        historicalUsage: zod_1.z.number().optional(),
        operationalTempo: zod_1.z.number().optional(),
        seasonality: zod_1.z.number().optional(),
        plannedExercises: zod_1.z.array(zod_1.z.string()).optional(),
        threatLevel: zod_1.z.number().min(1).max(5).optional(),
    }),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.ForecastRequestSchema = zod_1.z.object({
    itemIds: zod_1.z.array(zod_1.z.string()).optional(),
    nsns: zod_1.z.array(zod_1.z.string()).optional(),
    forecastHorizonDays: zod_1.z.number().positive().default(90),
    method: exports.ForecastMethodSchema.optional(),
    unitIds: zod_1.z.array(zod_1.z.string()).optional(),
    includeExerciseDemand: zod_1.z.boolean().default(true),
});
// ---------------------------------------------------------------------------
// Smart Contracting
// ---------------------------------------------------------------------------
exports.ContractLineItemSchema = zod_1.z.object({
    lineNumber: zod_1.z.number().int().positive(),
    itemId: zod_1.z.string(),
    nsn: zod_1.z.string().optional(),
    description: zod_1.z.string(),
    quantity: zod_1.z.number().positive(),
    unitOfMeasure: zod_1.z.string(),
    unitPrice: zod_1.z.number().positive(),
    totalPrice: zod_1.z.number().positive(),
    deliveryDate: zod_1.z.string().datetime(),
    deliveryLocation: zod_1.z.string(),
    dodaac: zod_1.z.string().optional(), // DoD Activity Address Code
});
exports.ContractTermsSchema = zod_1.z.object({
    paymentTerms: zod_1.z.string(),
    warrantyPeriodMonths: zod_1.z.number().optional(),
    penaltyClause: zod_1.z.string().optional(),
    qualityRequirements: zod_1.z.array(zod_1.z.string()),
    complianceRequirements: zod_1.z.array(zod_1.z.string()),
    securityClassification: zod_1.z.enum(['unclassified', 'cui', 'secret', 'top_secret']),
    exportControlled: zod_1.z.boolean(),
    farClauses: zod_1.z.array(zod_1.z.string()), // Federal Acquisition Regulation clauses
    dfarsClauses: zod_1.z.array(zod_1.z.string()), // Defense FAR Supplement clauses
});
exports.ProcurementContractSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    contractNumber: zod_1.z.string(),
    title: zod_1.z.string(),
    status: exports.ContractStatusSchema,
    priority: exports.ProcurementPrioritySchema,
    vendorId: zod_1.z.string(),
    vendorName: zod_1.z.string(),
    vendorCage: zod_1.z.string().optional(), // Commercial and Government Entity code
    contractType: zod_1.z.enum([
        'firm_fixed_price',
        'cost_plus_fixed_fee',
        'time_and_materials',
        'indefinite_delivery',
        'blanket_purchase',
    ]),
    totalValue: zod_1.z.number().positive(),
    currency: zod_1.z.string().default('USD'),
    lineItems: zod_1.z.array(exports.ContractLineItemSchema),
    terms: exports.ContractTermsSchema,
    effectiveDate: zod_1.z.string().datetime(),
    expirationDate: zod_1.z.string().datetime(),
    autoGenerated: zod_1.z.boolean().default(false),
    sourceForecastIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    sourceSystem: exports.SupplySystemSchema.optional(),
    approvals: zod_1.z.array(zod_1.z.object({
        approverId: zod_1.z.string(),
        approverName: zod_1.z.string(),
        approvedAt: zod_1.z.string().datetime(),
        level: zod_1.z.number().int().positive(),
    })),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.ContractGenerationRequestSchema = zod_1.z.object({
    forecastIds: zod_1.z.array(zod_1.z.string().uuid()),
    preferredVendorIds: zod_1.z.array(zod_1.z.string()).optional(),
    priority: exports.ProcurementPrioritySchema.default('routine'),
    consolidateItems: zod_1.z.boolean().default(true),
    maxContractValue: zod_1.z.number().positive().optional(),
    requiredDeliveryDate: zod_1.z.string().datetime().optional(),
});
// ---------------------------------------------------------------------------
// Delivery Tracking
// ---------------------------------------------------------------------------
exports.DeliveryMilestoneSchema = zod_1.z.object({
    milestone: zod_1.z.string(),
    location: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['completed', 'current', 'pending']),
    notes: zod_1.z.string().optional(),
});
exports.DeliverySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    contractId: zod_1.z.string().uuid(),
    contractLineNumber: zod_1.z.number().int().positive(),
    trackingNumber: zod_1.z.string(),
    status: exports.DeliveryStatusSchema,
    carrier: zod_1.z.string(),
    originLocation: zod_1.z.string(),
    destinationDodaac: zod_1.z.string(),
    destinationAddress: zod_1.z.string(),
    estimatedDeliveryDate: zod_1.z.string().datetime(),
    actualDeliveryDate: zod_1.z.string().datetime().optional(),
    quantity: zod_1.z.number().positive(),
    weight: zod_1.z.number().positive().optional(),
    weightUnit: zod_1.z.enum(['kg', 'lb']).optional(),
    milestones: zod_1.z.array(exports.DeliveryMilestoneSchema),
    customsStatus: zod_1.z.enum(['not_applicable', 'pending', 'cleared', 'held']).optional(),
    hazmatClass: zod_1.z.string().optional(),
    temperatureControlled: zod_1.z.boolean().default(false),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Sustainment Operations
// ---------------------------------------------------------------------------
exports.SustainmentMetricsSchema = zod_1.z.object({
    itemId: zod_1.z.string(),
    nsn: zod_1.z.string().optional(),
    currentInventory: zod_1.z.number(),
    onOrder: zod_1.z.number(),
    inTransit: zod_1.z.number(),
    availableToPromise: zod_1.z.number(),
    daysOfSupply: zod_1.z.number(),
    stockoutRisk: zod_1.z.number().min(0).max(1),
    turnoverRate: zod_1.z.number(),
    fillRate: zod_1.z.number().min(0).max(1),
    backorderCount: zod_1.z.number(),
    lastReplenishmentDate: zod_1.z.string().datetime().optional(),
    nextReplenishmentDate: zod_1.z.string().datetime().optional(),
});
exports.ReplenishmentRecommendationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    itemId: zod_1.z.string(),
    nsn: zod_1.z.string().optional(),
    recommendedQuantity: zod_1.z.number().positive(),
    urgency: exports.ProcurementPrioritySchema,
    reason: zod_1.z.enum([
        'below_safety_stock',
        'forecast_demand',
        'exercise_requirement',
        'operational_surge',
        'shelf_life_expiration',
    ]),
    estimatedCost: zod_1.z.number().positive(),
    suggestedVendorIds: zod_1.z.array(zod_1.z.string()),
    autoCreateContract: zod_1.z.boolean(),
    createdAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// External System Integration
// ---------------------------------------------------------------------------
exports.ExternalSystemCredentialSchema = zod_1.z.object({
    system: exports.SupplySystemSchema,
    endpoint: zod_1.z.string().url(),
    apiKeyRef: zod_1.z.string(), // Reference to secret store
    certificateRef: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean(),
    lastSyncAt: zod_1.z.string().datetime().optional(),
    syncIntervalMinutes: zod_1.z.number().positive().default(60),
});
exports.DataExchangeRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceSystem: exports.SupplySystemSchema,
    targetSystem: exports.SupplySystemSchema.optional(),
    direction: zod_1.z.enum(['inbound', 'outbound']),
    recordType: zod_1.z.enum(['forecast', 'contract', 'delivery', 'inventory', 'requisition']),
    recordId: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed']),
    errorMessage: zod_1.z.string().optional(),
    payload: zod_1.z.record(zod_1.z.unknown()),
    createdAt: zod_1.z.string().datetime(),
    completedAt: zod_1.z.string().datetime().optional(),
});
// ---------------------------------------------------------------------------
// NATO/Allied Interoperability
// ---------------------------------------------------------------------------
exports.NatoLogisticsMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    messageType: zod_1.z.enum([
        'LOGASSESSREP', // Logistics Assessment Report
        'LOGREQ', // Logistics Request
        'LOGSITREP', // Logistics Situation Report
        'MOVREQ', // Movement Request
        'SUPPLY_STATUS',
    ]),
    originatingNation: zod_1.z.string().length(3), // ISO 3166-1 alpha-3
    destinationNation: zod_1.z.string().length(3).optional(),
    classification: zod_1.z.enum(['NATO_UNCLASSIFIED', 'NATO_RESTRICTED', 'NATO_CONFIDENTIAL', 'NATO_SECRET']),
    content: zod_1.z.record(zod_1.z.unknown()),
    validFrom: zod_1.z.string().datetime(),
    validTo: zod_1.z.string().datetime().optional(),
    createdAt: zod_1.z.string().datetime(),
});
// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================
const PaginatedResponseSchema = (dataSchema) => zod_1.z.object({
    data: zod_1.z.array(dataSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number().int().positive(),
        pageSize: zod_1.z.number().int().positive(),
        totalItems: zod_1.z.number().int().nonnegative(),
        totalPages: zod_1.z.number().int().nonnegative(),
    }),
});
exports.PaginatedResponseSchema = PaginatedResponseSchema;
exports.ApiErrorSchema = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
    timestamp: zod_1.z.string().datetime(),
});
