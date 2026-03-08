"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractSchema = exports.VendorAssessmentSchema = exports.SupplyChainMetricsSchema = exports.DisruptionPredictionSchema = exports.AlertSchema = exports.IncidentSchema = exports.IncidentTypeSchema = exports.CertificationSchema = exports.ComplianceStatusSchema = exports.ComplianceRequirementSchema = exports.CarrierPerformanceSchema = exports.ShipmentSchema = exports.ShipmentStatusSchema = exports.ComponentInventorySchema = exports.BillOfMaterialsSchema = exports.ComponentSchema = exports.ESGScoreSchema = exports.CybersecurityPostureSchema = exports.FinancialHealthMetricsSchema = exports.RiskAssessmentSchema = exports.RiskLevelSchema = exports.RiskCategorySchema = exports.SupplyChainRelationshipSchema = exports.SupplyChainNodeSchema = exports.GeographicLocationSchema = exports.SupplyChainNodeTypeSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Core Supply Chain Entity Types
// ============================================================================
exports.SupplyChainNodeTypeSchema = zod_1.z.enum([
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
exports.GeographicLocationSchema = zod_1.z.object({
    country: zod_1.z.string(),
    region: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    timezone: zod_1.z.string().optional(),
});
exports.SupplyChainNodeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.SupplyChainNodeTypeSchema,
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    location: exports.GeographicLocationSchema.optional(),
    tier: zod_1.z.number().int().min(1), // Tier 1 = direct suppliers, Tier 2+= sub-suppliers
    status: zod_1.z.enum(['active', 'inactive', 'under-review', 'suspended']),
    criticality: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.SupplyChainRelationshipSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceNodeId: zod_1.z.string().uuid(),
    targetNodeId: zod_1.z.string().uuid(),
    relationshipType: zod_1.z.enum([
        'supplies',
        'manufactures',
        'distributes',
        'transports',
        'warehouses',
        'processes',
    ]),
    materialFlow: zod_1.z.array(zod_1.z.string()).optional(), // Materials/components flowing
    strength: zod_1.z.number().min(0).max(1), // Relationship strength score
    volume: zod_1.z.number().optional(), // Transaction volume
    leadTimeDays: zod_1.z.number().optional(),
    cost: zod_1.z.number().optional(),
    currency: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// ============================================================================
// Risk Assessment Types
// ============================================================================
exports.RiskCategorySchema = zod_1.z.enum([
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
exports.RiskLevelSchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.RiskAssessmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    nodeId: zod_1.z.string().uuid(),
    category: exports.RiskCategorySchema,
    level: exports.RiskLevelSchema,
    score: zod_1.z.number().min(0).max(100),
    indicators: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        value: zod_1.z.any(),
        impact: zod_1.z.enum(['positive', 'negative', 'neutral']),
    })),
    mitigations: zod_1.z.array(zod_1.z.string()).optional(),
    assessedAt: zod_1.z.date(),
    assessedBy: zod_1.z.string().optional(),
    validUntil: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.FinancialHealthMetricsSchema = zod_1.z.object({
    nodeId: zod_1.z.string().uuid(),
    revenue: zod_1.z.number().optional(),
    profitMargin: zod_1.z.number().optional(),
    debtToEquity: zod_1.z.number().optional(),
    currentRatio: zod_1.z.number().optional(),
    creditRating: zod_1.z.string().optional(),
    cashFlow: zod_1.z.number().optional(),
    bankruptcyRisk: zod_1.z.number().min(0).max(1).optional(),
    assessedAt: zod_1.z.date(),
});
exports.CybersecurityPostureSchema = zod_1.z.object({
    nodeId: zod_1.z.string().uuid(),
    securityScore: zod_1.z.number().min(0).max(100),
    certifications: zod_1.z.array(zod_1.z.string()),
    vulnerabilities: zod_1.z.object({
        critical: zod_1.z.number(),
        high: zod_1.z.number(),
        medium: zod_1.z.number(),
        low: zod_1.z.number(),
    }),
    incidentHistory: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        type: zod_1.z.string(),
        severity: exports.RiskLevelSchema,
        resolved: zod_1.z.boolean(),
    })),
    lastAssessed: zod_1.z.date(),
});
exports.ESGScoreSchema = zod_1.z.object({
    nodeId: zod_1.z.string().uuid(),
    overallScore: zod_1.z.number().min(0).max(100),
    environmentalScore: zod_1.z.number().min(0).max(100),
    socialScore: zod_1.z.number().min(0).max(100),
    governanceScore: zod_1.z.number().min(0).max(100),
    certifications: zod_1.z.array(zod_1.z.string()),
    violations: zod_1.z.array(zod_1.z.object({
        category: zod_1.z.string(),
        description: zod_1.z.string(),
        date: zod_1.z.date(),
        severity: exports.RiskLevelSchema,
    })),
    lastAssessed: zod_1.z.date(),
});
// ============================================================================
// Component and Material Tracking
// ============================================================================
exports.ComponentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    partNumber: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string(),
    manufacturer: zod_1.z.string().optional(),
    suppliers: zod_1.z.array(zod_1.z.string().uuid()),
    specifications: zod_1.z.record(zod_1.z.any()).optional(),
    isCritical: zod_1.z.boolean(),
    isControlled: zod_1.z.boolean(), // Export controlled
    isConflictMineral: zod_1.z.boolean(),
    leadTimeDays: zod_1.z.number().optional(),
    minimumOrderQuantity: zod_1.z.number().optional(),
    unitCost: zod_1.z.number().optional(),
    currency: zod_1.z.string().optional(),
    alternativeComponents: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    obsolescenceRisk: zod_1.z.enum(['low', 'medium', 'high']),
    certifications: zod_1.z.array(zod_1.z.string()).optional(),
    serialized: zod_1.z.boolean(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.BillOfMaterialsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    productId: zod_1.z.string(),
    productName: zod_1.z.string(),
    version: zod_1.z.string(),
    items: zod_1.z.array(zod_1.z.object({
        componentId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number(),
        unit: zod_1.z.string(),
        isOptional: zod_1.z.boolean(),
        alternatives: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    })),
    totalCost: zod_1.z.number().optional(),
    currency: zod_1.z.string().optional(),
    validFrom: zod_1.z.date(),
    validUntil: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.ComponentInventorySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    componentId: zod_1.z.string().uuid(),
    locationId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number(),
    unit: zod_1.z.string(),
    reorderPoint: zod_1.z.number().optional(),
    maxStock: zod_1.z.number().optional(),
    lastRestocked: zod_1.z.date().optional(),
    expirationDate: zod_1.z.date().optional(),
    batchNumber: zod_1.z.string().optional(),
    serialNumbers: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['available', 'reserved', 'in-transit', 'quarantined', 'expired']),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    updatedAt: zod_1.z.date(),
});
// ============================================================================
// Logistics and Transportation
// ============================================================================
exports.ShipmentStatusSchema = zod_1.z.enum([
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
exports.ShipmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    trackingNumber: zod_1.z.string(),
    orderReference: zod_1.z.string().optional(),
    origin: exports.GeographicLocationSchema,
    destination: exports.GeographicLocationSchema,
    carrier: zod_1.z.string(),
    transportMode: zod_1.z.enum(['air', 'sea', 'rail', 'road', 'multimodal']),
    status: exports.ShipmentStatusSchema,
    currentLocation: exports.GeographicLocationSchema.optional(),
    contents: zod_1.z.array(zod_1.z.object({
        componentId: zod_1.z.string().uuid().optional(),
        description: zod_1.z.string(),
        quantity: zod_1.z.number(),
        value: zod_1.z.number().optional(),
    })),
    estimatedDeparture: zod_1.z.date().optional(),
    actualDeparture: zod_1.z.date().optional(),
    estimatedArrival: zod_1.z.date(),
    actualArrival: zod_1.z.date().optional(),
    milestones: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.date(),
        location: exports.GeographicLocationSchema,
        event: zod_1.z.string(),
        status: exports.ShipmentStatusSchema,
    })),
    temperature: zod_1.z.object({
        min: zod_1.z.number(),
        max: zod_1.z.number(),
        current: zod_1.z.number().optional(),
        unit: zod_1.z.string(),
    }).optional(),
    alerts: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.date(),
        type: zod_1.z.string(),
        severity: exports.RiskLevelSchema,
        message: zod_1.z.string(),
    })).optional(),
    insurance: zod_1.z.object({
        provider: zod_1.z.string(),
        policyNumber: zod_1.z.string(),
        coverage: zod_1.z.number(),
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.CarrierPerformanceSchema = zod_1.z.object({
    carrierId: zod_1.z.string(),
    carrierName: zod_1.z.string(),
    period: zod_1.z.object({
        start: zod_1.z.date(),
        end: zod_1.z.date(),
    }),
    metrics: zod_1.z.object({
        onTimeDeliveryRate: zod_1.z.number().min(0).max(1),
        damageRate: zod_1.z.number().min(0).max(1),
        lossRate: zod_1.z.number().min(0).max(1),
        averageDelayDays: zod_1.z.number(),
        totalShipments: zod_1.z.number(),
        successfulDeliveries: zod_1.z.number(),
    }),
    score: zod_1.z.number().min(0).max(100),
    lastUpdated: zod_1.z.date(),
});
// ============================================================================
// Compliance and Regulatory
// ============================================================================
exports.ComplianceRequirementSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    category: zod_1.z.enum([
        'export-control',
        'sanctions',
        'conflict-minerals',
        'environmental',
        'labor',
        'product-safety',
        'trade',
        'industry-specific',
    ]),
    jurisdiction: zod_1.z.string(),
    description: zod_1.z.string(),
    requirementText: zod_1.z.string().optional(),
    applicableNodeTypes: zod_1.z.array(exports.SupplyChainNodeTypeSchema),
    effectiveDate: zod_1.z.date(),
    expirationDate: zod_1.z.date().optional(),
    mandatoryCertifications: zod_1.z.array(zod_1.z.string()).optional(),
    penalties: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.ComplianceStatusSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    nodeId: zod_1.z.string().uuid(),
    requirementId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['compliant', 'non-compliant', 'under-review', 'exempted', 'not-applicable']),
    lastAssessedAt: zod_1.z.date(),
    assessedBy: zod_1.z.string().optional(),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        documentUrl: zod_1.z.string().optional(),
        uploadedAt: zod_1.z.date(),
    })).optional(),
    findings: zod_1.z.array(zod_1.z.object({
        severity: exports.RiskLevelSchema,
        description: zod_1.z.string(),
        remediation: zod_1.z.string().optional(),
    })).optional(),
    nextAssessmentDue: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.CertificationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    nodeId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    type: zod_1.z.string(),
    issuingAuthority: zod_1.z.string(),
    certificateNumber: zod_1.z.string(),
    issuedDate: zod_1.z.date(),
    expirationDate: zod_1.z.date().optional(),
    scope: zod_1.z.string().optional(),
    documentUrl: zod_1.z.string().optional(),
    status: zod_1.z.enum(['valid', 'expired', 'suspended', 'revoked']),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// ============================================================================
// Incident and Event Management
// ============================================================================
exports.IncidentTypeSchema = zod_1.z.enum([
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
exports.IncidentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.IncidentTypeSchema,
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    severity: exports.RiskLevelSchema,
    status: zod_1.z.enum(['open', 'investigating', 'mitigating', 'resolved', 'closed']),
    affectedNodes: zod_1.z.array(zod_1.z.string().uuid()),
    affectedComponents: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    affectedShipments: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    impact: zod_1.z.object({
        financial: zod_1.z.number().optional(),
        operational: zod_1.z.string().optional(),
        reputational: zod_1.z.string().optional(),
        estimatedRecoveryDays: zod_1.z.number().optional(),
    }),
    detectedAt: zod_1.z.date(),
    reportedAt: zod_1.z.date(),
    reportedBy: zod_1.z.string().optional(),
    resolvedAt: zod_1.z.date().optional(),
    rootCause: zod_1.z.string().optional(),
    mitigationActions: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        assignedTo: zod_1.z.string().optional(),
        status: zod_1.z.enum(['pending', 'in-progress', 'completed']),
        completedAt: zod_1.z.date().optional(),
    })),
    lessonsLearned: zod_1.z.string().optional(),
    preventiveMeasures: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.AlertSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string(),
    severity: exports.RiskLevelSchema,
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    source: zod_1.z.string(),
    affectedEntities: zod_1.z.array(zod_1.z.string().uuid()),
    triggeredAt: zod_1.z.date(),
    acknowledgedAt: zod_1.z.date().optional(),
    acknowledgedBy: zod_1.z.string().optional(),
    resolvedAt: zod_1.z.date().optional(),
    actionRequired: zod_1.z.boolean(),
    recommendedActions: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// ============================================================================
// Analytics and Forecasting
// ============================================================================
exports.DisruptionPredictionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    nodeId: zod_1.z.string().uuid().optional(),
    componentId: zod_1.z.string().uuid().optional(),
    predictionType: zod_1.z.enum(['supply-shortage', 'quality-issue', 'delay', 'price-spike', 'capacity-constraint']),
    probability: zod_1.z.number().min(0).max(1),
    confidence: zod_1.z.number().min(0).max(1),
    expectedImpact: exports.RiskLevelSchema,
    timeframe: zod_1.z.object({
        start: zod_1.z.date(),
        end: zod_1.z.date(),
    }),
    factors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        contribution: zod_1.z.number(),
    })),
    recommendations: zod_1.z.array(zod_1.z.string()),
    generatedAt: zod_1.z.date(),
    modelVersion: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.SupplyChainMetricsSchema = zod_1.z.object({
    period: zod_1.z.object({
        start: zod_1.z.date(),
        end: zod_1.z.date(),
    }),
    metrics: zod_1.z.object({
        totalNodes: zod_1.z.number(),
        totalRelationships: zod_1.z.number(),
        averageTier: zod_1.z.number(),
        criticalNodes: zod_1.z.number(),
        highRiskNodes: zod_1.z.number(),
        averageRiskScore: zod_1.z.number().min(0).max(100),
        onTimeDeliveryRate: zod_1.z.number().min(0).max(1),
        qualityIncidentRate: zod_1.z.number(),
        averageLeadTime: zod_1.z.number(),
        supplyChainResilience: zod_1.z.number().min(0).max(100),
        diversificationScore: zod_1.z.number().min(0).max(100),
        complianceRate: zod_1.z.number().min(0).max(1),
        totalIncidents: zod_1.z.number(),
        resolvedIncidents: zod_1.z.number(),
    }),
    trends: zod_1.z.object({
        riskTrend: zod_1.z.enum(['improving', 'stable', 'deteriorating']),
        costTrend: zod_1.z.enum(['increasing', 'stable', 'decreasing']),
        performanceTrend: zod_1.z.enum(['improving', 'stable', 'deteriorating']),
    }).optional(),
    generatedAt: zod_1.z.date(),
});
// ============================================================================
// Third-Party and Vendor Management
// ============================================================================
exports.VendorAssessmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    vendorId: zod_1.z.string().uuid(),
    assessmentType: zod_1.z.enum(['initial-onboarding', 'periodic-review', 'incident-triggered', 'contract-renewal']),
    overallScore: zod_1.z.number().min(0).max(100),
    categories: zod_1.z.object({
        financial: zod_1.z.number().min(0).max(100),
        cybersecurity: zod_1.z.number().min(0).max(100),
        operational: zod_1.z.number().min(0).max(100),
        compliance: zod_1.z.number().min(0).max(100),
        esg: zod_1.z.number().min(0).max(100),
    }),
    recommendation: zod_1.z.enum(['approve', 'approve-with-conditions', 'reject', 'monitor', 'terminate']),
    conditions: zod_1.z.array(zod_1.z.string()).optional(),
    assessor: zod_1.z.string().optional(),
    assessmentDate: zod_1.z.date(),
    nextAssessmentDue: zod_1.z.date().optional(),
    findings: zod_1.z.array(zod_1.z.object({
        category: zod_1.z.string(),
        finding: zod_1.z.string(),
        severity: exports.RiskLevelSchema,
        recommendation: zod_1.z.string().optional(),
    })),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.ContractSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    vendorId: zod_1.z.string().uuid(),
    contractNumber: zod_1.z.string(),
    type: zod_1.z.enum(['supply', 'service', 'logistics', 'manufacturing']),
    status: zod_1.z.enum(['draft', 'active', 'expired', 'terminated', 'renewed']),
    effectiveDate: zod_1.z.date(),
    expirationDate: zod_1.z.date().optional(),
    autoRenewal: zod_1.z.boolean(),
    value: zod_1.z.number().optional(),
    currency: zod_1.z.string().optional(),
    sla: zod_1.z.object({
        deliveryTimeDays: zod_1.z.number().optional(),
        qualityTargets: zod_1.z.record(zod_1.z.number()).optional(),
        performanceMetrics: zod_1.z.record(zod_1.z.number()).optional(),
        penalties: zod_1.z.array(zod_1.z.object({
            breach: zod_1.z.string(),
            penalty: zod_1.z.string(),
        })).optional(),
    }).optional(),
    terminationClauses: zod_1.z.array(zod_1.z.string()).optional(),
    complianceRequirements: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
