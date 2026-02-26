/**
 * INFOWAR REST API Router Stub.
 */

import { Router, Request, Response } from "express";
import { FEATURE_NARRATIVE_ECOSYSTEM } from "../../../config/flags";

export const INFOWAR_SITREP_VIEWED = "INFOWAR_SITREP_VIEWED";
export const INFOWAR_EVIDENCE_EXPORTED = "INFOWAR_EVIDENCE_EXPORTED";

/**
 * Handles GET /api/rest/infowar/sitrep/:id
 */
export async function handleGetSitrep(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: "Missing SITREP ID" });
    return;
  }

  // Log audit event
  console.log(`[Audit] Event: ${INFOWAR_SITREP_VIEWED}, payload: { id: "${id}" }`);

  // Mock response
  const response: any = {
    id,
    version: "1.0",
    item_slug: "INFOWAR",
    title: `SITREP ${id}`,
    date: new Date().toISOString(),
    sections: [],
    evidence_index: {
      version: "1.0",
      item_slug: "INFOWAR",
      entries: []
    }
  };

  if (FEATURE_NARRATIVE_ECOSYSTEM) {
    response.ecosystem_metrics = {
      narrative_id: id,
      total_claims: 0,
      unique_actors: 0,
      reach_score: 0
    };
  }

  res.status(200).json(response);
}

/**
 * Handles POST /api/rest/infowar/evidence/export
 */
export async function handleExportEvidence(req: Request, res: Response): Promise<void> {
  const { evidence_ids } = req.body;

  if (!evidence_ids || !Array.isArray(evidence_ids)) {
    res.status(400).json({ error: "Missing or invalid evidence_ids" });
    return;
  }

  // Log audit event
  console.log(`[Audit] Event: ${INFOWAR_EVIDENCE_EXPORTED}, payload: { count: ${evidence_ids.length} }`);

  res.status(200).json({
    status: "Export initiated",
    export_id: "EXPORT-" + Date.now(),
    evidence_ids
  });
}

/**
 * INFOWAR REST Router
 */
export const infowarRouter = Router();

infowarRouter.get("/sitrep/:id", handleGetSitrep);
infowarRouter.post("/evidence/export", handleExportEvidence);
