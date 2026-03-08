export interface PopulationGroup {
  id: string;
  region: string;
  languages: string[];
  religion?: string[];
  educationDistribution?: Record<string, number>;
  economicProfile?: string;
  historicalMemories?: string[];
  valueSignals?: string[];
  mediaConsumption: string[];
}

export interface Narrative {
  id: string;
  theme: string;
  targetLanguages: string[];
  frameValues: string[];
  historicalReferences?: string[];
  mediaVectors?: string[];
}

export interface LinguisticSignal {
  detectedPhrases: string[];
  register: 'formal' | 'informal' | 'activist' | 'bureaucratic' | 'mixed';
  sourceLanguage: string;
  suspectedTranslation?: boolean;
}

export interface CompatibilityBreakdown {
  valueAlignment: number;
  linguisticAuthenticity: number;
  historicalResonance: number;
  mediaDistributionFit: number;
}

export interface CompatibilityResult {
  score: number;
  breakdown: CompatibilityBreakdown;
}

export interface DiffusionResult {
  populationId: string;
  adoptionLikelihood: number;
  confidence: number;
}
