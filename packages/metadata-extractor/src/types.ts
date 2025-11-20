import { z } from 'zod';

/**
 * Core metadata types and schemas for the metadata extraction platform
 */

// Base metadata schema that all metadata types extend
export const BaseMetadataSchema = z.object({
  extractedAt: z.date(),
  extractorVersion: z.string(),
  sourceFile: z.string().optional(),
  sourceType: z.string(),
  confidence: z.number().min(0).max(1).default(1.0),
  rawMetadata: z.record(z.any()).optional(),
});

export type BaseMetadata = z.infer<typeof BaseMetadataSchema>;

// Temporal metadata for timeline analysis
export const TemporalMetadataSchema = z.object({
  created: z.date().optional(),
  modified: z.date().optional(),
  accessed: z.date().optional(),
  deleted: z.date().optional(),
  timezone: z.string().optional(),
  clockSkew: z.number().optional(), // milliseconds
  sequenceNumber: z.number().optional(),
});

export type TemporalMetadata = z.infer<typeof TemporalMetadataSchema>;

// Attribution metadata for forensic analysis
export const AttributionMetadataSchema = z.object({
  author: z.string().optional(),
  lastModifiedBy: z.string().optional(),
  organization: z.string().optional(),
  softwareName: z.string().optional(),
  softwareVersion: z.string().optional(),
  template: z.string().optional(),
  revision: z.number().optional(),
  editors: z.array(z.string()).optional(),
});

export type AttributionMetadata = z.infer<typeof AttributionMetadataSchema>;

// Geolocation metadata
export const GeolocationMetadataSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  source: z.enum(['gps', 'cell', 'wifi', 'ip', 'manual', 'exif', 'landmark']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
});

export type GeolocationMetadata = z.infer<typeof GeolocationMetadataSchema>;

// Device metadata
export const DeviceMetadataSchema = z.object({
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  imei: z.string().optional(),
  imsi: z.string().optional(),
  macAddress: z.string().optional(),
  bluetoothAddress: z.string().optional(),
  operatingSystem: z.string().optional(),
  osVersion: z.string().optional(),
  deviceId: z.string().optional(),
});

export type DeviceMetadata = z.infer<typeof DeviceMetadataSchema>;

// Hash metadata for deduplication and integrity
export const HashMetadataSchema = z.object({
  md5: z.string().optional(),
  sha1: z.string().optional(),
  sha256: z.string().optional(),
  sha512: z.string().optional(),
  ssdeep: z.string().optional(), // Fuzzy hash for similarity
  fileSize: z.number().optional(),
});

export type HashMetadata = z.infer<typeof HashMetadataSchema>;

// Extraction result with metadata and enrichment
export const ExtractionResultSchema = z.object({
  id: z.string(),
  base: BaseMetadataSchema,
  temporal: TemporalMetadataSchema.optional(),
  attribution: AttributionMetadataSchema.optional(),
  geolocation: GeolocationMetadataSchema.optional(),
  device: DeviceMetadataSchema.optional(),
  hash: HashMetadataSchema.optional(),
  enrichments: z.record(z.any()).optional(),
  relationships: z.array(z.object({
    type: z.string(),
    targetId: z.string(),
    confidence: z.number(),
  })).optional(),
  anomalies: z.array(z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    evidence: z.any(),
  })).optional(),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// Extractor configuration
export const ExtractorConfigSchema = z.object({
  deepScan: z.boolean().default(false),
  extractDeleted: z.boolean().default(false),
  extractHidden: z.boolean().default(true),
  extractEmbedded: z.boolean().default(true),
  detectSteganography: z.boolean().default(false),
  detectTampering: z.boolean().default(true),
  generateHashes: z.boolean().default(true),
  enrichFromExternal: z.boolean().default(false),
  maxFileSize: z.number().default(100 * 1024 * 1024), // 100MB
  timeout: z.number().default(30000), // 30 seconds
});

export type ExtractorConfig = z.infer<typeof ExtractorConfigSchema>;

// Base extractor interface
export interface IMetadataExtractor {
  readonly name: string;
  readonly supportedTypes: string[];

  canExtract(file: string | Buffer, mimeType?: string): boolean;
  extract(file: string | Buffer, config?: Partial<ExtractorConfig>): Promise<ExtractionResult>;
}

// Enricher interface for adding intelligence to metadata
export interface IMetadataEnricher {
  readonly name: string;

  canEnrich(metadata: ExtractionResult): boolean;
  enrich(metadata: ExtractionResult): Promise<ExtractionResult>;
}

// Analyzer interface for cross-artifact analysis
export interface IMetadataAnalyzer {
  readonly name: string;

  analyze(results: ExtractionResult[]): Promise<AnalysisReport>;
}

// Analysis report
export const AnalysisReportSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  artifacts: z.number(),
  insights: z.array(z.object({
    type: z.string(),
    confidence: z.number(),
    description: z.string(),
    evidence: z.array(z.string()), // IDs of related artifacts
    severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
  })),
  timeline: z.array(z.object({
    timestamp: z.date(),
    artifactId: z.string(),
    event: z.string(),
    source: z.string(),
  })).optional(),
  relationships: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.string(),
    confidence: z.number(),
    evidence: z.string(),
  })).optional(),
  attributions: z.array(z.object({
    entity: z.string(),
    role: z.enum(['author', 'editor', 'sender', 'recipient', 'device_owner', 'software']),
    confidence: z.number(),
    artifacts: z.array(z.string()),
  })).optional(),
});

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;
