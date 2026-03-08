import type { CogGeoDuckStore } from "../storage/duckdb/coggeoDuckStore.js";

export function createNarrativesHandler(store: CogGeoDuckStore) {
  return async function narrativesHandler(_req: any, res: any) {
    const rows = await store.listNarratives();
    return res.status(200).json(rows);
  };
}

export function createStormsHandler(store: CogGeoDuckStore) {
  return async function stormsHandler(req: any, res: any) {
    const timeRange = String(req.query.timeRange ?? "24h");
    const narrativeId = req.query.narrativeId ? String(req.query.narrativeId) : undefined;

    const rows = await store.listStorms({ timeRange, narrativeId });
    return res.status(200).json(rows);
  };
}
