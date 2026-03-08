import type { CogGeoDuckStore } from "../../storage/duckdb/coggeoDuckStore.js";
import { explainForCell } from "./explainFromDuckdb.js";

export function createExplainDuckHandler(store: CogGeoDuckStore) {
  return async function explainHandler(req: any, res: any) {
    const explainId = String(req.params.explainId ?? "");
    if (!explainId) return res.status(400).json({ error: "missing explainId" });

    const existing = await store.getExplain(explainId);
    if (existing) return res.status(200).json(existing);

    const payload = await explainForCell({ explainId, store });
    return res.status(200).json(payload);
  };
}
