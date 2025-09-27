import { Router } from "express";
const r = Router();

r.post("/jobs", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "IngestJob" }));
r.get("/jobs/:id", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "IngestJob" }));

export default r;