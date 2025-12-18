export type PressureType =
  | 'ECONOMIC'
  | 'POLITICAL'
  | 'SOCIAL'
  | 'TECHNOLOGICAL'
  | 'OPERATIONAL';

export interface PressureVector {
  type: PressureType;
  strength: number; // magnitude of pressure (0.0 - 1.0)
  duration: number; // months of sustained pressure
  decay: number; // rate of pressure dissipation (0.0 - 1.0)
  source?: string; // entity or event causing pressure
  onset: number; // when pressure begins (months from T0)
}

/**
 * Calculates the effective strength of a pressure at a given time
 */
export function getEffectiveStrength(
  pressure: PressureVector,
  currentTime: number,
): number {
  // Pressure hasn't started yet
  if (currentTime < pressure.onset) {
    return 0;
  }

  // Pressure has ended
  const timeSinceOnset = currentTime - pressure.onset;
  if (timeSinceOnset >= pressure.duration) {
    return 0;
  }

  // Apply exponential decay over duration
  const decayFactor = Math.pow(1 - pressure.decay, timeSinceOnset);
  return pressure.strength * decayFactor;
}

/**
 * Checks if a pressure is active at a given time
 */
export function isPressureActive(
  pressure: PressureVector,
  currentTime: number,
): boolean {
  return getEffectiveStrength(pressure, currentTime) > 0.01; // Threshold for significance
}

/**
 * Gets all active pressures at a specific time
 */
export function getActivePressures(
  pressures: PressureVector[],
  currentTime: number,
): PressureVector[] {
  return pressures.filter((p) => isPressureActive(p, currentTime));
}

/**
 * Calculates combined pressure strength by type at a given time
 */
export function getCombinedPressureByType(
  pressures: PressureVector[],
  type: PressureType,
  currentTime: number,
): number {
  return pressures
    .filter((p) => p.type === type)
    .reduce((sum, p) => sum + getEffectiveStrength(p, currentTime), 0);
}

/**
 * Validates a pressure vector
 */
export function validatePressure(pressure: PressureVector): boolean {
  if (pressure.strength < 0 || pressure.strength > 1) {
    return false;
  }

  if (pressure.duration <= 0) {
    return false;
  }

  if (pressure.decay < 0 || pressure.decay > 1) {
    return false;
  }

  if (pressure.onset < 0) {
    return false;
  }

  return true;
}

/**
 * Creates a pressure vector with default values
 */
export function createPressure(
  type: PressureType,
  strength: number,
  duration: number,
  onset: number = 0,
  decay: number = 0.1,
  source?: string,
): PressureVector {
  return {
    type,
    strength: Math.max(0, Math.min(1, strength)),
    duration: Math.max(1, duration),
    decay: Math.max(0, Math.min(1, decay)),
    onset: Math.max(0, onset),
    source,
  };
}

/**
 * Predefined common pressure scenarios
 */
export const PRESSURE_SCENARIOS = {
  BASELINE: {
    id: 'baseline',
    name: 'Baseline Continuation',
    pressures: [
      createPressure('ECONOMIC', 0.1, 24, 0, 0.05),
      createPressure('POLITICAL', 0.1, 24, 0, 0.05),
    ],
  },
  ECONOMIC_CRISIS: {
    id: 'economic_crisis',
    name: 'Economic Collapse',
    pressures: [
      createPressure('ECONOMIC', 0.8, 12, 3, 0.15),
      createPressure('POLITICAL', 0.5, 18, 6, 0.1),
      createPressure('SOCIAL', 0.6, 15, 4, 0.12),
    ],
  },
  TECHNOLOGICAL_LEAP: {
    id: 'technological_leap',
    name: 'Technological Breakthrough',
    pressures: [
      createPressure('TECHNOLOGICAL', 0.9, 6, 0, 0.2),
      createPressure('ECONOMIC', 0.4, 12, 2, 0.15),
    ],
  },
  POLITICAL_INSTABILITY: {
    id: 'political_instability',
    name: 'Political Upheaval',
    pressures: [
      createPressure('POLITICAL', 0.9, 18, 0, 0.1),
      createPressure('SOCIAL', 0.7, 12, 1, 0.15),
      createPressure('OPERATIONAL', 0.6, 15, 2, 0.12),
    ],
  },
  HEIGHTENED_OPERATIONS: {
    id: 'heightened_operations',
    name: 'Operational Surge',
    pressures: [
      createPressure('OPERATIONAL', 0.8, 9, 0, 0.18),
      createPressure('ECONOMIC', 0.3, 12, 1, 0.1),
    ],
  },
};
