/**
 * Quantified behavioral characteristics of an entity
 */
export interface BehavioralProfile {
  // Operational dimensions
  activityLevel: number; // 0.0 - 1.0
  operationalTempo: number; // events per month
  riskTolerance: number; // 0.0 - 1.0

  // Strategic dimensions
  alignmentShift: number; // -1.0 (opposed) to 1.0 (aligned)
  resourceSeeking: number; // 0.0 - 1.0
  capabilityAcquisition: number; // rate of new capability adoption

  // Social dimensions
  networkExpansion: number; // rate of new connections
  trustRadius: number; // size of trusted network
  influenceSeeking: number; // 0.0 - 1.0

  // Adaptive dimensions
  tacticalInnovation: number; // rate of behavior change
  stabilityCoefficient: number; // resistance to change (0.0 - 1.0)
}

/**
 * Represents changes in behavioral profile
 */
export interface BehavioralDelta {
  activityLevel: number;
  operationalTempo: number;
  riskTolerance: number;
  alignmentShift: number;
  resourceSeeking: number;
  capabilityAcquisition: number;
  networkExpansion: number;
  trustRadius: number;
  influenceSeeking: number;
  tacticalInnovation: number;
}

/**
 * Default baseline behavioral profile for new personas
 */
export const DEFAULT_BEHAVIORAL_PROFILE: BehavioralProfile = {
  activityLevel: 0.5,
  operationalTempo: 1.0,
  riskTolerance: 0.5,
  alignmentShift: 0.0,
  resourceSeeking: 0.5,
  capabilityAcquisition: 0.3,
  networkExpansion: 0.4,
  trustRadius: 5.0,
  influenceSeeking: 0.5,
  tacticalInnovation: 0.3,
  stabilityCoefficient: 0.5,
};

/**
 * Calculates the delta between two behavioral profiles
 */
export function calculateDelta(
  current: BehavioralProfile,
  baseline: BehavioralProfile,
): BehavioralDelta {
  return {
    activityLevel: current.activityLevel - baseline.activityLevel,
    operationalTempo: current.operationalTempo - baseline.operationalTempo,
    riskTolerance: current.riskTolerance - baseline.riskTolerance,
    alignmentShift: current.alignmentShift - baseline.alignmentShift,
    resourceSeeking: current.resourceSeeking - baseline.resourceSeeking,
    capabilityAcquisition:
      current.capabilityAcquisition - baseline.capabilityAcquisition,
    networkExpansion: current.networkExpansion - baseline.networkExpansion,
    trustRadius: current.trustRadius - baseline.trustRadius,
    influenceSeeking: current.influenceSeeking - baseline.influenceSeeking,
    tacticalInnovation:
      current.tacticalInnovation - baseline.tacticalInnovation,
  };
}

/**
 * Calculates Euclidean distance between two behavioral profiles
 */
export function calculateDistance(
  profile1: BehavioralProfile,
  profile2: BehavioralProfile,
): number {
  const delta = calculateDelta(profile1, profile2);

  const sumSquares =
    Math.pow(delta.activityLevel, 2) +
    Math.pow(delta.operationalTempo / 10, 2) + // Normalize tempo
    Math.pow(delta.riskTolerance, 2) +
    Math.pow(delta.alignmentShift, 2) +
    Math.pow(delta.resourceSeeking, 2) +
    Math.pow(delta.capabilityAcquisition, 2) +
    Math.pow(delta.networkExpansion, 2) +
    Math.pow(delta.trustRadius / 10, 2) + // Normalize trust radius
    Math.pow(delta.influenceSeeking, 2) +
    Math.pow(delta.tacticalInnovation, 2);

  return Math.sqrt(sumSquares);
}

/**
 * Validates that all behavioral dimensions are within valid ranges
 */
export function validateProfile(profile: BehavioralProfile): boolean {
  // Check bounded dimensions (0.0 - 1.0)
  if (
    profile.activityLevel < 0 ||
    profile.activityLevel > 1 ||
    profile.riskTolerance < 0 ||
    profile.riskTolerance > 1 ||
    profile.resourceSeeking < 0 ||
    profile.resourceSeeking > 1 ||
    profile.influenceSeeking < 0 ||
    profile.influenceSeeking > 1 ||
    profile.stabilityCoefficient < 0 ||
    profile.stabilityCoefficient > 1
  ) {
    return false;
  }

  // Check alignment shift (-1.0 to 1.0)
  if (profile.alignmentShift < -1 || profile.alignmentShift > 1) {
    return false;
  }

  // Check non-negative dimensions
  if (
    profile.operationalTempo < 0 ||
    profile.capabilityAcquisition < 0 ||
    profile.networkExpansion < 0 ||
    profile.trustRadius < 0 ||
    profile.tacticalInnovation < 0
  ) {
    return false;
  }

  return true;
}

/**
 * Clamps a behavioral profile to valid ranges
 */
export function clampProfile(profile: BehavioralProfile): BehavioralProfile {
  return {
    activityLevel: Math.max(0, Math.min(1, profile.activityLevel)),
    operationalTempo: Math.max(0, profile.operationalTempo),
    riskTolerance: Math.max(0, Math.min(1, profile.riskTolerance)),
    alignmentShift: Math.max(-1, Math.min(1, profile.alignmentShift)),
    resourceSeeking: Math.max(0, Math.min(1, profile.resourceSeeking)),
    capabilityAcquisition: Math.max(0, profile.capabilityAcquisition),
    networkExpansion: Math.max(0, profile.networkExpansion),
    trustRadius: Math.max(0, profile.trustRadius),
    influenceSeeking: Math.max(0, Math.min(1, profile.influenceSeeking)),
    tacticalInnovation: Math.max(0, profile.tacticalInnovation),
    stabilityCoefficient: Math.max(
      0,
      Math.min(1, profile.stabilityCoefficient),
    ),
  };
}

/**
 * Creates a copy of a behavioral profile
 */
export function cloneProfile(profile: BehavioralProfile): BehavioralProfile {
  return { ...profile };
}

/**
 * Interpolates between two behavioral profiles
 */
export function interpolateProfiles(
  profile1: BehavioralProfile,
  profile2: BehavioralProfile,
  t: number, // 0.0 to 1.0
): BehavioralProfile {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  return {
    activityLevel: lerp(profile1.activityLevel, profile2.activityLevel, t),
    operationalTempo: lerp(
      profile1.operationalTempo,
      profile2.operationalTempo,
      t,
    ),
    riskTolerance: lerp(profile1.riskTolerance, profile2.riskTolerance, t),
    alignmentShift: lerp(profile1.alignmentShift, profile2.alignmentShift, t),
    resourceSeeking: lerp(profile1.resourceSeeking, profile2.resourceSeeking, t),
    capabilityAcquisition: lerp(
      profile1.capabilityAcquisition,
      profile2.capabilityAcquisition,
      t,
    ),
    networkExpansion: lerp(
      profile1.networkExpansion,
      profile2.networkExpansion,
      t,
    ),
    trustRadius: lerp(profile1.trustRadius, profile2.trustRadius, t),
    influenceSeeking: lerp(
      profile1.influenceSeeking,
      profile2.influenceSeeking,
      t,
    ),
    tacticalInnovation: lerp(
      profile1.tacticalInnovation,
      profile2.tacticalInnovation,
      t,
    ),
    stabilityCoefficient: lerp(
      profile1.stabilityCoefficient,
      profile2.stabilityCoefficient,
      t,
    ),
  };
}
