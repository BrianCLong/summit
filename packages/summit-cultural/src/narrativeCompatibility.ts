import type {
  CompatibilityBreakdown,
  LinguisticFingerprint,
  NarrativeSignal,
  PopulationGroup
} from "./types.js";

export interface CompatibilityWeights {
  valueAlignment: number;
  linguisticAuthenticity: number;
  historicalResonance: number;
  economicRelevance: number;
  mediaChannelFit: number;
  identityCongruence: number;
}

export const DEFAULT_COMPATIBILITY_WEIGHTS: CompatibilityWeights = {
  valueAlignment: 0.22,
  linguisticAuthenticity: 0.2,
  historicalResonance: 0.16,
  economicRelevance: 0.15,
  mediaChannelFit: 0.12,
  identityCongruence: 0.15
};

function overlapScore(a: string[] = [], b: string[] = []): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a.map((v) => v.toLowerCase()));
  const sb = new Set(b.map((v) => v.toLowerCase()));
  let overlap = 0;
  for (const item of sa) {
    if (sb.has(item)) overlap += 1;
  }
  return overlap / Math.max(sa.size, sb.size, 1);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function scoreNarrativeCompatibility(args: {
  population: PopulationGroup;
  narrative: NarrativeSignal;
  fingerprint?: LinguisticFingerprint | null;
  weights?: Partial<CompatibilityWeights>;
}): CompatibilityBreakdown {
  const { population, narrative, fingerprint } = args;
  const weights = { ...DEFAULT_COMPATIBILITY_WEIGHTS, ...(args.weights ?? {}) };

  const valueAlignment = overlapScore(population.valueSignals, narrative.moralEmphasis);
  const historicalResonance = overlapScore(population.historicalMemories, narrative.historicalReferences);
  const identityCongruence = overlapScore(population.languages, narrative.identityAppeals);
  const mediaChannelFit = overlapScore(population.mediaConsumption, narrative.frameTags);

  const economicRelevance =
    narrative.themes.some((t) => t.toLowerCase().includes("econom")) && population.economicProfile ? 0.8 : 0.3;

  const linguisticAuthenticity = fingerprint
    ? clamp01(
        0.35 * fingerprint.dialectFitScore +
          0.25 * fingerprint.idiomFitScore +
          0.25 * fingerprint.syntaxNaturalnessScore +
          0.15 * (1 - fingerprint.translationArtifactScore)
      )
    : population.languages.includes(narrative.language)
      ? 0.65
      : 0.3;

  const finalScore = clamp01(
    valueAlignment * weights.valueAlignment +
      linguisticAuthenticity * weights.linguisticAuthenticity +
      historicalResonance * weights.historicalResonance +
      economicRelevance * weights.economicRelevance +
      mediaChannelFit * weights.mediaChannelFit +
      identityCongruence * weights.identityCongruence
  );

  const explanation: string[] = [];
  if (valueAlignment > 0.6) explanation.push("Strong value alignment");
  if (historicalResonance > 0.5) explanation.push("Historical memory resonance detected");
  if (linguisticAuthenticity < 0.4) explanation.push("Weak linguistic authenticity");
  if (economicRelevance > 0.6) explanation.push("Narrative maps to economic concerns");
  if (mediaChannelFit > 0.5) explanation.push("Likely fit for this population's media ecosystem");

  return {
    populationId: population.id,
    narrativeId: narrative.id,
    valueAlignment,
    linguisticAuthenticity,
    historicalResonance,
    economicRelevance,
    mediaChannelFit,
    identityCongruence,
    finalScore,
    explanation
  };
}
