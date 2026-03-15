import type { CulturalStore } from "./CulturalStore.js";
import type {
  CulturalGraphSnapshot,
  LinguisticFingerprint,
  NarrativeSignal,
  PopulationGroup,
  CivilizationGroup
} from "../types.js";

export class MemoryCulturalStore implements CulturalStore {
  private populations = new Map<string, PopulationGroup>();
  private narratives = new Map<string, NarrativeSignal>();
  private fingerprints = new Map<string, LinguisticFingerprint>();
  private civilizations = new Map<string, CivilizationGroup>();

  async savePopulation(population: PopulationGroup): Promise<void> {
    this.populations.set(population.id, population);
  }

  async saveNarrative(narrative: NarrativeSignal): Promise<void> {
    this.narratives.set(narrative.id, narrative);
  }

  async saveFingerprint(fingerprint: LinguisticFingerprint): Promise<void> {
    this.fingerprints.set(fingerprint.narrativeId, fingerprint);
  }

  async saveCivilization(civilization: CivilizationGroup): Promise<void> {
    this.civilizations.set(civilization.id, civilization);
  }

  async getPopulation(id: string): Promise<PopulationGroup | null> {
    return this.populations.get(id) ?? null;
  }

  async getNarrative(id: string): Promise<NarrativeSignal | null> {
    return this.narratives.get(id) ?? null;
  }

  async getFingerprintByNarrativeId(narrativeId: string): Promise<LinguisticFingerprint | null> {
    return this.fingerprints.get(narrativeId) ?? null;
  }

  async getCivilization(id: string): Promise<CivilizationGroup | null> {
    return this.civilizations.get(id) ?? null;
  }

  async listPopulations(): Promise<PopulationGroup[]> {
    return [...this.populations.values()];
  }

  async listCivilizations(): Promise<CivilizationGroup[]> {
    return [...this.civilizations.values()];
  }

  async snapshot(): Promise<CulturalGraphSnapshot> {
    return {
      populations: [...this.populations.values()],
      narratives: [...this.narratives.values()],
      fingerprints: [...this.fingerprints.values()],
      civilizations: [...this.civilizations.values()]
    };
  }
}
