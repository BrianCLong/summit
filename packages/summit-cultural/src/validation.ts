import {
  LinguisticSignal,
  Narrative,
  PopulationGroup,
} from './culturalGraph.js';

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }

  return value.trim();
}

function assertStringArray(value: unknown, field: string, minItems = 0): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }

  const normalized = value.map((item, index) =>
    assertNonEmptyString(item, `${field}[${index}]`),
  );

  if (normalized.length < minItems) {
    throw new Error(`${field} must contain at least ${minItems} items`);
  }

  return normalized;
}

export function assertUnitScore(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error(`${field} must be a number between 0 and 1`);
  }

  return value;
}

export function parsePopulationGroup(input: PopulationGroup): PopulationGroup {
  return {
    id: assertNonEmptyString(input.id, 'population.id'),
    region: assertNonEmptyString(input.region, 'population.region'),
    languages: assertStringArray(input.languages, 'population.languages', 1),
    religion: input.religion
      ? assertStringArray(input.religion, 'population.religion')
      : undefined,
    educationDistribution: input.educationDistribution,
    economicProfile: input.economicProfile,
    historicalMemories: input.historicalMemories
      ? assertStringArray(
          input.historicalMemories,
          'population.historicalMemories',
        )
      : undefined,
    valueSignals: input.valueSignals
      ? assertStringArray(input.valueSignals, 'population.valueSignals')
      : undefined,
    mediaConsumption: assertStringArray(
      input.mediaConsumption,
      'population.mediaConsumption',
      1,
    ),
  };
}

export function parseNarrative(input: Narrative): Narrative {
  return {
    id: assertNonEmptyString(input.id, 'narrative.id'),
    theme: assertNonEmptyString(input.theme, 'narrative.theme'),
    targetLanguages: assertStringArray(
      input.targetLanguages,
      'narrative.targetLanguages',
      1,
    ),
    frameValues: assertStringArray(input.frameValues, 'narrative.frameValues', 1),
    historicalReferences: input.historicalReferences
      ? assertStringArray(
          input.historicalReferences,
          'narrative.historicalReferences',
        )
      : undefined,
    mediaVectors: input.mediaVectors
      ? assertStringArray(input.mediaVectors, 'narrative.mediaVectors')
      : undefined,
  };
}

export function parseLinguisticSignal(input: LinguisticSignal): LinguisticSignal {
  const register = assertNonEmptyString(input.register, 'signal.register');
  const supportedRegisters = new Set([
    'formal',
    'informal',
    'activist',
    'bureaucratic',
    'mixed',
  ]);
  if (!supportedRegisters.has(register)) {
    throw new Error(`signal.register must be one of: ${[...supportedRegisters].join(', ')}`);
  }

  return {
    detectedPhrases: assertStringArray(input.detectedPhrases, 'signal.detectedPhrases'),
    register: register as LinguisticSignal['register'],
    sourceLanguage: assertNonEmptyString(input.sourceLanguage, 'signal.sourceLanguage'),
    suspectedTranslation: input.suspectedTranslation,
  };
}

export function parseSusceptibilityMap(
  value: Record<string, number>,
): Record<string, number> {
  const normalized: Record<string, number> = {};
  for (const [key, score] of Object.entries(value)) {
    const id = assertNonEmptyString(key, 'susceptibility.id');
    normalized[id] = assertUnitScore(score, `susceptibility.${id}`);
  }

  return normalized;
}

export function clampUnit(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}
