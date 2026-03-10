import type {
  CulturalGraphSnapshot,
  LinguisticFingerprint,
  NarrativeSignal,
  PopulationGroup
} from "../types.js";

export interface CulturalStore {
  savePopulation(population: PopulationGroup): Promise<void>;
  saveNarrative(narrative: NarrativeSignal): Promise<void>;
  saveFingerprint(fingerprint: LinguisticFingerprint): Promise<void>;

  getPopulation(id: string): Promise<PopulationGroup | null>;
  getNarrative(id: string): Promise<NarrativeSignal | null>;
  getFingerprintByNarrativeId(narrativeId: string): Promise<LinguisticFingerprint | null>;

  listPopulations(): Promise<PopulationGroup[]>;
  snapshot(): Promise<CulturalGraphSnapshot>;
}
