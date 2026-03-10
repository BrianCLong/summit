import { scoreNarrativeCompatibility } from "./narrativeCompatibility.js";
import type {
  DiffusionMap,
  DiffusionPoint,
  LinguisticFingerprint,
  NarrativeSignal,
  PopulationGroup
} from "./types.js";

export interface DiffusionInputs {
  narrative: NarrativeSignal;
  populations: PopulationGroup[];
  fingerprintByPopulationId?: Record<string, LinguisticFingerprint | null>;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function estimateVelocity(compatibility: number, mediaConsumption?: string[]): number {
  const socialBoost = (mediaConsumption ?? []).some((m) =>
    ["telegram", "tiktok", "x", "youtube", "whatsapp", "facebook"].includes(m.toLowerCase())
  )
    ? 0.15
    : 0;

  return clamp01(compatibility * 0.75 + socialBoost);
}

export function buildDiffusionMap(input: DiffusionInputs): DiffusionMap {
  const points: DiffusionPoint[] = input.populations.map((population) => {
    const breakdown = scoreNarrativeCompatibility({
      population,
      narrative: input.narrative,
      fingerprint: input.fingerprintByPopulationId?.[population.id] ?? null
    });

    const diffusionProbability = clamp01(
      breakdown.finalScore * 0.7 +
        breakdown.mediaChannelFit * 0.1 +
        breakdown.economicRelevance * 0.1 +
        breakdown.historicalResonance * 0.1
    );

    return {
      populationId: population.id,
      regionId: population.regionId,
      h3Cells: population.h3Cells,
      compatibilityScore: breakdown.finalScore,
      diffusionProbability,
      estimatedVelocity: estimateVelocity(diffusionProbability, population.mediaConsumption),
      confidence: 0.7,
      explanation: breakdown.explanation
    };
  });

  const sorted = [...points].sort((a, b) => b.diffusionProbability - a.diffusionProbability);
  return {
    narrativeId: input.narrative.id,
    generatedAt: new Date().toISOString(),
    points,
    globalSummary: {
      highResonanceRegions: sorted.slice(0, 5).map((p) => p.regionId),
      lowResonanceRegions: sorted.slice(-5).map((p) => p.regionId),
      topDrivers: ["linguistic authenticity", "economic relevance", "historical resonance"]
    }
  };
}
