"use strict";
/**
 * GEOINT Threat Analysis Platform - Core Types
 * Comprehensive types for geospatial intelligence and cyber threat fusion
 *
 * @module geoint-threat-platform
 * @description Fuses GEOINT, HUMINT, and CTI for proactive threat analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryOptimizationHintSchema = exports.fusionResultSchema = exports.intelligenceReportSchema = exports.intelligenceSourceTypeEnum = exports.iocSchema = exports.iocTypeEnum = exports.geoThreatActorSchema = exports.viz3DAgentSchema = exports.satelliteAnalysisSchema = exports.terrain3DPointSchema = exports.imageryTypeEnum = exports.satelliteProviderEnum = exports.elevationDataSourceEnum = exports.terrainTypeEnum = void 0;
const zod_1 = require("zod");
// ============================================================================
// GEOINT Core Types
// ============================================================================
/**
 * 3D Terrain Types for visualization and analysis
 */
exports.terrainTypeEnum = zod_1.z.enum([
    'URBAN',
    'SUBURBAN',
    'RURAL',
    'MOUNTAINOUS',
    'COASTAL',
    'DESERT',
    'FOREST',
    'WETLAND',
    'ARCTIC',
    'INDUSTRIAL',
]);
exports.elevationDataSourceEnum = zod_1.z.enum([
    'SRTM',
    'ASTER',
    'LIDAR',
    'PHOTOGRAMMETRY',
    'RADAR',
    'SONAR',
]);
exports.satelliteProviderEnum = zod_1.z.enum([
    'MAXAR',
    'PLANET',
    'AIRBUS',
    'BLACKSKY',
    'CAPELLA',
    'ICEYE',
    'SENTINEL',
    'LANDSAT',
    'CUSTOM',
]);
exports.imageryTypeEnum = zod_1.z.enum([
    'OPTICAL',
    'SAR',
    'MULTISPECTRAL',
    'HYPERSPECTRAL',
    'THERMAL',
    'RADAR',
    'LIDAR',
]);
/**
 * 3D Terrain Point with extended attributes
 */
exports.terrain3DPointSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    elevation: zod_1.z.number(),
    slope: zod_1.z.number().min(0).max(90).optional(),
    aspect: zod_1.z.number().min(0).max(360).optional(),
    roughness: zod_1.z.number().min(0).max(1).optional(),
    terrainType: exports.terrainTypeEnum.optional(),
    vegetationIndex: zod_1.z.number().min(-1).max(1).optional(), // NDVI
    surfaceTemperature: zod_1.z.number().optional(), // Kelvin
    soilMoisture: zod_1.z.number().min(0).max(1).optional(),
    urbanDensity: zod_1.z.number().min(0).max(1).optional(),
    timestamp: zod_1.z.string().datetime().optional(),
    source: exports.elevationDataSourceEnum.optional(),
    accuracy: zod_1.z.number().positive().optional(), // meters
});
/**
 * Satellite Imagery Analysis Result
 */
exports.satelliteAnalysisSchema = zod_1.z.object({
    id: zod_1.z.string(),
    imageId: zod_1.z.string(),
    provider: exports.satelliteProviderEnum,
    imageryType: exports.imageryTypeEnum,
    captureDate: zod_1.z.string().datetime(),
    bbox: zod_1.z.object({
        minLon: zod_1.z.number(),
        minLat: zod_1.z.number(),
        maxLon: zod_1.z.number(),
        maxLat: zod_1.z.number(),
    }),
    resolution: zod_1.z.number(), // meters per pixel
    cloudCover: zod_1.z.number().min(0).max(100).optional(),
    sunAzimuth: zod_1.z.number().min(0).max(360).optional(),
    sunElevation: zod_1.z.number().min(0).max(90).optional(),
    // Analysis results
    detectedFeatures: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
            'BUILDING', 'VEHICLE', 'AIRCRAFT', 'VESSEL', 'ROAD',
            'BRIDGE', 'RUNWAY', 'ANTENNA', 'SOLAR_PANEL', 'MILITARY_EQUIPMENT',
            'CONSTRUCTION', 'EXCAVATION', 'CROP_FIELD', 'WATER_BODY',
        ]),
        confidence: zod_1.z.number().min(0).max(1),
        geometry: zod_1.z.any(), // GeoJSON geometry
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    })).default([]),
    // Change detection
    changeDetection: zod_1.z.object({
        referenceImageId: zod_1.z.string().optional(),
        changedAreas: zod_1.z.array(zod_1.z.object({
            geometry: zod_1.z.any(),
            changeType: zod_1.z.enum(['ADDED', 'REMOVED', 'MODIFIED']),
            confidence: zod_1.z.number().min(0).max(1),
            description: zod_1.z.string().optional(),
        })).default([]),
    }).optional(),
    // Anomaly detection
    anomalies: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        location: zod_1.z.object({ latitude: zod_1.z.number(), longitude: zod_1.z.number() }),
        severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        description: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
    })).default([]),
    analysisTimestamp: zod_1.z.string().datetime(),
    processingDuration: zod_1.z.number(), // milliseconds
    tenantId: zod_1.z.string(),
});
/**
 * 3D Visualization Agent
 */
exports.viz3DAgentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum([
        'TERRAIN_RENDERER',
        'POINT_CLOUD_PROCESSOR',
        'BUILDING_EXTRACTOR',
        'VIEWSHED_ANALYZER',
        'LINE_OF_SIGHT',
        'FLYTHROUGH_GENERATOR',
        'SHADOW_ANALYZER',
        'FLOOD_MODELER',
    ]),
    status: zod_1.z.enum(['IDLE', 'PROCESSING', 'READY', 'ERROR']),
    capabilities: zod_1.z.array(zod_1.z.string()),
    configuration: zod_1.z.object({
        maxPoints: zod_1.z.number().int().positive().optional(),
        lodLevels: zod_1.z.number().int().min(1).max(10).optional(),
        textureResolution: zod_1.z.number().int().positive().optional(),
        cacheEnabled: zod_1.z.boolean().default(true),
        gpuAccelerated: zod_1.z.boolean().default(false),
    }),
    metrics: zod_1.z.object({
        processedPoints: zod_1.z.number().int().default(0),
        averageLatency: zod_1.z.number().default(0), // ms
        cacheHitRate: zod_1.z.number().min(0).max(1).default(0),
        lastProcessingTime: zod_1.z.string().datetime().optional(),
    }),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// Threat Actor Geospatial Types
// ============================================================================
/**
 * Geospatial Threat Actor Profile
 */
exports.geoThreatActorSchema = zod_1.z.object({
    id: zod_1.z.string(),
    threatActorId: zod_1.z.string(), // Reference to threat-actors package
    name: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()).default([]),
    // Geospatial attribution
    attribution: zod_1.z.object({
        primaryCountry: zod_1.z.string().optional(),
        operatingRegions: zod_1.z.array(zod_1.z.string()).default([]),
        knownLocations: zod_1.z.array(zod_1.z.object({
            location: zod_1.z.object({ latitude: zod_1.z.number(), longitude: zod_1.z.number() }),
            locationType: zod_1.z.enum([
                'HEADQUARTERS', 'TRAINING_FACILITY', 'C2_INFRASTRUCTURE',
                'PROXY_LOCATION', 'HISTORICAL', 'SUSPECTED', 'CONFIRMED',
            ]),
            confidence: zod_1.z.number().min(0).max(100),
            firstSeen: zod_1.z.string().datetime().optional(),
            lastSeen: zod_1.z.string().datetime().optional(),
            source: zod_1.z.string().optional(),
        })).default([]),
        operationalRadius: zod_1.z.number().optional(), // kilometers
    }),
    // Targeting patterns
    targetingPatterns: zod_1.z.object({
        geographicFocus: zod_1.z.array(zod_1.z.string()).default([]), // Country codes
        sectorFocus: zod_1.z.array(zod_1.z.string()).default([]),
        infrastructureTargets: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            locations: zod_1.z.array(zod_1.z.object({ latitude: zod_1.z.number(), longitude: zod_1.z.number() })),
            threatLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        })).default([]),
        movementPatterns: zod_1.z.array(zod_1.z.object({
            from: zod_1.z.object({ latitude: zod_1.z.number(), longitude: zod_1.z.number() }),
            to: zod_1.z.object({ latitude: zod_1.z.number(), longitude: zod_1.z.number() }),
            frequency: zod_1.z.number().min(0).max(1),
            methodology: zod_1.z.string().optional(),
        })).default([]),
    }),
    // Cyber infrastructure with geolocation
    cyberInfrastructure: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['C2_SERVER', 'PROXY', 'VPN', 'HOSTING', 'DNS', 'BULLETPROOF_HOSTING']),
        ipAddress: zod_1.z.string().optional(),
        domain: zod_1.z.string().optional(),
        geolocation: zod_1.z.object({
            latitude: zod_1.z.number(),
            longitude: zod_1.z.number(),
            country: zod_1.z.string().optional(),
            city: zod_1.z.string().optional(),
            asn: zod_1.z.string().optional(),
            isp: zod_1.z.string().optional(),
        }).optional(),
        active: zod_1.z.boolean().default(true),
        firstSeen: zod_1.z.string().datetime(),
        lastSeen: zod_1.z.string().datetime(),
        confidence: zod_1.z.number().min(0).max(100),
    })).default([]),
    // Activity heatmap data
    activityHeatmap: zod_1.z.object({
        cells: zod_1.z.array(zod_1.z.object({
            h3Index: zod_1.z.string(), // H3 hexagonal index
            activityScore: zod_1.z.number().min(0).max(100),
            incidentCount: zod_1.z.number().int().default(0),
            lastActivity: zod_1.z.string().datetime().optional(),
        })).default([]),
        resolution: zod_1.z.number().int().min(0).max(15).default(7),
        generatedAt: zod_1.z.string().datetime(),
    }).optional(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// IOC Management Types
// ============================================================================
exports.iocTypeEnum = zod_1.z.enum([
    'IP_ADDRESS',
    'DOMAIN',
    'URL',
    'EMAIL',
    'FILE_HASH_MD5',
    'FILE_HASH_SHA1',
    'FILE_HASH_SHA256',
    'FILE_NAME',
    'FILE_PATH',
    'REGISTRY_KEY',
    'MUTEX',
    'USER_AGENT',
    'CERTIFICATE',
    'CVE',
    'YARA_RULE',
    'SNORT_RULE',
    'BITCOIN_ADDRESS',
    'PHONE_NUMBER',
    'GEOLOCATION',
]);
exports.iocSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.iocTypeEnum,
    value: zod_1.z.string(),
    // Classification
    severity: zod_1.z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    confidence: zod_1.z.number().min(0).max(100),
    tlp: zod_1.z.enum(['RED', 'AMBER_STRICT', 'AMBER', 'GREEN', 'WHITE', 'CLEAR']),
    // Attribution
    threatActors: zod_1.z.array(zod_1.z.string()).default([]),
    campaigns: zod_1.z.array(zod_1.z.string()).default([]),
    malwareFamilies: zod_1.z.array(zod_1.z.string()).default([]),
    // Context
    context: zod_1.z.object({
        description: zod_1.z.string().optional(),
        killChainPhase: zod_1.z.string().optional(),
        mitreTechniques: zod_1.z.array(zod_1.z.string()).default([]),
        tags: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    // Geolocation (for applicable IOC types)
    geolocation: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        country: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        asn: zod_1.z.string().optional(),
        isp: zod_1.z.string().optional(),
        accuracy: zod_1.z.number().optional(), // meters
    }).optional(),
    // Lifecycle
    firstSeen: zod_1.z.string().datetime(),
    lastSeen: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
    active: zod_1.z.boolean().default(true),
    // Sightings
    sightings: zod_1.z.number().int().default(0),
    lastSightingLocation: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }).optional(),
    // Sources
    sources: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        feedId: zod_1.z.string().optional(),
        url: zod_1.z.string().url().optional(),
        confidence: zod_1.z.number().min(0).max(100),
        reportedAt: zod_1.z.string().datetime(),
    })).default([]),
    // Related IOCs
    relatedIOCs: zod_1.z.array(zod_1.z.object({
        iocId: zod_1.z.string(),
        relationshipType: zod_1.z.enum([
            'RESOLVES_TO', 'HOSTS', 'DROPS', 'COMMUNICATES_WITH',
            'VARIANT_OF', 'ASSOCIATED_WITH', 'SUPERSEDES',
        ]),
        confidence: zod_1.z.number().min(0).max(100),
    })).default([]),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// HUMINT/CTI Fusion Types
// ============================================================================
exports.intelligenceSourceTypeEnum = zod_1.z.enum([
    'HUMINT',
    'SIGINT',
    'OSINT',
    'GEOINT',
    'MASINT',
    'TECHINT',
    'FININT',
    'CYBERINT',
]);
exports.intelligenceReportSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    classification: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
    tlp: zod_1.z.enum(['RED', 'AMBER_STRICT', 'AMBER', 'GREEN', 'WHITE', 'CLEAR']),
    // Source information
    sources: zod_1.z.array(zod_1.z.object({
        type: exports.intelligenceSourceTypeEnum,
        sourceId: zod_1.z.string().optional(),
        reliability: zod_1.z.enum(['A', 'B', 'C', 'D', 'E', 'F']), // NATO reliability scale
        credibility: zod_1.z.number().min(1).max(6), // NATO credibility scale
        description: zod_1.z.string().optional(),
    })),
    // Content
    summary: zod_1.z.string(),
    content: zod_1.z.string(),
    keyFindings: zod_1.z.array(zod_1.z.string()).default([]),
    // Entities mentioned
    entities: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
            'PERSON', 'ORGANIZATION', 'LOCATION', 'EVENT', 'THREAT_ACTOR',
            'MALWARE', 'CAMPAIGN', 'INFRASTRUCTURE', 'VULNERABILITY',
        ]),
        name: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(100),
        attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    })).default([]),
    // Geospatial references
    locations: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        coordinates: zod_1.z.object({ latitude: zod_1.z.number(), longitude: zod_1.z.number() }),
        relevance: zod_1.z.enum(['PRIMARY', 'SECONDARY', 'MENTIONED']),
        context: zod_1.z.string().optional(),
    })).default([]),
    // Temporal information
    reportDate: zod_1.z.string().datetime(),
    eventDate: zod_1.z.string().datetime().optional(),
    eventDateRange: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    }).optional(),
    // Analysis
    assessment: zod_1.z.object({
        threatLevel: zod_1.z.enum(['NONE', 'LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE']),
        confidence: zod_1.z.number().min(0).max(100),
        analystNotes: zod_1.z.string().optional(),
        disseminationRestrictions: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    // Related intelligence
    relatedReports: zod_1.z.array(zod_1.z.string()).default([]),
    relatedIOCs: zod_1.z.array(zod_1.z.string()).default([]),
    relatedThreatActors: zod_1.z.array(zod_1.z.string()).default([]),
    tenantId: zod_1.z.string(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Intelligence Fusion Result
 */
exports.fusionResultSchema = zod_1.z.object({
    id: zod_1.z.string(),
    fusionType: zod_1.z.enum([
        'GEOINT_CTI',
        'HUMINT_OSINT',
        'MULTI_INT',
        'PATTERN_CORRELATION',
        'TIMELINE_ANALYSIS',
        'NETWORK_ANALYSIS',
    ]),
    // Input sources
    inputSources: zod_1.z.array(zod_1.z.object({
        type: exports.intelligenceSourceTypeEnum,
        sourceIds: zod_1.z.array(zod_1.z.string()),
        weight: zod_1.z.number().min(0).max(1).default(1),
    })),
    // Fusion output
    correlations: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        entities: zod_1.z.array(zod_1.z.string()),
        confidence: zod_1.z.number().min(0).max(100),
        evidence: zod_1.z.array(zod_1.z.string()),
        geospatialContext: zod_1.z.object({
            location: zod_1.z.object({ latitude: zod_1.z.number(), longitude: zod_1.z.number() }).optional(),
            region: zod_1.z.string().optional(),
            proximity: zod_1.z.number().optional(), // meters
        }).optional(),
    })).default([]),
    // Key insights
    insights: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        importance: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        actionable: zod_1.z.boolean(),
        recommendedActions: zod_1.z.array(zod_1.z.string()).default([]),
    })).default([]),
    // Threat assessment
    threatAssessment: zod_1.z.object({
        overallThreat: zod_1.z.number().min(0).max(100),
        threatVector: zod_1.z.string().optional(),
        potentialTargets: zod_1.z.array(zod_1.z.string()).default([]),
        timelineEstimate: zod_1.z.string().optional(),
        mitigationPriority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    }),
    // Geospatial summary
    geospatialSummary: zod_1.z.object({
        affectedRegions: zod_1.z.array(zod_1.z.string()).default([]),
        threatHeatmap: zod_1.z.array(zod_1.z.object({
            h3Index: zod_1.z.string(),
            threatScore: zod_1.z.number().min(0).max(100),
        })).default([]),
        criticalInfrastructureAtRisk: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            type: zod_1.z.string(),
            location: zod_1.z.object({ latitude: zod_1.z.number(), longitude: zod_1.z.number() }),
            riskLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        })).default([]),
    }),
    // Processing metadata
    processingTime: zod_1.z.number(), // milliseconds
    confidence: zod_1.z.number().min(0).max(100),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// ============================================================================
// Edge Query Optimization Types
// ============================================================================
exports.queryOptimizationHintSchema = zod_1.z.object({
    queryId: zod_1.z.string(),
    queryType: zod_1.z.enum([
        'SPATIAL_RANGE',
        'NEAREST_NEIGHBOR',
        'PATH_FINDING',
        'CLUSTER_DETECTION',
        'PATTERN_MATCH',
        'TEMPORAL_RANGE',
        'AGGREGATION',
    ]),
    // Index hints
    suggestedIndexes: zod_1.z.array(zod_1.z.object({
        indexType: zod_1.z.enum(['SPATIAL', 'BTREE', 'HASH', 'FULLTEXT', 'VECTOR']),
        fields: zod_1.z.array(zod_1.z.string()),
        estimatedSpeedup: zod_1.z.number(),
    })).default([]),
    // Caching strategy
    cacheStrategy: zod_1.z.object({
        cacheable: zod_1.z.boolean(),
        ttlSeconds: zod_1.z.number().int().optional(),
        cacheKey: zod_1.z.string().optional(),
        invalidationTriggers: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    // Query plan
    estimatedCost: zod_1.z.number(),
    estimatedRows: zod_1.z.number().int(),
    actualLatencyP50: zod_1.z.number().optional(),
    actualLatencyP95: zod_1.z.number().optional(),
    actualLatencyP99: zod_1.z.number().optional(),
});
