/**
 * Multi-Intelligence Fusion
 *
 * Advanced multi-INT fusion with cross-source correlation, entity resolution,
 * confidence scoring, and automated intelligence synthesis.
 */

import { z } from 'zod';

// ============================================================================
// Intelligence Disciplines
// ============================================================================

export const IntelligenceDisciplineSchema = z.enum([
  'HUMINT',    // Human Intelligence
  'SIGINT',    // Signals Intelligence
  'IMINT',     // Imagery Intelligence
  'MASINT',    // Measurement and Signature Intelligence
  'GEOINT',    // Geospatial Intelligence
  'OSINT',     // Open Source Intelligence
  'TECHINT',   // Technical Intelligence
  'CYBINT',    // Cyber Intelligence
  'FININT',    // Financial Intelligence
  'ACINT'      // Acoustic Intelligence
]);

// ============================================================================
// Intelligence Reports
// ============================================================================

export const IntelligenceReportSchema = z.object({
  id: z.string(),
  discipline: IntelligenceDisciplineSchema,
  source: z.object({
    id: z.string(),
    type: z.string(),
    reliability: z.enum(['A', 'B', 'C', 'D', 'E', 'F']), // NATO reliability scale
    credibility: z.enum(['1', '2', '3', '4', '5', '6']) // NATO credibility scale
  }),

  // Content
  title: z.string(),
  summary: z.string(),
  details: z.string(),

  // Classification
  classification: z.string(),
  caveats: z.array(z.string()),
  disseminationControls: z.array(z.string()),

  // Temporal
  reportDate: z.string(),
  informationDate: z.string(),
  expirationDate: z.string().optional(),

  // Geospatial
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    accuracy: z.number(), // meters
    name: z.string().optional()
  }).optional(),

  // Entities mentioned
  entities: z.array(z.object({
    id: z.string(),
    type: z.enum(['PERSON', 'ORGANIZATION', 'FACILITY', 'EVENT', 'EQUIPMENT']),
    name: z.string(),
    confidence: z.number() // 0-100
  })),

  // Metadata
  collectionMethod: z.string(),
  processingLevel: z.enum(['RAW', 'PROCESSED', 'ANALYZED', 'FINISHED']),
  confidence: z.number(), // 0-100
  priority: z.enum(['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']),

  // Correlation
  relatedReports: z.array(z.string()),
  contradicts: z.array(z.string()),
  confirms: z.array(z.string()),

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

// ============================================================================
// Fusion Products
// ============================================================================

export const FusedIntelligenceSchema = z.object({
  id: z.string(),
  topic: z.string(),
  summary: z.string(),

  // Source reports
  sourceReports: z.array(z.object({
    reportId: z.string(),
    discipline: IntelligenceDisciplineSchema,
    weight: z.number(), // contribution weight 0-1
    confidence: z.number()
  })),

  // Fused assessment
  assessment: z.object({
    conclusion: z.string(),
    confidence: z.number(), // 0-100
    reliability: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    analystConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),

    // Supporting evidence
    supporting: z.array(z.object({
      reportId: z.string(),
      evidence: z.string(),
      weight: z.number()
    })),

    // Contradicting evidence
    contradicting: z.array(z.object({
      reportId: z.string(),
      evidence: z.string(),
      impact: z.enum(['MAJOR', 'MODERATE', 'MINOR'])
    })),

    // Intelligence gaps
    gaps: z.array(z.string()),

    // Alternative hypotheses
    alternatives: z.array(z.object({
      hypothesis: z.string(),
      likelihood: z.number(), // 0-100
      reasoning: z.string()
    }))
  }),

  // Timeline
  timeline: z.array(z.object({
    timestamp: z.string(),
    event: z.string(),
    sourceReportIds: z.array(z.string()),
    confidence: z.number()
  })),

  // Entities involved
  entities: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    role: z.string(),
    confidence: z.number()
  })),

  // Geospatial data
  locations: z.array(z.object({
    lat: z.number(),
    lon: z.number(),
    name: z.string(),
    significance: z.string(),
    confidence: z.number()
  })),

  classification: z.string(),
  producedBy: z.string(),
  producedAt: z.string(),
  validUntil: z.string().optional(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Entity Resolution
// ============================================================================

export const EntityMentionSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  discipline: IntelligenceDisciplineSchema,

  // Entity data
  entityType: z.enum(['PERSON', 'ORGANIZATION', 'FACILITY', 'EVENT', 'EQUIPMENT', 'LOCATION']),
  name: z.string(),
  aliases: z.array(z.string()),

  attributes: z.record(z.unknown()),

  // Context
  context: z.string(),
  confidence: z.number(), // 0-100

  timestamp: z.string(),
  location: z.object({
    lat: z.number(),
    lon: z.number()
  }).optional()
});

export const ResolvedEntitySchema = z.object({
  id: z.string(),
  type: z.enum(['PERSON', 'ORGANIZATION', 'FACILITY', 'EVENT', 'EQUIPMENT', 'LOCATION']),

  // Canonical identity
  canonicalName: z.string(),
  aliases: z.array(z.string()),

  // Attributes from fusion
  attributes: z.record(z.object({
    value: z.unknown(),
    confidence: z.number(),
    sources: z.array(z.string())
  })),

  // Source mentions
  mentions: z.array(z.object({
    mentionId: z.string(),
    reportId: z.string(),
    discipline: IntelligenceDisciplineSchema,
    confidence: z.number(), // confidence in the link
    timestamp: z.string()
  })),

  // Relationships
  relationships: z.array(z.object({
    targetEntityId: z.string(),
    type: z.string(),
    confidence: z.number(),
    sources: z.array(z.string())
  })),

  // Confidence metrics
  resolutionConfidence: z.number(), // 0-100
  lastUpdated: z.string(),
  createdAt: z.string(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Correlation
// ============================================================================

export const CorrelationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),

  // Matching criteria
  criteria: z.object({
    disciplines: z.array(IntelligenceDisciplineSchema).optional(),
    entityTypes: z.array(z.string()).optional(),
    timeWindow: z.number().optional(), // hours
    spatialDistance: z.number().optional(), // km
    attributeMatches: z.array(z.object({
      attribute: z.string(),
      similarity: z.number() // 0-1
    })).optional()
  }),

  // Scoring
  scoring: z.object({
    temporalWeight: z.number(),
    spatialWeight: z.number(),
    entityWeight: z.number(),
    attributeWeight: z.number(),
    minimumScore: z.number() // 0-100
  }),

  createdAt: z.string(),
  metadata: z.record(z.unknown())
});

export const CorrelationSchema = z.object({
  id: z.string(),
  ruleId: z.string(),

  // Correlated items
  reports: z.array(z.string()),
  entities: z.array(z.string()),

  // Correlation scores
  overallScore: z.number(), // 0-100
  temporalScore: z.number(),
  spatialScore: z.number(),
  entityScore: z.number(),
  attributeScore: z.number(),

  // Correlation type
  type: z.enum([
    'CONFIRMATION',
    'CONTRADICTION',
    'ELABORATION',
    'TEMPORAL_SEQUENCE',
    'SPATIAL_PROXIMITY',
    'ENTITY_CO_OCCURRENCE'
  ]),

  confidence: z.number(), // 0-100
  analystReviewed: z.boolean(),

  createdAt: z.string(),
  metadata: z.record(z.unknown())
});

// ============================================================================
// Pattern Detection
// ============================================================================

export const PatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'TEMPORAL',
    'SPATIAL',
    'BEHAVIORAL',
    'NETWORK',
    'COMMUNICATION',
    'TRANSACTION'
  ]),

  // Pattern definition
  pattern: z.object({
    description: z.string(),
    indicators: z.array(z.object({
      type: z.string(),
      criteria: z.record(z.unknown()),
      weight: z.number()
    })),
    minimumConfidence: z.number()
  }),

  // Occurrences
  occurrences: z.array(z.object({
    id: z.string(),
    timestamp: z.string(),
    location: z.object({
      lat: z.number(),
      lon: z.number()
    }).optional(),
    entities: z.array(z.string()),
    reports: z.array(z.string()),
    confidence: z.number(),
    metadata: z.record(z.unknown())
  })),

  // Statistics
  statistics: z.object({
    totalOccurrences: z.number(),
    firstSeen: z.string(),
    lastSeen: z.string(),
    frequency: z.number(), // occurrences per day
    trend: z.enum(['INCREASING', 'STABLE', 'DECREASING'])
  }),

  significance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

// ============================================================================
// Type Exports
// ============================================================================

export type IntelligenceDiscipline = z.infer<typeof IntelligenceDisciplineSchema>;
export type IntelligenceReport = z.infer<typeof IntelligenceReportSchema>;
export type FusedIntelligence = z.infer<typeof FusedIntelligenceSchema>;
export type EntityMention = z.infer<typeof EntityMentionSchema>;
export type ResolvedEntity = z.infer<typeof ResolvedEntitySchema>;
export type CorrelationRule = z.infer<typeof CorrelationRuleSchema>;
export type Correlation = z.infer<typeof CorrelationSchema>;
export type Pattern = z.infer<typeof PatternSchema>;

// ============================================================================
// Multi-INT Fusion Service
// ============================================================================

export class MultiINTFusion {
  private reports: Map<string, IntelligenceReport> = new Map();
  private fusedProducts: Map<string, FusedIntelligence> = new Map();
  private entities: Map<string, ResolvedEntity> = new Map();
  private mentions: Map<string, EntityMention> = new Map();
  private correlations: Map<string, Correlation> = new Map();
  private patterns: Map<string, Pattern> = new Map();

  /**
   * Ingest intelligence report
   */
  ingestReport(report: IntelligenceReport): IntelligenceReport {
    const validated = IntelligenceReportSchema.parse(report);
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
  createFusedProduct(reportIds: string[], topic: string): FusedIntelligence {
    const reports = reportIds.map(id => this.reports.get(id)).filter((r): r is IntelligenceReport => r !== undefined);

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
    const entityMap = new Map<string, { count: number; confidence: number }>();
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

    const fusedProduct: FusedIntelligence = {
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

    const validated = FusedIntelligenceSchema.parse(fusedProduct);
    this.fusedProducts.set(validated.id, validated);
    return validated;
  }

  /**
   * Resolve entity from mention
   */
  private resolveEntity(entityData: any, report: IntelligenceReport): void {
    // Check for existing entity with same name
    const existing = Array.from(this.entities.values()).find(
      e => e.canonicalName === entityData.name ||
        e.aliases.includes(entityData.name)
    );

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
    } else {
      // Create new entity
      const newEntity: ResolvedEntity = {
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

      this.entities.set(newEntity.id, ResolvedEntitySchema.parse(newEntity));
    }
  }

  /**
   * Find correlations between reports
   */
  findCorrelations(options: {
    timeWindow?: number; // hours
    spatialDistance?: number; // km
    minScore?: number;
  }): Correlation[] {
    const correlations: Correlation[] = [];
    const reports = Array.from(this.reports.values());

    for (let i = 0; i < reports.length; i++) {
      for (let j = i + 1; j < reports.length; j++) {
        const r1 = reports[i];
        const r2 = reports[j];

        const score = this.calculateCorrelationScore(r1, r2, options);

        if (score.overall >= (options.minScore || 50)) {
          const correlation: Correlation = {
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

          correlations.push(CorrelationSchema.parse(correlation));
        }
      }
    }

    return correlations;
  }

  /**
   * Calculate correlation score between two reports
   */
  private calculateCorrelationScore(
    r1: IntelligenceReport,
    r2: IntelligenceReport,
    options: any
  ): {
    overall: number;
    temporal: number;
    spatial: number;
    entity: number;
    attribute: number;
  } {
    let temporal = 0;
    let spatial = 0;
    let entity = 0;
    let attribute = 0;

    // Temporal correlation
    if (options.timeWindow) {
      const timeDiff = Math.abs(
        new Date(r1.informationDate).getTime() - new Date(r2.informationDate).getTime()
      ) / (1000 * 60 * 60); // hours
      temporal = Math.max(0, 100 - (timeDiff / options.timeWindow) * 100);
    }

    // Spatial correlation
    if (options.spatialDistance && r1.location && r2.location) {
      const distance = this.calculateDistance(
        r1.location.lat,
        r1.location.lon,
        r2.location.lat,
        r2.location.lon
      );
      spatial = Math.max(0, 100 - (distance / options.spatialDistance) * 100);
    }

    // Entity correlation
    const commonEntities = r1.entities.filter(e1 =>
      r2.entities.some(e2 => e2.id === e1.id)
    );
    entity = (commonEntities.length / Math.max(r1.entities.length, r2.entities.length, 1)) * 100;

    // Overall score
    const overall = (temporal + spatial + entity + attribute) / 4;

    return { overall, temporal, spatial, entity, attribute };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get resolved entity
   */
  getEntity(id: string): ResolvedEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities
   */
  getAllEntities(): ResolvedEntity[] {
    return Array.from(this.entities.values());
  }
}
