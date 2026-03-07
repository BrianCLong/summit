import type { LinguisticFingerprint } from "./types.js";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function computeLinguisticAnomaly(input: {
  id: string;
  narrativeId: string;
  expectedLanguage: string;
  detectedLanguage: string;
  dialectFitScore: number;
  idiomFitScore: number;
  syntaxNaturalnessScore: number;
  translationArtifactScore: number;
  propagandaPhraseScore: number;
}): LinguisticFingerprint {
  const anomalyScore = clamp01(
    (1 - input.dialectFitScore) * 0.2 +
      (1 - input.idiomFitScore) * 0.2 +
      (1 - input.syntaxNaturalnessScore) * 0.2 +
      input.translationArtifactScore * 0.2 +
      input.propagandaPhraseScore * 0.2
  );

  const reasons: string[] = [];
  if (input.detectedLanguage !== input.expectedLanguage) {
    reasons.push("Detected language differs from expected language");
  }
  if (input.translationArtifactScore > 0.6) {
    reasons.push("Translation artifact score is elevated");
  }
  if (input.propagandaPhraseScore > 0.6) {
    reasons.push("Propaganda phrase clustering detected");
  }
  if (input.dialectFitScore < 0.4) {
    reasons.push("Dialect fit is weak for the claimed audience");
  }

  return {
    ...input,
    anomalyScore,
    reasons
  };
}
