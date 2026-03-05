import {
  CompatibilityBreakdown,
  CompatibilityResult,
  LinguisticSignal,
  Narrative,
  PopulationGroup,
} from './culturalGraph.js';

const WEIGHTS: Record<keyof CompatibilityBreakdown, number> = {
  valueAlignment: 0.35,
  linguisticAuthenticity: 0.3,
  historicalResonance: 0.2,
  mediaDistributionFit: 0.15,
};

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
): CompatibilityResult {
  const valueAlignment = overlapRatio(population.valueSignals, narrative.frameValues);

  const languageFit =
    population.languages.includes(signal.sourceLanguage) ||
    narrative.targetLanguages.includes(signal.sourceLanguage)
      ? 1
      : 0.2;
  const registerPenalty = signal.suspectedTranslation ? 0.2 : 0;
  const linguisticAuthenticity = Math.max(0, languageFit - registerPenalty);

  const historicalResonance = overlapRatio(
    population.historicalMemories,
    narrative.historicalReferences,
  );

  const mediaDistributionFit = overlapRatio(
    population.mediaConsumption,
    narrative.mediaVectors,
  );

  const breakdown: CompatibilityBreakdown = {
    valueAlignment,
    linguisticAuthenticity,
    historicalResonance,
    mediaDistributionFit,
  };

  const score = Object.entries(breakdown).reduce((acc, [metric, value]) => {
    return acc + value * WEIGHTS[metric as keyof CompatibilityBreakdown];
  }, 0);

  return {
    score: Number(score.toFixed(3)),
    breakdown,
  };
}
