<<<<<<< HEAD
import type { CogGeoDuckStore } from "../../storage/duckdb/coggeoDuckStore.js";
import { explainForCell } from "./explainFromDuckdb.js";
=======
import type { CogGeoDuckStore } from "../../storage/duckdb/coggeoDuckStore";
import { explainForCell } from "./explainFromDuckdb";
>>>>>>> origin/main

export function createExplainDuckHandler(store: CogGeoDuckStore) {
  return async function explainHandler(req: any, res: any) {
    const explainId = String(req.params.explainId ?? "");
    if (!explainId) return res.status(400).json({ error: "missing explainId" });

<<<<<<< HEAD
    const existing = await store.getExplain(explainId);
    if (existing) return res.status(200).json(existing);

=======
    // 1) If stored explain exists, return it
    const existing = await store.getExplain(explainId);
    if (existing) return res.status(200).json(existing);

    // 2) Otherwise attempt cell explain: explain:cell:...
>>>>>>> origin/main
    const payload = await explainForCell({ explainId, store });
    return res.status(200).json(payload);
  };
}
