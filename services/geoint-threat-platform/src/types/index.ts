/**
 * GEOINT Threat Analysis Platform - Core Types
 * Comprehensive types for geospatial intelligence and cyber threat fusion
 *
 * @module geoint-threat-platform
 * @description Fuses GEOINT, HUMINT, and CTI for proactive threat analysis
 */

import { z } from 'zod';
import type { GeoPoint, BoundingBox, IntelFeature } from '@intelgraph/geospatial';

// ============================================================================
// GEOINT Core Types
// ============================================================================

/**
 * 3D Terrain Types for visualization and analysis
 */
export const terrainTypeEnum = z.enum([
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

export const elevationDataSourceEnum = z.enum([
  'SRTM',
  'ASTER',
  'LIDAR',
  'PHOTOGRAMMETRY',
  'RADAR',
  'SONAR',
]);

export const satelliteProviderEnum = z.enum([
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

export const imageryTypeEnum = z.enum([
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
export const terrain3DPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number(),
  slope: z.number().min(0).max(90).optional(),
  aspect: z.number().min(0).max(360).optional(),
  roughness: z.number().min(0).max(1).optional(),
  terrainType: terrainTypeEnum.optional(),
  vegetationIndex: z.number().min(-1).max(1).optional(), // NDVI
  surfaceTemperature: z.number().optional(), // Kelvin
  soilMoisture: z.number().min(0).max(1).optional(),
  urbanDensity: z.number().min(0).max(1).optional(),
  timestamp: z.string().datetime().optional(),
  source: elevationDataSourceEnum.optional(),
  accuracy: z.number().positive().optional(), // meters
});

/**
 * Satellite Imagery Analysis Result
 */
export const satelliteAnalysisSchema = z.object({
  id: z.string(),
  imageId: z.string(),
  provider: satelliteProviderEnum,
  imageryType: imageryTypeEnum,
  captureDate: z.string().datetime(),
  bbox: z.object({
    minLon: z.number(),
    minLat: z.number(),
    maxLon: z.number(),
    maxLat: z.number(),
  }),
  resolution: z.number(), // meters per pixel
  cloudCover: z.number().min(0).max(100).optional(),
  sunAzimuth: z.number().min(0).max(360).optional(),
  sunElevation: z.number().min(0).max(90).optional(),

  // Analysis results
  detectedFeatures: z.array(z.object({
    type: z.enum([
      'BUILDING', 'VEHICLE', 'AIRCRAFT', 'VESSEL', 'ROAD',
      'BRIDGE', 'RUNWAY', 'ANTENNA', 'SOLAR_PANEL', 'MILITARY_EQUIPMENT',
      'CONSTRUCTION', 'EXCAVATION', 'CROP_FIELD', 'WATER_BODY',
    ]),
    confidence: z.number().min(0).max(1),
    geometry: z.any(), // GeoJSON geometry
    properties: z.record(z.string(), z.unknown()).optional(),
  })).default([]),

  // Change detection
  changeDetection: z.object({
    referenceImageId: z.string().optional(),
    changedAreas: z.array(z.object({
      geometry: z.any(),
      changeType: z.enum(['ADDED', 'REMOVED', 'MODIFIED']),
      confidence: z.number().min(0).max(1),
      description: z.string().optional(),
    })).default([]),
  }).optional(),

  // Anomaly detection
  anomalies: z.array(z.object({
    type: z.string(),
    location: z.object({ latitude: z.number(), longitude: z.number() }),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string(),
    confidence: z.number().min(0).max(1),
  })).default([]),

  analysisTimestamp: z.string().datetime(),
  processingDuration: z.number(), // milliseconds
  tenantId: z.string(),
});

/**
 * 3D Visualization Agent
 */
export const viz3DAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'TERRAIN_RENDERER',
    'POINT_CLOUD_PROCESSOR',
    'BUILDING_EXTRACTOR',
    'VIEWSHED_ANALYZER',
    'LINE_OF_SIGHT',
    'FLYTHROUGH_GENERATOR',
    'SHADOW_ANALYZER',
    'FLOOD_MODELER',
  ]),
  status: z.enum(['IDLE', 'PROCESSING', 'READY', 'ERROR']),
  capabilities: z.array(z.string()),
  configuration: z.object({
    maxPoints: z.number().int().positive().optional(),
    lodLevels: z.number().int().min(1).max(10).optional(),
    textureResolution: z.number().int().positive().optional(),
    cacheEnabled: z.boolean().default(true),
    gpuAccelerated: z.boolean().default(false),
  }),
  metrics: z.object({
    processedPoints: z.number().int().default(0),
    averageLatency: z.number().default(0), // ms
    cacheHitRate: z.number().min(0).max(1).default(0),
    lastProcessingTime: z.string().datetime().optional(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// Threat Actor Geospatial Types
// ============================================================================

/**
 * Geospatial Threat Actor Profile
 */
export const geoThreatActorSchema = z.object({
  id: z.string(),
  threatActorId: z.string(), // Reference to threat-actors package
  name: z.string(),
  aliases: z.array(z.string()).default([]),

  // Geospatial attribution
  attribution: z.object({
    primaryCountry: z.string().optional(),
    operatingRegions: z.array(z.string()).default([]),
    knownLocations: z.array(z.object({
      location: z.object({ latitude: z.number(), longitude: z.number() }),
      locationType: z.enum([
        'HEADQUARTERS', 'TRAINING_FACILITY', 'C2_INFRASTRUCTURE',
        'PROXY_LOCATION', 'HISTORICAL', 'SUSPECTED', 'CONFIRMED',
      ]),
      confidence: z.number().min(0).max(100),
      firstSeen: z.string().datetime().optional(),
      lastSeen: z.string().datetime().optional(),
      source: z.string().optional(),
    })).default([]),
    operationalRadius: z.number().optional(), // kilometers
  }),

  // Targeting patterns
  targetingPatterns: z.object({
    geographicFocus: z.array(z.string()).default([]), // Country codes
    sectorFocus: z.array(z.string()).default([]),
    infrastructureTargets: z.array(z.object({
      type: z.string(),
      locations: z.array(z.object({ latitude: z.number(), longitude: z.number() })),
      threatLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    })).default([]),
    movementPatterns: z.array(z.object({
      from: z.object({ latitude: z.number(), longitude: z.number() }),
      to: z.object({ latitude: z.number(), longitude: z.number() }),
      frequency: z.number().min(0).max(1),
      methodology: z.string().optional(),
    })).default([]),
  }),

  // Cyber infrastructure with geolocation
  cyberInfrastructure: z.array(z.object({
    type: z.enum(['C2_SERVER', 'PROXY', 'VPN', 'HOSTING', 'DNS', 'BULLETPROOF_HOSTING']),
    ipAddress: z.string().optional(),
    domain: z.string().optional(),
    geolocation: z.object({
      latitude: z.number(),
      longitude: z.number(),
      country: z.string().optional(),
      city: z.string().optional(),
      asn: z.string().optional(),
      isp: z.string().optional(),
    }).optional(),
    active: z.boolean().default(true),
    firstSeen: z.string().datetime(),
    lastSeen: z.string().datetime(),
    confidence: z.number().min(0).max(100),
  })).default([]),

  // Activity heatmap data
  activityHeatmap: z.object({
    cells: z.array(z.object({
      h3Index: z.string(), // H3 hexagonal index
      activityScore: z.number().min(0).max(100),
      incidentCount: z.number().int().default(0),
      lastActivity: z.string().datetime().optional(),
    })).default([]),
    resolution: z.number().int().min(0).max(15).default(7),
    generatedAt: z.string().datetime(),
  }).optional(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// IOC Management Types
// ============================================================================

export const iocTypeEnum = z.enum([
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

export const iocSchema = z.object({
  id: z.string(),
  type: iocTypeEnum,
  value: z.string(),

  // Classification
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(100),
  tlp: z.enum(['RED', 'AMBER_STRICT', 'AMBER', 'GREEN', 'WHITE', 'CLEAR']),

  // Attribution
  threatActors: z.array(z.string()).default([]),
  campaigns: z.array(z.string()).default([]),
  malwareFamilies: z.array(z.string()).default([]),

  // Context
  context: z.object({
    description: z.string().optional(),
    killChainPhase: z.string().optional(),
    mitreTechniques: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),

  // Geolocation (for applicable IOC types)
  geolocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    country: z.string().optional(),
    city: z.string().optional(),
    asn: z.string().optional(),
    isp: z.string().optional(),
    accuracy: z.number().optional(), // meters
  }).optional(),

  // Lifecycle
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().default(true),

  // Sightings
  sightings: z.number().int().default(0),
  lastSightingLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),

  // Sources
  sources: z.array(z.object({
    name: z.string(),
    feedId: z.string().optional(),
    url: z.string().url().optional(),
    confidence: z.number().min(0).max(100),
    reportedAt: z.string().datetime(),
  })).default([]),

  // Related IOCs
  relatedIOCs: z.array(z.object({
    iocId: z.string(),
    relationshipType: z.enum([
      'RESOLVES_TO', 'HOSTS', 'DROPS', 'COMMUNICATES_WITH',
      'VARIANT_OF', 'ASSOCIATED_WITH', 'SUPERSEDES',
    ]),
    confidence: z.number().min(0).max(100),
  })).default([]),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// HUMINT/CTI Fusion Types
// ============================================================================

export const intelligenceSourceTypeEnum = z.enum([
  'HUMINT',
  'SIGINT',
  'OSINT',
  'GEOINT',
  'MASINT',
  'TECHINT',
  'FININT',
  'CYBERINT',
]);

export const intelligenceReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  classification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
  tlp: z.enum(['RED', 'AMBER_STRICT', 'AMBER', 'GREEN', 'WHITE', 'CLEAR']),

  // Source information
  sources: z.array(z.object({
    type: intelligenceSourceTypeEnum,
    sourceId: z.string().optional(),
    reliability: z.enum(['A', 'B', 'C', 'D', 'E', 'F']), // NATO reliability scale
    credibility: z.number().min(1).max(6), // NATO credibility scale
    description: z.string().optional(),
  })),

  // Content
  summary: z.string(),
  content: z.string(),
  keyFindings: z.array(z.string()).default([]),

  // Entities mentioned
  entities: z.array(z.object({
    type: z.enum([
      'PERSON', 'ORGANIZATION', 'LOCATION', 'EVENT', 'THREAT_ACTOR',
      'MALWARE', 'CAMPAIGN', 'INFRASTRUCTURE', 'VULNERABILITY',
    ]),
    name: z.string(),
    confidence: z.number().min(0).max(100),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })).default([]),

  // Geospatial references
  locations: z.array(z.object({
    name: z.string(),
    coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
    relevance: z.enum(['PRIMARY', 'SECONDARY', 'MENTIONED']),
    context: z.string().optional(),
  })).default([]),

  // Temporal information
  reportDate: z.string().datetime(),
  eventDate: z.string().datetime().optional(),
  eventDateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),

  // Analysis
  assessment: z.object({
    threatLevel: z.enum(['NONE', 'LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE']),
    confidence: z.number().min(0).max(100),
    analystNotes: z.string().optional(),
    disseminationRestrictions: z.array(z.string()).default([]),
  }),

  // Related intelligence
  relatedReports: z.array(z.string()).default([]),
  relatedIOCs: z.array(z.string()).default([]),
  relatedThreatActors: z.array(z.string()).default([]),

  tenantId: z.string(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Intelligence Fusion Result
 */
export const fusionResultSchema = z.object({
  id: z.string(),
  fusionType: z.enum([
    'GEOINT_CTI',
    'HUMINT_OSINT',
    'MULTI_INT',
    'PATTERN_CORRELATION',
    'TIMELINE_ANALYSIS',
    'NETWORK_ANALYSIS',
  ]),

  // Input sources
  inputSources: z.array(z.object({
    type: intelligenceSourceTypeEnum,
    sourceIds: z.array(z.string()),
    weight: z.number().min(0).max(1).default(1),
  })),

  // Fusion output
  correlations: z.array(z.object({
    type: z.string(),
    entities: z.array(z.string()),
    confidence: z.number().min(0).max(100),
    evidence: z.array(z.string()),
    geospatialContext: z.object({
      location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
      region: z.string().optional(),
      proximity: z.number().optional(), // meters
    }).optional(),
  })).default([]),

  // Key insights
  insights: z.array(z.object({
    title: z.string(),
    description: z.string(),
    importance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    actionable: z.boolean(),
    recommendedActions: z.array(z.string()).default([]),
  })).default([]),

  // Threat assessment
  threatAssessment: z.object({
    overallThreat: z.number().min(0).max(100),
    threatVector: z.string().optional(),
    potentialTargets: z.array(z.string()).default([]),
    timelineEstimate: z.string().optional(),
    mitigationPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  }),

  // Geospatial summary
  geospatialSummary: z.object({
    affectedRegions: z.array(z.string()).default([]),
    threatHeatmap: z.array(z.object({
      h3Index: z.string(),
      threatScore: z.number().min(0).max(100),
    })).default([]),
    criticalInfrastructureAtRisk: z.array(z.object({
      name: z.string(),
      type: z.string(),
      location: z.object({ latitude: z.number(), longitude: z.number() }),
      riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    })).default([]),
  }),

  // Processing metadata
  processingTime: z.number(), // milliseconds
  confidence: z.number().min(0).max(100),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
});

// ============================================================================
// Edge Query Optimization Types
// ============================================================================

export const queryOptimizationHintSchema = z.object({
  queryId: z.string(),
  queryType: z.enum([
    'SPATIAL_RANGE',
    'NEAREST_NEIGHBOR',
    'PATH_FINDING',
    'CLUSTER_DETECTION',
    'PATTERN_MATCH',
    'TEMPORAL_RANGE',
    'AGGREGATION',
  ]),

  // Index hints
  suggestedIndexes: z.array(z.object({
    indexType: z.enum(['SPATIAL', 'BTREE', 'HASH', 'FULLTEXT', 'VECTOR']),
    fields: z.array(z.string()),
    estimatedSpeedup: z.number(),
  })).default([]),

  // Caching strategy
  cacheStrategy: z.object({
    cacheable: z.boolean(),
    ttlSeconds: z.number().int().optional(),
    cacheKey: z.string().optional(),
    invalidationTriggers: z.array(z.string()).default([]),
  }),

  // Query plan
  estimatedCost: z.number(),
  estimatedRows: z.number().int(),
  actualLatencyP50: z.number().optional(),
  actualLatencyP95: z.number().optional(),
  actualLatencyP99: z.number().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type TerrainType = z.infer<typeof terrainTypeEnum>;
export type ElevationDataSource = z.infer<typeof elevationDataSourceEnum>;
export type SatelliteProvider = z.infer<typeof satelliteProviderEnum>;
export type ImageryType = z.infer<typeof imageryTypeEnum>;
export type Terrain3DPoint = z.infer<typeof terrain3DPointSchema>;
export type SatelliteAnalysis = z.infer<typeof satelliteAnalysisSchema>;
export type Viz3DAgent = z.infer<typeof viz3DAgentSchema>;
export type GeoThreatActor = z.infer<typeof geoThreatActorSchema>;
export type IOCType = z.infer<typeof iocTypeEnum>;
export type IOC = z.infer<typeof iocSchema>;
export type IntelligenceSourceType = z.infer<typeof intelligenceSourceTypeEnum>;
export type IntelligenceReport = z.infer<typeof intelligenceReportSchema>;
export type FusionResult = z.infer<typeof fusionResultSchema>;
export type QueryOptimizationHint = z.infer<typeof queryOptimizationHintSchema>;
