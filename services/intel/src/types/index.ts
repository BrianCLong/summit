/**
 * SIGINT/MASINT Intelligence Types
 *
 * Type definitions for spectrum analysis, sensor fusion, and
 * intelligence correlation against ODNI intelligence gaps.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { z } from 'zod';

// ============================================================================
// SIGINT Spectrum Analysis Types
// ============================================================================

/**
 * RF spectrum band classifications per ITU Radio Regulations
 */
export type SpectrumBand =
  | 'VLF' // 3-30 kHz
  | 'LF' // 30-300 kHz
  | 'MF' // 300 kHz - 3 MHz
  | 'HF' // 3-30 MHz
  | 'VHF' // 30-300 MHz
  | 'UHF' // 300 MHz - 3 GHz
  | 'SHF' // 3-30 GHz
  | 'EHF' // 30-300 GHz
  | 'THF'; // 300 GHz - 3 THz

/**
 * Modulation type classifications
 */
export type ModulationType =
  | 'AM'
  | 'FM'
  | 'PM'
  | 'ASK'
  | 'FSK'
  | 'PSK'
  | 'QAM'
  | 'OFDM'
  | 'CDMA'
  | 'FHSS'
  | 'DSSS'
  | 'CHIRP'
  | 'UNKNOWN';

/**
 * Signal classification confidence levels
 */
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CONFIRMED';

/**
 * Raw spectrum sample data
 */
export interface SpectrumSample {
  timestamp: Date;
  frequencyHz: number;
  bandwidthHz: number;
  powerDbm: number;
  noiseFloorDbm: number;
  sensorId: string;
  geolocation?: GeoLocation;
  metadata?: Record<string, unknown>;
}

/**
 * Processed waveform characteristics
 */
export interface WaveformCharacteristics {
  id: string;
  centerFrequencyHz: number;
  bandwidthHz: number;
  modulationType: ModulationType;
  modulationIndex?: number;
  symbolRateBaud?: number;
  pulseWidthUs?: number;
  pulseRepetitionHz?: number;
  dutyCycle?: number;
  polarization?: 'H' | 'V' | 'RHCP' | 'LHCP' | 'DUAL';
  spectralPeaks: SpectralPeak[];
  harmonics: number[];
  sidebandOffset?: number;
  confidence: ConfidenceLevel;
}

/**
 * Spectral peak information for FFT analysis
 */
export interface SpectralPeak {
  frequencyHz: number;
  magnitudeDb: number;
  phaseRadians?: number;
  bandwidth3dBHz: number;
}

/**
 * Signal of Interest (SOI) detection result
 */
export interface SignalOfInterest {
  id: string;
  waveform: WaveformCharacteristics;
  firstSeenAt: Date;
  lastSeenAt: Date;
  occurrenceCount: number;
  averageDurationMs: number;
  detectionLocations: GeoLocation[];
  threatAssessment: ThreatAssessment;
  matchedSignatures: SignatureMatch[];
  correlatedEntities: string[]; // Neo4j entity IDs
  odniGapReferences: string[]; // ODNI intelligence gap identifiers
}

/**
 * Geographic location with uncertainty
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitudeM?: number;
  accuracyM: number;
  timestamp: Date;
  source: 'GPS' | 'TDOA' | 'AOA' | 'FDOA' | 'HYBRID' | 'ESTIMATED';
}

// ============================================================================
// MASINT Sensor Fusion Types
// ============================================================================

/**
 * MASINT sensor modalities
 */
export type SensorModality =
  | 'RADAR' // Radio Detection and Ranging
  | 'ELECTRO_OPTICAL' // EO/IR sensors
  | 'INFRARED' // Thermal imaging
  | 'ACOUSTIC' // Sound detection
  | 'SEISMIC' // Ground vibration
  | 'MAGNETIC' // MAD sensors
  | 'NUCLEAR' // RADIAC
  | 'CHEMICAL' // CBRN detection
  | 'MULTISPECTRAL' // Multi-band imaging
  | 'HYPERSPECTRAL' // Continuous spectrum
  | 'LIDAR' // Light Detection and Ranging
  | 'SAR'; // Synthetic Aperture Radar

/**
 * Individual sensor reading
 */
export interface SensorReading {
  id: string;
  sensorId: string;
  modality: SensorModality;
  timestamp: Date;
  value: number | number[] | Float64Array;
  unit: string;
  qualityScore: number; // 0-1
  geolocation?: GeoLocation;
  bearing?: number; // degrees from north
  range?: number; // meters
  metadata?: Record<string, unknown>;
}

/**
 * Fused sensor track
 */
export interface FusedTrack {
  id: string;
  trackNumber: number;
  classification: TrackClassification;
  state: TrackState;
  kinematicState: KinematicState;
  contributingSensors: string[];
  fusionConfidence: number; // 0-1
  firstDetectionAt: Date;
  lastUpdateAt: Date;
  predictedPosition?: GeoLocation;
  predictionTimeMs: number;
  associatedSignals: string[]; // SOI IDs
  correlatedEntities: string[]; // Neo4j entity IDs
}

/**
 * Track classification hierarchy
 */
export interface TrackClassification {
  domain: 'AIR' | 'SURFACE' | 'SUBSURFACE' | 'SPACE' | 'GROUND' | 'UNKNOWN';
  category: string; // e.g., 'AIRCRAFT', 'VEHICLE', 'VESSEL'
  type?: string; // e.g., 'FIGHTER', 'TRANSPORT'
  platform?: string; // Specific platform ID if known
  confidence: ConfidenceLevel;
  alternateClassifications?: Array<{
    classification: string;
    probability: number;
  }>;
}

/**
 * Track lifecycle state
 */
export type TrackState =
  | 'TENTATIVE' // Initial detection
  | 'CONFIRMED' // Multiple correlations
  | 'COASTING' // Predicted without updates
  | 'DROPPED' // Lost track
  | 'MERGED'; // Merged with another track

/**
 * Kinematic state vector
 */
export interface KinematicState {
  position: GeoLocation;
  velocityMps: { x: number; y: number; z: number };
  accelerationMps2?: { x: number; y: number; z: number };
  headingDeg: number;
  speedMps: number;
  climbRateMps?: number;
  turnRateDegPs?: number;
  covariance?: number[][]; // State uncertainty matrix
}

// ============================================================================
// Signature Matching Types
// ============================================================================

/**
 * Signal signature database entry
 */
export interface SignalSignature {
  id: string;
  name: string;
  description?: string;
  category: 'EMITTER' | 'PLATFORM' | 'PROTOCOL' | 'WAVEFORM';
  waveformTemplate: Partial<WaveformCharacteristics>;
  spectralFingerprint?: number[]; // Normalized FFT bins
  timingPatterns?: TimingPattern[];
  associatedPlatforms?: string[];
  associatedThreatLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  classification?: string; // Security classification
  source: string;
  lastUpdatedAt: Date;
  validFrom?: Date;
  validTo?: Date;
}

/**
 * Timing pattern for pulse/burst analysis
 */
export interface TimingPattern {
  name: string;
  intervalMs: number;
  toleranceMs: number;
  burstCount?: number;
  burstIntervalMs?: number;
}

/**
 * Result of signature matching
 */
export interface SignatureMatch {
  signatureId: string;
  signatureName: string;
  matchScore: number; // 0-1
  matchedFeatures: string[];
  unmatchedFeatures: string[];
  confidence: ConfidenceLevel;
  timestamp: Date;
}

// ============================================================================
// Threat Assessment Types
// ============================================================================

/**
 * Threat assessment for detected signals/tracks
 */
export interface ThreatAssessment {
  level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  indicators: ThreatIndicator[];
  recommendedActions: string[];
  assessedAt: Date;
  assessedBy: string; // Agent or analyst ID
  expiresAt?: Date;
}

/**
 * Individual threat indicator
 */
export interface ThreatIndicator {
  type: string;
  description: string;
  weight: number; // 0-1 contribution to threat level
  source: 'SIGINT' | 'MASINT' | 'OSINT' | 'CTI' | 'HUMINT' | 'GEOINT';
  evidenceIds: string[];
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Real-time alert for significant detections
 */
export interface IntelAlert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  source: 'SIGINT' | 'MASINT' | 'FUSION' | 'CORRELATION';
  relatedEntityIds: string[];
  relatedSignalIds: string[];
  relatedTrackIds: string[];
  odniGapReferences: string[];
  geolocation?: GeoLocation;
  timestamp: Date;
  expiresAt?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  metadata?: Record<string, unknown>;
}

export type AlertType =
  | 'NEW_SIGNAL'
  | 'SIGNAL_CHANGE'
  | 'NEW_TRACK'
  | 'TRACK_MANEUVER'
  | 'SIGNATURE_MATCH'
  | 'THREAT_DETECTED'
  | 'CORRELATION_FOUND'
  | 'ODNI_GAP_HIT'
  | 'ANOMALY_DETECTED'
  | 'PATTERN_MATCH';

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'FLASH';

// ============================================================================
// OSINT/CTI Integration Types
// ============================================================================

/**
 * OSINT data source feed
 */
export interface OsintFeed {
  id: string;
  name: string;
  type: 'RSS' | 'API' | 'STREAM' | 'FILE';
  url: string;
  enabled: boolean;
  pollingIntervalMs: number;
  lastPolledAt?: Date;
  lastSuccessAt?: Date;
  errorCount: number;
}

/**
 * OSINT indicator for correlation
 */
export interface OsintIndicator {
  id: string;
  feedId: string;
  type:
    | 'IP'
    | 'DOMAIN'
    | 'HASH'
    | 'URL'
    | 'EMAIL'
    | 'PHONE'
    | 'LOCATION'
    | 'FREQUENCY'
    | 'CALLSIGN';
  value: string;
  context?: string;
  confidence: ConfidenceLevel;
  firstSeenAt: Date;
  lastSeenAt: Date;
  tags: string[];
  relatedIndicators: string[];
}

/**
 * Cyber Threat Intelligence (CTI) entry
 */
export interface CtiEntry {
  id: string;
  source: string;
  threatActorId?: string;
  campaignId?: string;
  malwareFamily?: string;
  indicators: OsintIndicator[];
  ttps: string[]; // MITRE ATT&CK TTPs
  targetSectors?: string[];
  targetRegions?: string[];
  confidence: ConfidenceLevel;
  tlpLevel: 'WHITE' | 'GREEN' | 'AMBER' | 'RED';
  reportedAt: Date;
  validUntil?: Date;
}

// ============================================================================
// Neo4j Correlation Types
// ============================================================================

/**
 * Entity correlation result from Neo4j graph analysis
 */
export interface EntityCorrelation {
  entityId: string;
  entityType: string;
  entityName: string;
  correlationType:
    | 'DIRECT'
    | 'INDIRECT'
    | 'TEMPORAL'
    | 'SPATIAL'
    | 'BEHAVIORAL';
  correlationScore: number; // 0-1
  pathLength: number;
  intermediateEntities: string[];
  evidenceSources: string[];
  timestamp: Date;
}

/**
 * ODNI Intelligence Gap reference
 */
export interface OdniGapReference {
  gapId: string;
  title: string;
  description?: string;
  priority: 'ROUTINE' | 'PRIORITY' | 'IMMEDIATE';
  category: string;
  relatedRequirements: string[];
  matchedSignals: string[];
  matchedTracks: string[];
  matchedEntities: string[];
  lastAssessedAt: Date;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const SpectrumSampleSchema = z.object({
  timestamp: z.date(),
  frequencyHz: z.number().positive(),
  bandwidthHz: z.number().positive(),
  powerDbm: z.number(),
  noiseFloorDbm: z.number(),
  sensorId: z.string().min(1),
  geolocation: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      altitudeM: z.number().optional(),
      accuracyM: z.number().positive(),
      timestamp: z.date(),
      source: z.enum([
        'GPS',
        'TDOA',
        'AOA',
        'FDOA',
        'HYBRID',
        'ESTIMATED',
      ]),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SensorReadingSchema = z.object({
  id: z.string().uuid(),
  sensorId: z.string().min(1),
  modality: z.enum([
    'RADAR',
    'ELECTRO_OPTICAL',
    'INFRARED',
    'ACOUSTIC',
    'SEISMIC',
    'MAGNETIC',
    'NUCLEAR',
    'CHEMICAL',
    'MULTISPECTRAL',
    'HYPERSPECTRAL',
    'LIDAR',
    'SAR',
  ]),
  timestamp: z.date(),
  value: z.union([z.number(), z.array(z.number())]),
  unit: z.string(),
  qualityScore: z.number().min(0).max(1),
  geolocation: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      altitudeM: z.number().optional(),
      accuracyM: z.number().positive(),
      timestamp: z.date(),
      source: z.enum([
        'GPS',
        'TDOA',
        'AOA',
        'FDOA',
        'HYBRID',
        'ESTIMATED',
      ]),
    })
    .optional(),
  bearing: z.number().min(0).max(360).optional(),
  range: z.number().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const IntelAlertSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'NEW_SIGNAL',
    'SIGNAL_CHANGE',
    'NEW_TRACK',
    'TRACK_MANEUVER',
    'SIGNATURE_MATCH',
    'THREAT_DETECTED',
    'CORRELATION_FOUND',
    'ODNI_GAP_HIT',
    'ANOMALY_DETECTED',
    'PATTERN_MATCH',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'FLASH']),
  title: z.string().min(1),
  description: z.string(),
  source: z.enum(['SIGINT', 'MASINT', 'FUSION', 'CORRELATION']),
  relatedEntityIds: z.array(z.string()),
  relatedSignalIds: z.array(z.string()),
  relatedTrackIds: z.array(z.string()),
  odniGapReferences: z.array(z.string()),
  geolocation: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      altitudeM: z.number().optional(),
      accuracyM: z.number().positive(),
      timestamp: z.date(),
      source: z.enum([
        'GPS',
        'TDOA',
        'AOA',
        'FDOA',
        'HYBRID',
        'ESTIMATED',
      ]),
    })
    .optional(),
  timestamp: z.date(),
  expiresAt: z.date().optional(),
  acknowledged: z.boolean(),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Export type inference helpers
export type ValidatedSpectrumSample = z.infer<typeof SpectrumSampleSchema>;
export type ValidatedSensorReading = z.infer<typeof SensorReadingSchema>;
export type ValidatedIntelAlert = z.infer<typeof IntelAlertSchema>;
