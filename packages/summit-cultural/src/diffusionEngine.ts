import {
  DiffusionResult,
  LinguisticSignal,
  Narrative,
  PopulationGroup,
} from './culturalGraph.js';
import { scoreNarrativeCompatibility } from './narrativeCompatibility.js';

export interface DiffusionInputs {
  populations: PopulationGroup[];
  narrative: Narrative;
  signal: LinguisticSignal;
  demographicSusceptibility?: Record<string, number>;
}

export function buildNarrativeDiffusionMap({
  populations,
  narrative,
  signal,
  demographicSusceptibility = {},
}: DiffusionInputs): DiffusionResult[] {
  return populations
    .map((population) => {
      const compatibility = scoreNarrativeCompatibility(
        population,
        narrative,
        signal,
      );
      const susceptibility = demographicSusceptibility[population.id] ?? 0.5;
      const adoptionLikelihood = Number(
        Math.min(1, compatibility.score * 0.7 + susceptibility * 0.3).toFixed(3),
      );

      return {
        populationId: population.id,
        adoptionLikelihood,
        confidence: Number((0.5 + compatibility.score / 2).toFixed(3)),
      };
    })
    .sort((a, b) => b.adoptionLikelihood - a.adoptionLikelihood);
}
