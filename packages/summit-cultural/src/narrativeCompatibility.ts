import {
  CompatibilityBreakdown,
  CompatibilityResult,
  LinguisticSignal,
  Narrative,
  PopulationGroup,
} from './culturalGraph.js';
import {
  parseLinguisticSignal,
  parseNarrative,
  parsePopulationGroup,
} from './validation.js';

export const DEFAULT_WEIGHTS: Record<keyof CompatibilityBreakdown, number> = {
  valueAlignment: 0.35,
  linguisticAuthenticity: 0.3,
  historicalResonance: 0.2,
  mediaDistributionFit: 0.15,
};

export interface CompatibilityScoringOptions {
  weights?: Partial<Record<keyof CompatibilityBreakdown, number>>;
}

function normalizeWeights(
  weights: Partial<Record<keyof CompatibilityBreakdown, number>> = {},
): Record<keyof CompatibilityBreakdown, number> {
  const merged: Record<keyof CompatibilityBreakdown, number> = {
    ...DEFAULT_WEIGHTS,
    ...weights,
  };
  const total = Object.values(merged).reduce((acc, current) => acc + current, 0);
  if (total <= 0) {
    throw new Error('Compatibility weight total must be greater than 0');
  }

  return {
    valueAlignment: merged.valueAlignment / total,
    linguisticAuthenticity: merged.linguisticAuthenticity / total,
    historicalResonance: merged.historicalResonance / total,
    mediaDistributionFit: merged.mediaDistributionFit / total,
  };
}

function overlapRatio(a: string[] = [], b: string[] = []): number {
  if (!a.length || !b.length) {
    return 0;
  }

  const aNorm = new Set(a.map((item) => item.toLowerCase()));
  const bNorm = new Set(b.map((item) => item.toLowerCase()));
  let shared = 0;

  for (const value of aNorm) {
    if (bNorm.has(value)) {
      shared += 1;
    }
  }

  return shared / Math.max(aNorm.size, bNorm.size);
}

export function scoreNarrativeCompatibility(
  population: PopulationGroup,
  narrative: Narrative,
  signal: LinguisticSignal,
  options: CompatibilityScoringOptions = {},
): CompatibilityResult {
  const safePopulation = parsePopulationGroup(population);
  const safeNarrative = parseNarrative(narrative);
  const safeSignal = parseLinguisticSignal(signal);
  const weights = normalizeWeights(options.weights);

  const valueAlignment = overlapRatio(
    safePopulation.valueSignals,
    safeNarrative.frameValues,
  );

  const languageFit =
    safePopulation.languages.includes(safeSignal.sourceLanguage) ||
    safeNarrative.targetLanguages.includes(safeSignal.sourceLanguage)
      ? 1
      : 0.2;
  const registerPenalty = safeSignal.suspectedTranslation ? 0.2 : 0;
  const linguisticAuthenticity = Math.max(0, languageFit - registerPenalty);

  const historicalResonance = overlapRatio(
    safePopulation.historicalMemories,
    safeNarrative.historicalReferences,
  );

  const mediaDistributionFit = overlapRatio(
    safePopulation.mediaConsumption,
    safeNarrative.mediaVectors,
  );

  const breakdown: CompatibilityBreakdown = {
    valueAlignment,
    linguisticAuthenticity,
    historicalResonance,
    mediaDistributionFit,
  };

  const score = Object.entries(breakdown).reduce((acc, [metric, value]) => {
    return acc + value * weights[metric as keyof CompatibilityBreakdown];
  }, 0);

  return {
    score: Number(score.toFixed(3)),
    breakdown,
  };
}
