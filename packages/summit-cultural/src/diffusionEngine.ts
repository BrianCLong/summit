import {
  DiffusionResult,
  LinguisticSignal,
  Narrative,
  PopulationGroup,
} from './culturalGraph.js';
import { scoreNarrativeCompatibility } from './narrativeCompatibility.js';
import {
  clampUnit,
  parseLinguisticSignal,
  parseNarrative,
  parsePopulationGroup,
  parseSusceptibilityMap,
} from './validation.js';

export interface DiffusionInputs {
  populations: PopulationGroup[];
  narrative: Narrative;
  signal: LinguisticSignal;
  demographicSusceptibility?: Record<string, number>;
}

export interface DiffusionEngineOptions {
  compatibilityWeight?: number;
  susceptibilityWeight?: number;
}

const DEFAULT_DIFFUSION_WEIGHTS = {
  compatibilityWeight: 0.7,
  susceptibilityWeight: 0.3,
};

function normalizeDiffusionWeights(options: DiffusionEngineOptions = {}) {
  const compatibilityWeight =
    options.compatibilityWeight ?? DEFAULT_DIFFUSION_WEIGHTS.compatibilityWeight;
  const susceptibilityWeight =
    options.susceptibilityWeight ?? DEFAULT_DIFFUSION_WEIGHTS.susceptibilityWeight;
  const total = compatibilityWeight + susceptibilityWeight;

  if (total <= 0) {
    throw new Error('Diffusion weights must sum to more than 0');
  }

  return {
    compatibilityWeight: compatibilityWeight / total,
    susceptibilityWeight: susceptibilityWeight / total,
  };
}

export function buildNarrativeDiffusionMap(
  {
    populations,
    narrative,
    signal,
    demographicSusceptibility = {},
  }: DiffusionInputs,
  options: DiffusionEngineOptions = {},
): DiffusionResult[] {
  const safeNarrative = parseNarrative(narrative);
  const safeSignal = parseLinguisticSignal(signal);
  const safePopulations = populations.map((population) =>
    parsePopulationGroup(population),
  );
  const safeSusceptibility = parseSusceptibilityMap(demographicSusceptibility);
  const weights = normalizeDiffusionWeights(options);

  return safePopulations
    .map((population) => {
      const compatibility = scoreNarrativeCompatibility(
        population,
        safeNarrative,
        safeSignal,
      );
      const susceptibility = safeSusceptibility[population.id] ?? 0.5;
      const adoptionLikelihood = Number(
        clampUnit(
          compatibility.score * weights.compatibilityWeight +
            susceptibility * weights.susceptibilityWeight,
        ).toFixed(3),
      );

      return {
        populationId: population.id,
        adoptionLikelihood,
        confidence: Number((0.5 + compatibility.score / 2).toFixed(3)),
      };
    })
    .sort((a, b) => b.adoptionLikelihood - a.adoptionLikelihood);
}
