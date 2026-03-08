"use strict";
// @ts-nocheck
/**
 * Multi-Intelligence Fusion
 *
 * Advanced multi-INT fusion with cross-source correlation, entity resolution,
 * confidence scoring, and automated intelligence synthesis.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiINTFusion = exports.PatternSchema = exports.CorrelationSchema = exports.CorrelationRuleSchema = exports.ResolvedEntitySchema = exports.EntityMentionSchema = exports.FusedIntelligenceSchema = exports.IntelligenceReportSchema = exports.IntelligenceDisciplineSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Intelligence Disciplines
// ============================================================================
exports.IntelligenceDisciplineSchema = zod_1.z.enum([
    'HUMINT', // Human Intelligence
    'SIGINT', // Signals Intelligence
    'IMINT', // Imagery Intelligence
    'MASINT', // Measurement and Signature Intelligence
    'GEOINT', // Geospatial Intelligence
    'OSINT', // Open Source Intelligence
    'TECHINT', // Technical Intelligence
    'CYBINT', // Cyber Intelligence
    'FININT', // Financial Intelligence
    'ACINT' // Acoustic Intelligence
]);
// ============================================================================
// Intelligence Reports
// ============================================================================
exports.IntelligenceReportSchema = zod_1.z.object({
    id: zod_1.z.string(),
    discipline: exports.IntelligenceDisciplineSchema,
    source: zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        reliability: zod_1.z.enum(['A', 'B', 'C', 'D', 'E', 'F']), // NATO reliability scale
        credibility: zod_1.z.enum(['1', '2', '3', '4', '5', '6']) // NATO credibility scale
    }),
    // Content
    title: zod_1.z.string(),
    summary: zod_1.z.string(),
    details: zod_1.z.string(),
    // Classification
    classification: zod_1.z.string(),
    caveats: zod_1.z.array(zod_1.z.string()),
    disseminationControls: zod_1.z.array(zod_1.z.string()),
    // Temporal
    reportDate: zod_1.z.string(),
    informationDate: zod_1.z.string(),
    expirationDate: zod_1.z.string().optional(),
    // Geospatial
    location: zod_1.z.object({
        lat: zod_1.z.number(),
        lon: zod_1.z.number(),
        accuracy: zod_1.z.number(), // meters
        name: zod_1.z.string().optional()
    }).optional(),
    // Entities mentioned
    entities: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.enum(['PERSON', 'ORGANIZATION', 'FACILITY', 'EVENT', 'EQUIPMENT']),
        name: zod_1.z.string(),
        confidence: zod_1.z.number() // 0-100
    })),
    // Metadata
    collectionMethod: zod_1.z.string(),
    processingLevel: zod_1.z.enum(['RAW', 'PROCESSED', 'ANALYZED', 'FINISHED']),
    confidence: zod_1.z.number(), // 0-100
    priority: zod_1.z.enum(['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']),
    // Correlation
    relatedReports: zod_1.z.array(zod_1.z.string()),
    contradicts: zod_1.z.array(zod_1.z.string()),
    confirms: zod_1.z.array(zod_1.z.string()),
    metadata: zod_1.z.record(zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
// ============================================================================
// Fusion Products
// ============================================================================
exports.FusedIntelligenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    topic: zod_1.z.string(),
    summary: zod_1.z.string(),
    // Source reports
    sourceReports: zod_1.z.array(zod_1.z.object({
        reportId: zod_1.z.string(),
        discipline: exports.IntelligenceDisciplineSchema,
        weight: zod_1.z.number(), // contribution weight 0-1
        confidence: zod_1.z.number()
    })),
    // Fused assessment
    assessment: zod_1.z.object({
        conclusion: zod_1.z.string(),
        confidence: zod_1.z.number(), // 0-100
        reliability: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        analystConfidence: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        // Supporting evidence
        supporting: zod_1.z.array(zod_1.z.object({
            reportId: zod_1.z.string(),
            evidence: zod_1.z.string(),
            weight: zod_1.z.number()
        })),
        // Contradicting evidence
        contradicting: zod_1.z.array(zod_1.z.object({
            reportId: zod_1.z.string(),
            evidence: zod_1.z.string(),
            impact: zod_1.z.enum(['MAJOR', 'MODERATE', 'MINOR'])
        })),
        // Intelligence gaps
        gaps: zod_1.z.array(zod_1.z.string()),
        // Alternative hypotheses
        alternatives: zod_1.z.array(zod_1.z.object({
            hypothesis: zod_1.z.string(),
            likelihood: zod_1.z.number(), // 0-100
            reasoning: zod_1.z.string()
        }))
    }),
    // Timeline
    timeline: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string(),
        event: zod_1.z.string(),
        sourceReportIds: zod_1.z.array(zod_1.z.string()),
        confidence: zod_1.z.number()
    })),
    // Entities involved
    entities: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        name: zod_1.z.string(),
        role: zod_1.z.string(),
        confidence: zod_1.z.number()
    })),
    // Geospatial data
    locations: zod_1.z.array(zod_1.z.object({
        lat: zod_1.z.number(),
        lon: zod_1.z.number(),
        name: zod_1.z.string(),
        significance: zod_1.z.string(),
        confidence: zod_1.z.number()
    })),
    classification: zod_1.z.string(),
    producedBy: zod_1.z.string(),
    producedAt: zod_1.z.string(),
    validUntil: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Entity Resolution
// ============================================================================
exports.EntityMentionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    reportId: zod_1.z.string(),
    discipline: exports.IntelligenceDisciplineSchema,
    // Entity data
    entityType: zod_1.z.enum(['PERSON', 'ORGANIZATION', 'FACILITY', 'EVENT', 'EQUIPMENT', 'LOCATION']),
    name: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()),
    attributes: zod_1.z.record(zod_1.z.unknown()),
    // Context
    context: zod_1.z.string(),
    confidence: zod_1.z.number(), // 0-100
    timestamp: zod_1.z.string(),
    location: zod_1.z.object({
        lat: zod_1.z.number(),
        lon: zod_1.z.number()
    }).optional()
});
exports.ResolvedEntitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['PERSON', 'ORGANIZATION', 'FACILITY', 'EVENT', 'EQUIPMENT', 'LOCATION']),
    // Canonical identity
    canonicalName: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()),
    // Attributes from fusion
    attributes: zod_1.z.record(zod_1.z.object({
        value: zod_1.z.unknown(),
        confidence: zod_1.z.number(),
        sources: zod_1.z.array(zod_1.z.string())
    })),
    // Source mentions
    mentions: zod_1.z.array(zod_1.z.object({
        mentionId: zod_1.z.string(),
        reportId: zod_1.z.string(),
        discipline: exports.IntelligenceDisciplineSchema,
        confidence: zod_1.z.number(), // confidence in the link
        timestamp: zod_1.z.string()
    })),
    // Relationships
    relationships: zod_1.z.array(zod_1.z.object({
        targetEntityId: zod_1.z.string(),
        type: zod_1.z.string(),
        confidence: zod_1.z.number(),
        sources: zod_1.z.array(zod_1.z.string())
    })),
    // Confidence metrics
    resolutionConfidence: zod_1.z.number(), // 0-100
    lastUpdated: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Correlation
// ============================================================================
exports.CorrelationRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    enabled: zod_1.z.boolean(),
    // Matching criteria
    criteria: zod_1.z.object({
        disciplines: zod_1.z.array(exports.IntelligenceDisciplineSchema).optional(),
        entityTypes: zod_1.z.array(zod_1.z.string()).optional(),
        timeWindow: zod_1.z.number().optional(), // hours
        spatialDistance: zod_1.z.number().optional(), // km
        attributeMatches: zod_1.z.array(zod_1.z.object({
            attribute: zod_1.z.string(),
            similarity: zod_1.z.number() // 0-1
        })).optional()
    }),
    // Scoring
    scoring: zod_1.z.object({
        temporalWeight: zod_1.z.number(),
        spatialWeight: zod_1.z.number(),
        entityWeight: zod_1.z.number(),
        attributeWeight: zod_1.z.number(),
        minimumScore: zod_1.z.number() // 0-100
    }),
    createdAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
exports.CorrelationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    ruleId: zod_1.z.string(),
    // Correlated items
    reports: zod_1.z.array(zod_1.z.string()),
    entities: zod_1.z.array(zod_1.z.string()),
    // Correlation scores
    overallScore: zod_1.z.number(), // 0-100
    temporalScore: zod_1.z.number(),
    spatialScore: zod_1.z.number(),
    entityScore: zod_1.z.number(),
    attributeScore: zod_1.z.number(),
    // Correlation type
    type: zod_1.z.enum([
        'CONFIRMATION',
        'CONTRADICTION',
        'ELABORATION',
        'TEMPORAL_SEQUENCE',
        'SPATIAL_PROXIMITY',
        'ENTITY_CO_OCCURRENCE'
    ]),
    confidence: zod_1.z.number(), // 0-100
    analystReviewed: zod_1.z.boolean(),
    createdAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Pattern Detection
// ============================================================================
exports.PatternSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum([
        'TEMPORAL',
        'SPATIAL',
        'BEHAVIORAL',
        'NETWORK',
        'COMMUNICATION',
        'TRANSACTION'
    ]),
    // Pattern definition
    pattern: zod_1.z.object({
        description: zod_1.z.string(),
        indicators: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            criteria: zod_1.z.record(zod_1.z.unknown()),
            weight: zod_1.z.number()
        })),
        minimumConfidence: zod_1.z.number()
    }),
    // Occurrences
    occurrences: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        timestamp: zod_1.z.string(),
        location: zod_1.z.object({
            lat: zod_1.z.number(),
            lon: zod_1.z.number()
        }).optional(),
        entities: zod_1.z.array(zod_1.z.string()),
        reports: zod_1.z.array(zod_1.z.string()),
        confidence: zod_1.z.number(),
        metadata: zod_1.z.record(zod_1.z.unknown())
    })),
    // Statistics
    statistics: zod_1.z.object({
        totalOccurrences: zod_1.z.number(),
        firstSeen: zod_1.z.string(),
        lastSeen: zod_1.z.string(),
        frequency: zod_1.z.number(), // occurrences per day
        trend: zod_1.z.enum(['INCREASING', 'STABLE', 'DECREASING'])
    }),
    significance: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    metadata: zod_1.z.record(zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
// ============================================================================
// Multi-INT Fusion Service
// ============================================================================
class MultiINTFusion {
    reports = new Map();
    fusedProducts = new Map();
    entities = new Map();
    mentions = new Map();
    correlations = new Map();
    patterns = new Map();
    /**
     * Ingest intelligence report
     */
    ingestReport(report) {
        const validated = exports.IntelligenceReportSchema.parse(report);
        this.reports.set(validated.id, validated);
        // Extract and resolve entities
        for (const entity of validated.entities) {
            this.resolveEntity(entity, validated);
        }
        return validated;
    }
    /**
     * Create fused intelligence product
     */
    createFusedProduct(reportIds, topic) {
        const reports = reportIds.map(id => this.reports.get(id)).filter((r) => r !== undefined);
        if (reports.length === 0) {
            throw new Error('No valid reports found');
        }
        // Calculate confidence based on source reliability
        const avgConfidence = reports.reduce((sum, r) => sum + r.confidence, 0) / reports.length;
        // Build source reports array
        const sourceReports = reports.map(r => ({
            reportId: r.id,
            discipline: r.discipline,
            weight: 1 / reports.length,
            confidence: r.confidence
        }));
        // Aggregate entities
        const entityMap = new Map();
        for (const report of reports) {
            for (const entity of report.entities) {
                const existing = entityMap.get(entity.id) || { count: 0, confidence: 0 };
                entityMap.set(entity.id, {
                    count: existing.count + 1,
                    confidence: existing.confidence + entity.confidence
                });
            }
        }
        const entities = Array.from(entityMap.entries()).map(([id, data]) => {
            const entity = reports.flatMap(r => r.entities).find(e => e.id === id);
            return {
                id,
                type: entity?.type || 'PERSON',
                name: entity?.name || '',
                role: '',
                confidence: data.confidence / data.count
            };
        });
        const fusedProduct = {
            id: `fused-${Date.now()}`,
            topic,
            summary: `Fused intelligence from ${reports.length} sources`,
            sourceReports,
            assessment: {
                conclusion: '',
                confidence: avgConfidence,
                reliability: avgConfidence > 75 ? 'HIGH' : avgConfidence > 50 ? 'MEDIUM' : 'LOW',
                analystConfidence: 'MEDIUM',
                supporting: [],
                contradicting: [],
                gaps: [],
                alternatives: []
            },
            timeline: [],
            entities,
            locations: [],
            classification: 'SECRET',
            producedBy: 'system',
            producedAt: new Date().toISOString(),
            metadata: {}
        };
        const validated = exports.FusedIntelligenceSchema.parse(fusedProduct);
        this.fusedProducts.set(validated.id, validated);
        return validated;
    }
    /**
     * Resolve entity from mention
     */
    resolveEntity(entityData, report) {
        // Check for existing entity with same name
        const existing = Array.from(this.entities.values()).find(e => e.canonicalName === entityData.name ||
            e.aliases.includes(entityData.name));
        if (existing) {
            // Add mention to existing entity
            existing.mentions.push({
                mentionId: `mention-${Date.now()}`,
                reportId: report.id,
                discipline: report.discipline,
                confidence: entityData.confidence,
                timestamp: report.reportDate
            });
            existing.lastUpdated = new Date().toISOString();
        }
        else {
            // Create new entity
            const newEntity = {
                id: entityData.id,
                type: entityData.type,
                canonicalName: entityData.name,
                aliases: [],
                attributes: {},
                mentions: [{
                        mentionId: `mention-${Date.now()}`,
                        reportId: report.id,
                        discipline: report.discipline,
                        confidence: entityData.confidence,
                        timestamp: report.reportDate
                    }],
                relationships: [],
                resolutionConfidence: entityData.confidence,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                metadata: {}
            };
            this.entities.set(newEntity.id, exports.ResolvedEntitySchema.parse(newEntity));
        }
    }
    /**
     * Find correlations between reports
     */
    findCorrelations(options) {
        const correlations = [];
        const reports = Array.from(this.reports.values());
        for (let i = 0; i < reports.length; i++) {
            for (let j = i + 1; j < reports.length; j++) {
                const r1 = reports[i];
                const r2 = reports[j];
                const score = this.calculateCorrelationScore(r1, r2, options);
                if (score.overall >= (options.minScore || 50)) {
                    const correlation = {
                        id: `corr-${Date.now()}-${i}-${j}`,
                        ruleId: 'default',
                        reports: [r1.id, r2.id],
                        entities: [],
                        overallScore: score.overall,
                        temporalScore: score.temporal,
                        spatialScore: score.spatial,
                        entityScore: score.entity,
                        attributeScore: score.attribute,
                        type: 'CONFIRMATION',
                        confidence: score.overall,
                        analystReviewed: false,
                        createdAt: new Date().toISOString(),
                        metadata: {}
                    };
                    correlations.push(exports.CorrelationSchema.parse(correlation));
                }
            }
        }
        return correlations;
    }
    /**
     * Calculate correlation score between two reports
     */
    calculateCorrelationScore(r1, r2, options) {
        let temporal = 0;
        let spatial = 0;
        let entity = 0;
        const attribute = 0;
        // Temporal correlation
        if (options.timeWindow) {
            const timeDiff = Math.abs(new Date(r1.informationDate).getTime() - new Date(r2.informationDate).getTime()) / (1000 * 60 * 60); // hours
            temporal = Math.max(0, 100 - (timeDiff / options.timeWindow) * 100);
        }
        // Spatial correlation
        if (options.spatialDistance && r1.location && r2.location) {
            const distance = this.calculateDistance(r1.location.lat, r1.location.lon, r2.location.lat, r2.location.lon);
            spatial = Math.max(0, 100 - (distance / options.spatialDistance) * 100);
        }
        // Entity correlation
        const commonEntities = r1.entities.filter(e1 => r2.entities.some(e2 => e2.id === e1.id));
        entity = (commonEntities.length / Math.max(r1.entities.length, r2.entities.length, 1)) * 100;
        // Overall score
        const overall = (temporal + spatial + entity + attribute) / 4;
        return { overall, temporal, spatial, entity, attribute };
    }
    /**
     * Calculate distance between two points
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
                Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Get resolved entity
     */
    getEntity(id) {
        return this.entities.get(id);
    }
    /**
     * Get all entities
     */
    getAllEntities() {
        return Array.from(this.entities.values());
    }
}
exports.MultiINTFusion = MultiINTFusion;
