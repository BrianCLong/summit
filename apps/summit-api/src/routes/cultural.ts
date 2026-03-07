import { Router } from "express";
import { buildCulturalRoutes, MemoryCulturalStore } from "@summit/summit-cultural";
import { loadValidatedFixtures } from "@summit/summit-cultural";

const store = new MemoryCulturalStore();
const routes = buildCulturalRoutes(store);

async function seed() {
  const { populations, narratives, fingerprints } = loadValidatedFixtures();
  for (const p of populations) await store.savePopulation(p);
  for (const n of narratives) await store.saveNarrative(n);
  for (const f of fingerprints) await store.saveFingerprint(f);
}

void seed();

export const culturalRouter = Router();

culturalRouter.get("/diffusion/:narrativeId", async (req, res) => {
  try {
    res.json(await routes.getDiffusionMap({ narrativeId: req.params.narrativeId }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

culturalRouter.get("/diffusion/:narrativeId/geojson", async (req, res) => {
  try {
    res.json(await routes.getDiffusionGeoJson({ narrativeId: req.params.narrativeId }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

culturalRouter.get("/compatibility", async (req, res) => {
  try {
    res.json(
      await routes.getCompatibility({
        populationId: String(req.query.populationId),
        narrativeId: String(req.query.narrativeId)
      })
    );
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

culturalRouter.get("/linguistic/:narrativeId", async (req, res) => {
  try {
    res.json(await routes.getLinguisticAnomaly({ narrativeId: req.params.narrativeId }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});
