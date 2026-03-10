import type { FeatureCollection, Polygon } from "geojson";
export interface CompatibilityBreakdown {
  populationId: string;
  narrativeId: string;
  valueAlignment: number;
  linguisticAuthenticity: number;
  historicalResonance: number;
  economicRelevance: number;
  mediaChannelFit: number;
  identityCongruence: number;
  finalScore: number;
  explanation: string[];
}

export interface DiffusionPoint {
  populationId: string;
  regionId: string;
  h3Cells: string[];
  compatibilityScore: number;
  diffusionProbability: number;
  estimatedVelocity: number;
  confidence: number;
  explanation: string[];
}

export interface DiffusionMap {
  narrativeId: string;
  generatedAt: string;
  points: DiffusionPoint[];
  globalSummary: {
    highResonanceRegions: string[];
    lowResonanceRegions: string[];
    topDrivers: string[];
  };
}

export type DiffusionGeoJson = FeatureCollection<Polygon>;

export interface LinguisticFingerprint {
  id: string;
  narrativeId: string;
  expectedLanguage: string;
  detectedLanguage: string;
  dialectFitScore: number;
  idiomFitScore: number;
  syntaxNaturalnessScore: number;
  translationArtifactScore: number;
  propagandaPhraseScore: number;
  anomalyScore: number;
  reasons: string[];
}
