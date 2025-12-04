import { v4 as uuidv4 } from 'uuid';
import {
  BehavioralProfile,
  DEFAULT_BEHAVIORAL_PROFILE,
  cloneProfile,
} from '../models/BehavioralProfile.js';
import {
  DEFAULT_PERSONA_CONFIG,
  PersonaConfig,
  SyntheticPersona,
} from '../models/SyntheticPersona.js';

const GENERATOR_VERSION = '1.0.0';

/**
 * Entity interface for minimal entity data needed for persona generation
 */
export interface Entity {
  id: string;
  type?: string;
  properties?: Record<string, any>;
  activityHistory?: ActivityRecord[];
}

export interface ActivityRecord {
  timestamp: number;
  type: string;
  intensity?: number;
  risk?: number;
}

/**
 * Generates a synthetic persona from a seed entity
 */
export function generateSyntheticPersona(
  seedEntity: Entity,
  config: PersonaConfig = {},
): SyntheticPersona {
  const finalConfig = { ...DEFAULT_PERSONA_CONFIG, ...config };

  // Extract baseline behavioral profile from entity history
  const baseline = extractBehavioralProfile(seedEntity);

  // Calculate stability coefficient based on entity characteristics
  const stabilityCoefficient =
    finalConfig.stabilityCoefficient ?? calculateStability(seedEntity);

  const now = Date.now();

  const persona: SyntheticPersona = {
    id: uuidv4(),
    sourceEntityId: seedEntity.id,
    baselineProfile: baseline,
    mutationRate: finalConfig.mutationRate,
    stabilityCoefficient,
    metadata: {
      createdAt: now,
      validUntil: now + finalConfig.validityWindow,
      generatorVersion: GENERATOR_VERSION,
      confidence: calculateConfidence(seedEntity),
    },
  };

  return persona;
}

/**
 * Extracts behavioral profile from entity's historical data
 */
export function extractBehavioralProfile(entity: Entity): BehavioralProfile {
  if (!entity.activityHistory || entity.activityHistory.length === 0) {
    return cloneProfile(DEFAULT_BEHAVIORAL_PROFILE);
  }

  const history = entity.activityHistory;

  // Calculate activity level from recent activity frequency
  const activityLevel = calculateActivityLevel(history);

  // Calculate operational tempo (events per month)
  const operationalTempo = calculateOperationalTempo(history);

  // Calculate risk tolerance from historical risk-taking
  const riskTolerance = calculateRiskTolerance(history);

  // Extract other dimensions from entity properties
  const profile: BehavioralProfile = {
    activityLevel,
    operationalTempo,
    riskTolerance,
    alignmentShift: extractAlignmentShift(entity),
    resourceSeeking: extractResourceSeeking(entity),
    capabilityAcquisition: calculateCapabilityAcquisition(history),
    networkExpansion: extractNetworkExpansion(entity),
    trustRadius: extractTrustRadius(entity),
    influenceSeeking: extractInfluenceSeeking(entity),
    tacticalInnovation: calculateTacticalInnovation(history),
    stabilityCoefficient: 0.5, // Will be overridden by calculateStability
  };

  return profile;
}

/**
 * Calculates activity level from activity history
 */
function calculateActivityLevel(history: ActivityRecord[]): number {
  if (history.length === 0) return 0.5;

  // Look at last 90 days
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recentActivities = history.filter((a) => a.timestamp > ninetyDaysAgo);

  // Normalize to 0-1 scale (assuming 30 activities per 90 days is high)
  const activityLevel = Math.min(1.0, recentActivities.length / 30);

  return activityLevel;
}

/**
 * Calculates operational tempo (events per month)
 */
function calculateOperationalTempo(history: ActivityRecord[]): number {
  if (history.length === 0) return 1.0;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentActivities = history.filter((a) => a.timestamp > thirtyDaysAgo);

  return Math.max(0.1, recentActivities.length);
}

/**
 * Calculates risk tolerance from historical activities
 */
function calculateRiskTolerance(history: ActivityRecord[]): number {
  if (history.length === 0) return 0.5;

  const recentHistory = history.slice(-20); // Last 20 activities
  const avgRisk =
    recentHistory.reduce((sum, a) => sum + (a.risk || 0.5), 0) /
    recentHistory.length;

  return Math.max(0, Math.min(1, avgRisk));
}

/**
 * Calculates tactical innovation from behavior variation
 */
function calculateTacticalInnovation(history: ActivityRecord[]): number {
  if (history.length < 5) return 0.3;

  // Count unique activity types in recent history
  const recentTypes = new Set(
    history.slice(-20).map((a) => a.type),
  );
  const diversity = recentTypes.size / Math.min(20, history.length);

  return Math.max(0, Math.min(1, diversity));
}

/**
 * Calculates capability acquisition rate
 */
function calculateCapabilityAcquisition(history: ActivityRecord[]): number {
  // Simplified: look for increasing complexity over time
  if (history.length < 10) return 0.3;

  const firstHalf = history.slice(0, Math.floor(history.length / 2));
  const secondHalf = history.slice(Math.floor(history.length / 2));

  const firstComplexity = new Set(firstHalf.map((a) => a.type)).size;
  const secondComplexity = new Set(secondHalf.map((a) => a.type)).size;

  const growth = (secondComplexity - firstComplexity) / firstComplexity;

  return Math.max(0, Math.min(1, growth * 0.5 + 0.5));
}

/**
 * Extracts alignment shift from entity properties
 */
function extractAlignmentShift(entity: Entity): number {
  return entity.properties?.alignmentShift ?? 0.0;
}

/**
 * Extracts resource seeking from entity properties
 */
function extractResourceSeeking(entity: Entity): number {
  return entity.properties?.resourceSeeking ?? 0.5;
}

/**
 * Extracts network expansion tendency from entity properties
 */
function extractNetworkExpansion(entity: Entity): number {
  return entity.properties?.networkExpansion ?? 0.4;
}

/**
 * Extracts trust radius from entity properties
 */
function extractTrustRadius(entity: Entity): number {
  return entity.properties?.trustRadius ?? 5.0;
}

/**
 * Extracts influence seeking from entity properties
 */
function extractInfluenceSeeking(entity: Entity): number {
  return entity.properties?.influenceSeeking ?? 0.5;
}

/**
 * Calculates stability coefficient based on entity characteristics
 */
export function calculateStability(entity: Entity): number {
  // Entities with longer histories are typically more stable
  const historyLength = entity.activityHistory?.length || 0;
  const historyFactor = Math.min(1.0, historyLength / 100);

  // Entities with consistent behavior patterns are more stable
  const consistencyFactor = calculateConsistency(entity.activityHistory || []);

  // Combine factors
  const stability = historyFactor * 0.5 + consistencyFactor * 0.5;

  return Math.max(0.1, Math.min(0.9, stability));
}

/**
 * Calculates behavioral consistency from activity history
 */
function calculateConsistency(history: ActivityRecord[]): number {
  if (history.length < 5) return 0.3;

  // Calculate variance in activity intensity over time
  const intensities = history
    .slice(-20)
    .map((a) => a.intensity || 0.5);
  const mean =
    intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
  const variance =
    intensities.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) /
    intensities.length;

  // Lower variance = higher consistency
  const consistency = Math.max(0, 1 - variance * 2);

  return consistency;
}

/**
 * Calculates confidence in persona accuracy based on data quality
 */
export function calculateConfidence(entity: Entity): number {
  const historyLength = entity.activityHistory?.length || 0;

  // More data = higher confidence
  const dataFactor = Math.min(1.0, historyLength / 50);

  // Recency of data affects confidence
  const recencyFactor = calculateRecencyFactor(entity.activityHistory || []);

  // Combine factors
  const confidence = dataFactor * 0.6 + recencyFactor * 0.4;

  return Math.max(0.3, Math.min(0.95, confidence));
}

/**
 * Calculates recency factor for confidence
 */
function calculateRecencyFactor(history: ActivityRecord[]): number {
  if (history.length === 0) return 0.3;

  const now = Date.now();
  const mostRecent = Math.max(...history.map((a) => a.timestamp));
  const daysSinceLastActivity = (now - mostRecent) / (24 * 60 * 60 * 1000);

  // Data less than 30 days old = high confidence
  // Data more than 180 days old = low confidence
  if (daysSinceLastActivity < 30) return 1.0;
  if (daysSinceLastActivity > 180) return 0.3;

  return 1.0 - (daysSinceLastActivity - 30) / 150;
}
