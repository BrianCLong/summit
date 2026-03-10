import type { IntelGraphClient } from "../../graph/intelGraphClient";
import { buildExplainForStorm } from "../../graph/explainTraversal";

export function createExplainHandler(graph: IntelGraphClient) {
  return async function explainHandler(req: any, res: any) {
    const explainId = String(req.params.explainId ?? "");
    if (!explainId) return res.status(400).json({ error: "missing explainId" });

    // Convention: explain:storm:... or explain:stormId
    // We’ll accept either:
    const stormId = explainId.startsWith("explain:") ? explainId.replace("explain:", "") : explainId;

    const payload = await buildExplainForStorm({ stormId, graph });
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(payload);
  };
}
