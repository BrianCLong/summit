import { Router } from "express";
const r = Router();

r.get("/claims", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "ProvClaims" }));

export default r;