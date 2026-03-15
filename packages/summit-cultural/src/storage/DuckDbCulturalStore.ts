import type { CulturalStore } from "./CulturalStore.js";
import type {
  CulturalGraphSnapshot,
  LinguisticFingerprint,
  NarrativeSignal,
  PopulationGroup,
  CivilizationGroup
} from "../types.js";

export class DuckDbCulturalStore implements CulturalStore {
  constructor(private readonly dbPath: string) {
    void this.dbPath;
  }

  async savePopulation(_population: PopulationGroup): Promise<void> {
    throw new Error("DuckDbCulturalStore.savePopulation not yet implemented");
  }
  async saveNarrative(_narrative: NarrativeSignal): Promise<void> {
    throw new Error("DuckDbCulturalStore.saveNarrative not yet implemented");
  }
  async saveFingerprint(_fingerprint: LinguisticFingerprint): Promise<void> {
    throw new Error("DuckDbCulturalStore.saveFingerprint not yet implemented");
  }
  async saveCivilization(_civilization: CivilizationGroup): Promise<void> {
    throw new Error("DuckDbCulturalStore.saveCivilization not yet implemented");
  }
  async getPopulation(_id: string): Promise<PopulationGroup | null> {
    throw new Error("DuckDbCulturalStore.getPopulation not yet implemented");
  }
  async getNarrative(_id: string): Promise<NarrativeSignal | null> {
    throw new Error("DuckDbCulturalStore.getNarrative not yet implemented");
  }
  async getFingerprintByNarrativeId(_narrativeId: string): Promise<LinguisticFingerprint | null> {
    throw new Error("DuckDbCulturalStore.getFingerprintByNarrativeId not yet implemented");
  }
  async getCivilization(_id: string): Promise<CivilizationGroup | null> {
    throw new Error("DuckDbCulturalStore.getCivilization not yet implemented");
  }
  async listPopulations(): Promise<PopulationGroup[]> {
    throw new Error("DuckDbCulturalStore.listPopulations not yet implemented");
  }
  async listCivilizations(): Promise<CivilizationGroup[]> {
    throw new Error("DuckDbCulturalStore.listCivilizations not yet implemented");
  }
  async snapshot(): Promise<CulturalGraphSnapshot> {
    throw new Error("DuckDbCulturalStore.snapshot not yet implemented");
  }
}
