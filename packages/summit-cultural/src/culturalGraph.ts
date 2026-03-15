import type {
  CulturalGraphSnapshot,
  LinguisticFingerprint,
  NarrativeSignal,
  PopulationGroup,
  CivilizationGroup
} from "./types.js";

export interface CulturalGraph {
  upsertPopulation(population: PopulationGroup): Promise<void>;
  upsertNarrative(narrative: NarrativeSignal): Promise<void>;
  upsertFingerprint(fingerprint: LinguisticFingerprint): Promise<void>;
  upsertCivilization(civilization: CivilizationGroup): Promise<void>;
  getPopulation(id: string): Promise<PopulationGroup | null>;
  getNarrative(id: string): Promise<NarrativeSignal | null>;
  getFingerprintByNarrativeId(narrativeId: string): Promise<LinguisticFingerprint | null>;
  getCivilization(id: string): Promise<CivilizationGroup | null>;
  listPopulations(): Promise<PopulationGroup[]>;
  listNarratives(): Promise<NarrativeSignal[]>;
  listCivilizations(): Promise<CivilizationGroup[]>;
  snapshot(): Promise<CulturalGraphSnapshot>;
}

export function buildInMemoryCulturalGraph(): CulturalGraph {
  const populations = new Map<string, PopulationGroup>();
  const narratives = new Map<string, NarrativeSignal>();
  const fingerprints = new Map<string, LinguisticFingerprint>();
  const civilizations = new Map<string, CivilizationGroup>();

  return {
    async upsertPopulation(population) {
      populations.set(population.id, population);
    },
    async upsertNarrative(narrative) {
      narratives.set(narrative.id, narrative);
    },
    async upsertFingerprint(fingerprint) {
      fingerprints.set(fingerprint.narrativeId, fingerprint);
    },
    async upsertCivilization(civilization) {
      civilizations.set(civilization.id, civilization);
    },
    async getPopulation(id) {
      return populations.get(id) ?? null;
    },
    async getNarrative(id) {
      return narratives.get(id) ?? null;
    },
    async getFingerprintByNarrativeId(narrativeId) {
      return fingerprints.get(narrativeId) ?? null;
    },
    async getCivilization(id) {
      return civilizations.get(id) ?? null;
    },
    async listPopulations() {
      return [...populations.values()];
    },
    async listNarratives() {
      return [...narratives.values()];
    },
    async listCivilizations() {
      return [...civilizations.values()];
    },
    async snapshot() {
      return {
        populations: [...populations.values()],
        narratives: [...narratives.values()],
        fingerprints: [...fingerprints.values()],
        civilizations: [...civilizations.values()]
      };
    }
  };
}
