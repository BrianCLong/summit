import type {
  CulturalGraphSnapshot,
  LinguisticFingerprint,
  NarrativeSignal,
  PopulationGroup,
  CivilizationGroup
} from "../types.js";

export interface CulturalStore {
  savePopulation(population: PopulationGroup): Promise<void>;
  saveNarrative(narrative: NarrativeSignal): Promise<void>;
  saveFingerprint(fingerprint: LinguisticFingerprint): Promise<void>;
  saveCivilization(civilization: CivilizationGroup): Promise<void>;

  getPopulation(id: string): Promise<PopulationGroup | null>;
  getNarrative(id: string): Promise<NarrativeSignal | null>;
  getFingerprintByNarrativeId(narrativeId: string): Promise<LinguisticFingerprint | null>;
  getCivilization(id: string): Promise<CivilizationGroup | null>;

  listPopulations(): Promise<PopulationGroup[]>;
  listCivilizations(): Promise<CivilizationGroup[]>;
  snapshot(): Promise<CulturalGraphSnapshot>;
}
