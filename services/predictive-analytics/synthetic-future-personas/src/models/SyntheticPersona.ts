import { BehavioralProfile } from './BehavioralProfile.js';

export interface SyntheticPersona {
  id: string;
  sourceEntityId: string;
  baselineProfile: BehavioralProfile;
  mutationRate: number;
  stabilityCoefficient: number;
  metadata: PersonaMetadata;
}

export interface PersonaMetadata {
  createdAt: number;
  validUntil: number;
  generatorVersion: string;
  confidence: number;
}

export interface PersonaConfig {
  mutationRate?: number;
  branchingFactor?: number;
  validityWindow?: number;
  stabilityCoefficient?: number;
}

export const DEFAULT_PERSONA_CONFIG: Required<PersonaConfig> = {
  mutationRate: 0.15,
  branchingFactor: 3,
  validityWindow: 15552000000, // 6 months in milliseconds
  stabilityCoefficient: 0.5,
};

/**
 * Validates that a synthetic persona has all required fields with valid values
 */
export function validatePersona(persona: SyntheticPersona): boolean {
  if (!persona.id || !persona.sourceEntityId) {
    return false;
  }

  if (
    persona.mutationRate < 0 ||
    persona.mutationRate > 1 ||
    persona.stabilityCoefficient < 0 ||
    persona.stabilityCoefficient > 1
  ) {
    return false;
  }

  if (
    !persona.metadata ||
    !persona.metadata.createdAt ||
    !persona.metadata.validUntil
  ) {
    return false;
  }

  return true;
}

/**
 * Checks if a persona is still valid based on its validUntil timestamp
 */
export function isPersonaValid(persona: SyntheticPersona): boolean {
  return Date.now() < persona.metadata.validUntil;
}

/**
 * Calculates how much time remains before persona expires
 */
export function getPersonaTimeRemaining(persona: SyntheticPersona): number {
  return Math.max(0, persona.metadata.validUntil - Date.now());
}
