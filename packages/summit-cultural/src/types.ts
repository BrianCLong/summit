export type NodeId = string;
export type ISODateString = string;
export type H3Cell = string;

export interface PopulationGroup {
  id: NodeId;
  name: string;
  regionId: string;
  h3Cells: H3Cell[];
  languages: string[];
  dialects?: string[];
  religions?: string[];
  ageBands?: Record<string, number>;
  educationDistribution?: Record<string, number>;
  economicProfile?: string;
  mediaConsumption?: string[];
  historicalMemories?: string[];
  valueSignals?: string[];
  trustProfiles?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface NarrativeSignal {
  id: NodeId;
  title: string;
  summary: string;
  themes: string[];
  frameTags: string[];
  language: string;
  dialectHints?: string[];
  moralEmphasis?: string[];
  identityAppeals?: string[];
  historicalReferences?: string[];
  sourceType?: "news" | "social" | "speech" | "blog" | "forum" | "other";
  observedAt: ISODateString;
  metadata?: Record<string, unknown>;
}

export interface LinguisticFingerprint {
  id: NodeId;
  narrativeId: NodeId;
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

export interface CompatibilityBreakdown {
  populationId: NodeId;
  narrativeId: NodeId;
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
  populationId: NodeId;
  regionId: string;
  h3Cells: H3Cell[];
  compatibilityScore: number;
  diffusionProbability: number;
  estimatedVelocity: number;
  confidence: number;
  explanation: string[];
}

export interface DiffusionMap {
  narrativeId: NodeId;
  generatedAt: ISODateString;
  points: DiffusionPoint[];
  globalSummary: {
    highResonanceRegions: string[];
    lowResonanceRegions: string[];
    topDrivers: string[];
  };
}

export interface CulturalGraphSnapshot {
  populations: PopulationGroup[];
  narratives: NarrativeSignal[];
  fingerprints: LinguisticFingerprint[];
}
