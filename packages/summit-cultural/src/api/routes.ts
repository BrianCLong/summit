import { buildDiffusionMap } from "../diffusionEngine.js";
import { diffusionPointsToGeoJson } from "../geo/h3ToGeoJson.js";
import { scoreNarrativeCompatibility } from "../narrativeCompatibility.js";
import type { CulturalStore } from "../storage/CulturalStore.js";

export function buildCulturalRoutes(store: CulturalStore) {
  return {
    async getSnapshot() {
      return store.snapshot();
    },
    async getCompatibility(params: { populationId: string; narrativeId: string }) {
      const population = await store.getPopulation(params.populationId);
      const narrative = await store.getNarrative(params.narrativeId);
      const fingerprint = await store.getFingerprintByNarrativeId(params.narrativeId);
      if (!population || !narrative) throw new Error("Population or narrative not found");
      return scoreNarrativeCompatibility({
        population,
        narrative,
        fingerprint
      });
    },
    async getDiffusionMap(params: { narrativeId: string }) {
      const narrative = await store.getNarrative(params.narrativeId);
      if (!narrative) throw new Error("Narrative not found");
      const populations = await store.listPopulations();
      const fingerprint = await store.getFingerprintByNarrativeId(params.narrativeId);

      return buildDiffusionMap({
        narrative,
        populations,
        fingerprintByPopulationId: Object.fromEntries(populations.map((p) => [p.id, fingerprint]))
      });
    },
    async getDiffusionGeoJson(params: { narrativeId: string }) {
      const map = await this.getDiffusionMap(params);
      return diffusionPointsToGeoJson(map.points);
    },
    async getLinguisticAnomaly(params: { narrativeId: string }) {
      const fp = await store.getFingerprintByNarrativeId(params.narrativeId);
      if (!fp) throw new Error("Fingerprint not found");
      return fp;
    }
  };
}
