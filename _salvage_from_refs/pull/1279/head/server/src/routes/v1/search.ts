import { Router } from "express";
const r = Router();

r.post("/", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "SearchResult" }));

export default r;